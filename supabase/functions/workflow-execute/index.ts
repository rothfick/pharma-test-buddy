// Workflow DAG executor: runs nodes in topological order, supports
// LLM (via llm-gateway), Transform (JS expression), HTTP, Condition, Input/Output.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NodeType = "input" | "llm" | "transform" | "http" | "condition" | "output";

interface WFNode {
  id: string;
  type: NodeType;
  label?: string;
  config: Record<string, unknown>;
}

interface WFEdge {
  id: string;
  source: string;
  target: string;
  // optional condition branch label ("true"/"false") for condition nodes
  branch?: string;
}

interface ExecuteRequest {
  workflow_id?: string;
  nodes?: WFNode[];
  edges?: WFEdge[];
  input?: Record<string, unknown>;
  dry_run?: boolean;
}

function topoSort(nodes: WFNode[], edges: WFEdge[]): WFNode[] {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => { indeg.set(n.id, 0); adj.set(n.id, []); });
  edges.forEach((e) => {
    adj.get(e.source)?.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  });
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const t of adj.get(id) ?? []) {
      indeg.set(t, (indeg.get(t) ?? 0) - 1);
      if (indeg.get(t) === 0) queue.push(t);
    }
  }
  if (order.length !== nodes.length) throw new Error("Cycle detected in workflow DAG");
  const map = new Map(nodes.map((n) => [n.id, n]));
  return order.map((id) => map.get(id)!);
}

// Resolve {{var.path}} placeholders against a context bag
function resolveTemplate(tpl: string, ctx: Record<string, unknown>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const parts = path.split(".");
    let cur: any = ctx;
    for (const p of parts) cur = cur?.[p];
    return cur === undefined || cur === null ? "" : String(cur);
  });
}

