// Multi-agent orchestration: Planner → Executor → Verifier
// Każdy krok zapisuje się do agent_steps, UI subskrybuje przez Realtime.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICING: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash-lite": { in: 0.1, out: 0.4 },
  "google/gemini-3-flash-preview": { in: 0.15, out: 0.6 },
  "google/gemini-2.5-flash": { in: 0.3, out: 1.2 },
  "google/gemini-2.5-pro": { in: 1.25, out: 10 },
};
const cost = (m: string, pi: number, po: number) => {
  const p = PRICING[m] ?? { in: 0.5, out: 2 };
  return +(((pi * p.in) + (po * p.out)) / 1_000_000).toFixed(6);
};

interface AgentReq { goal: string; model?: string; }

async function callLLM(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number; ms: number }> {
  const t0 = Date.now();
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM ${res.status}: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  return {
    text: j.choices?.[0]?.message?.content ?? "",
    tokensIn: j.usage?.prompt_tokens ?? 0,
    tokensOut: j.usage?.completion_tokens ?? 0,
    ms: Date.now() - t0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Identify user
  let userId: string | null = null;
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(auth.slice(7));
    userId = data.user?.id ?? null;
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: "auth required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: AgentReq;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.goal || body.goal.length < 3) {
    return new Response(JSON.stringify({ error: "goal required (min 3 chars)" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const model = body.model || "google/gemini-3-flash-preview";

  // Create run
  const { data: run, error: runErr } = await admin
    .from("agent_runs")
    .insert({ user_id: userId, goal: body.goal, status: "running" })
    .select()
    .single();
  if (runErr || !run) {
    return new Response(JSON.stringify({ error: runErr?.message || "run create failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const runId = run.id;
  const t0 = Date.now();
  let totalTokens = 0;
  let totalCost = 0;
  let stepIdx = 0;

  // Run loop async, return runId immediately so UI can subscribe
  (async () => {
    try {
      // 1. PLANNER
      const plannerSys =
        "You are a Planner agent. Given a user goal, output a numbered plan of 3-5 concrete steps. Be terse. No prose, just the list.";
      const planner = await callLLM(apiKey, model, plannerSys, body.goal);
      totalTokens += planner.tokensIn + planner.tokensOut;
      totalCost += cost(model, planner.tokensIn, planner.tokensOut);
      await admin.from("agent_steps").insert({
        run_id: runId, step_index: stepIdx++, agent_role: "planner",
        input: { goal: body.goal }, output: { plan: planner.text },
        reasoning: "Decomposed goal into actionable steps.",
        tokens: planner.tokensIn + planner.tokensOut, duration_ms: planner.ms,
        tool_name: null,
      });

      // 2. EXECUTOR
      const execSys =
        "You are an Executor agent. Given a plan, simulate execution and produce a draft result. Be concrete. Output the deliverable directly.";
      const execUser = `Goal: ${body.goal}\n\nPlan:\n${planner.text}\n\nProduce the result.`;
      const exec = await callLLM(apiKey, model, execSys, execUser);
      totalTokens += exec.tokensIn + exec.tokensOut;
      totalCost += cost(model, exec.tokensIn, exec.tokensOut);
      await admin.from("agent_steps").insert({
        run_id: runId, step_index: stepIdx++, agent_role: "executor",
        input: { plan: planner.text }, output: { draft: exec.text },
        reasoning: "Executed plan steps and produced draft.",
        tokens: exec.tokensIn + exec.tokensOut, duration_ms: exec.ms,
        tool_name: "draft_writer",
      });

      // 3. VERIFIER
      const verSys =
        "You are a Verifier agent. Critique the draft against the goal. Output JSON: {\"verdict\":\"PASS|FAIL\",\"score\":0-10,\"issues\":[...],\"final\":\"polished output\"}.";
      const verUser = `Goal: ${body.goal}\n\nDraft:\n${exec.text}`;
      const ver = await callLLM(apiKey, model, verSys, verUser);
      totalTokens += ver.tokensIn + ver.tokensOut;
      totalCost += cost(model, ver.tokensIn, ver.tokensOut);

      let verdict = "PASS";
      let final = ver.text;
      try {
        const m = ver.text.match(/\{[\s\S]*\}/);
        if (m) {
          const parsed = JSON.parse(m[0]);
          verdict = parsed.verdict ?? "PASS";
          final = parsed.final ?? ver.text;
        }
      } catch { /* keep raw */ }

      await admin.from("agent_steps").insert({
        run_id: runId, step_index: stepIdx++, agent_role: "verifier",
        input: { draft: exec.text }, output: { verdict, final, raw: ver.text },
        reasoning: "Critiqued draft and polished final answer.",
        tokens: ver.tokensIn + ver.tokensOut, duration_ms: ver.ms,
        tool_name: "critic",
      });

      await admin.from("agent_runs").update({
        status: "done",
        result: { verdict, final },
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
        duration_ms: Date.now() - t0,
        updated_at: new Date().toISOString(),
      }).eq("id", runId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin.from("agent_runs").update({
        status: "error", error: msg,
        total_tokens: totalTokens, total_cost_usd: totalCost,
        duration_ms: Date.now() - t0,
        updated_at: new Date().toISOString(),
      }).eq("id", runId);
    }
  })();

  return new Response(JSON.stringify({ run_id: runId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