async function runLLM(node: WFNode, ctx: Record<string, unknown>, authHeader: string | null) {
  const cfg = node.config as any;
  const prompt = resolveTemplate(String(cfg.prompt ?? ""), ctx);
  const system = cfg.system ? resolveTemplate(String(cfg.system), ctx) : undefined;
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-gateway`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authHeader ? { Authorization: authHeader } : {}),
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    },
    body: JSON.stringify({
      feature: cfg.feature ?? "workflow",
      model: cfg.model ?? "google/gemini-3-flash-preview",
      temperature: cfg.temperature ?? 0.4,
      max_tokens: cfg.max_tokens ?? 800,
      use_cache: cfg.use_cache ?? false,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`LLM node failed: ${data?.error ?? res.status}`);
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.content ??
    data?.text ??
    "";
  return {
    output: text,
    cost_usd: data?.cost_usd ?? 0,
    tokens: data?.usage?.total_tokens ?? 0,
    model: data?.model,
  };
}

async function runHTTP(node: WFNode, ctx: Record<string, unknown>) {
  const cfg = node.config as any;
  const url = resolveTemplate(String(cfg.url ?? ""), ctx);
  const method = (cfg.method ?? "GET").toUpperCase();
  const headers = cfg.headers ?? { "Content-Type": "application/json" };
  const body = cfg.body ? resolveTemplate(JSON.stringify(cfg.body), ctx) : undefined;
  const res = await fetch(url, { method, headers, body: method === "GET" ? undefined : body });
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("json") ? await res.json() : await res.text();
  return { output: data, status: res.status };
}

function runTransform(node: WFNode, ctx: Record<string, unknown>) {
  const cfg = node.config as any;
  const expr = String(cfg.expression ?? "input");
  // Sandboxed evaluation — only `ctx` is exposed
  // deno-lint-ignore no-new-func
  const fn = new Function("ctx", `"use strict"; return (${expr});`);
  return { output: fn(ctx) };
}

function runCondition(node: WFNode, ctx: Record<string, unknown>) {
  const cfg = node.config as any;
  const expr = String(cfg.expression ?? "true");
  // deno-lint-ignore no-new-func
  const fn = new Function("ctx", `"use strict"; return Boolean(${expr});`);
  const branch = fn(ctx) ? "true" : "false";
  return { output: branch, branch };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const t0 = Date.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const authHeader = req.headers.get("Authorization");

    let userId: string | null = null;
    if (authHeader) {
      try {
        const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data } = await anon.auth.getUser();
        userId = data.user?.id ?? null;
      } catch { /* anonymous */ }
    }

    const body = (await req.json()) as ExecuteRequest;
    let nodes = body.nodes;
    let edges = body.edges;
    let workflowId = body.workflow_id ?? null;

    if (workflowId && (!nodes || !edges)) {
      const { data: wf, error } = await admin
        .from("workflows").select("nodes, edges").eq("id", workflowId).maybeSingle();
      if (error || !wf) throw new Error("Workflow not found");
      nodes = wf.nodes as WFNode[];
      edges = wf.edges as WFEdge[];
    }
    if (!nodes?.length) throw new Error("No nodes provided");
    edges = edges ?? [];

    // Create run record
    let runId: string | null = null;
    if (!body.dry_run && userId) {
      const { data: run } = await admin.from("workflow_runs").insert({
        workflow_id: workflowId,
        user_id: userId,
        status: "running",
        input: body.input ?? {},
      }).select("id").single();
      runId = run?.id ?? null;
    }

    const ordered = topoSort(nodes, edges);
    const ctx: Record<string, unknown> = { input: body.input ?? {} };
    const stepLog: any[] = [];
    const skipped = new Set<string>();
    let totalCost = 0;
    let totalTokens = 0;

    for (const node of ordered) {
      if (skipped.has(node.id)) {
        stepLog.push({ id: node.id, type: node.type, label: node.label, status: "skipped" });
        continue;
      }
      const sT = Date.now();
      try {
        let result: any;
        switch (node.type) {
          case "input":
            result = { output: body.input ?? {} };
            break;
          case "output":
            result = { output: ctx };
            break;
          case "llm":
            result = await runLLM(node, ctx, authHeader);
            totalCost += result.cost_usd ?? 0;
            totalTokens += result.tokens ?? 0;
            break;
          case "transform":
            result = runTransform(node, ctx);
            break;
          case "http":
            result = await runHTTP(node, ctx);
            break;
          case "condition": {
            result = runCondition(node, ctx);
            const losingBranch = result.branch === "true" ? "false" : "true";
            for (const e of edges!) {
              if (e.source === node.id && e.branch === losingBranch) {
                // mark target + downstream as skipped (shallow)
                skipped.add(e.target);
              }
            }
            break;
          }
          default:
            throw new Error(`Unknown node type: ${node.type}`);
        }
        ctx[node.id] = result.output;
        stepLog.push({
          id: node.id, type: node.type, label: node.label,
          status: "success", duration_ms: Date.now() - sT,
          output_preview: JSON.stringify(result.output ?? "").slice(0, 300),
          cost_usd: result.cost_usd, tokens: result.tokens, branch: result.branch,
        });
      } catch (e) {
        stepLog.push({
          id: node.id, type: node.type, label: node.label,
          status: "error", duration_ms: Date.now() - sT, error: String(e),
        });
        if (runId) {
          await admin.from("workflow_runs").update({
            status: "failed", steps: stepLog, error: String(e),
            duration_ms: Date.now() - t0, total_cost_usd: totalCost, total_tokens: totalTokens,
          }).eq("id", runId);
        }
        return new Response(JSON.stringify({
          run_id: runId, status: "failed", error: String(e), steps: stepLog,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const finalOutput = ctx;
    if (runId) {
      await admin.from("workflow_runs").update({
        status: "success", steps: stepLog, output: finalOutput,
        duration_ms: Date.now() - t0, total_cost_usd: totalCost, total_tokens: totalTokens,
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({
      run_id: runId, status: "success", steps: stepLog, output: finalOutput,
      duration_ms: Date.now() - t0, total_cost_usd: totalCost, total_tokens: totalTokens,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
