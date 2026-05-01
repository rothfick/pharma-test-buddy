// Eval runner: pobiera prompt z registry, iteruje po datasecie, scoruje przez LLM-judge.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRICING: Record<string, { in: number; out: number }> = {
  "google/gemini-3-flash-preview": { in: 0.15, out: 0.6 },
  "google/gemini-2.5-flash": { in: 0.3, out: 1.2 },
  "google/gemini-2.5-pro": { in: 1.25, out: 10 },
};

async function callLLM(apiKey: string, model: string, system: string, user: string) {
  const t0 = Date.now();
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const auth = req.headers.get("Authorization");
  let userId: string | null = null;
  if (auth?.startsWith("Bearer ")) {
    const { data } = await admin.auth.getUser(auth.slice(7));
    userId = data.user?.id ?? null;
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: "auth required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    prompt_id?: string; prompt_content?: string; prompt_name?: string;
    model: string; dataset_name: string;
    cases: Array<{ input: string; expected: string }>;
  };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.cases?.length || !body.model) {
    return new Response(JSON.stringify({ error: "cases + model required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve system prompt
  let system = body.prompt_content ?? "";
  if (body.prompt_id && !system) {
    const { data: p } = await admin.from("prompt_registry").select("content").eq("id", body.prompt_id).maybeSingle();
    system = p?.content ?? "";
  }
  if (!system) {
    return new Response(JSON.stringify({ error: "prompt_content or prompt_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pricing = PRICING[body.model] ?? { in: 0.5, out: 2 };
  const judgeModel = "google/gemini-3-flash-preview";
  const judgePrice = PRICING[judgeModel];

  const results: any[] = [];
  let passed = 0, totalCost = 0, totalLat = 0;

  for (const c of body.cases) {
    try {
      const out = await callLLM(apiKey!, body.model, system, c.input);
      const cost = ((out.tokensIn * pricing.in) + (out.tokensOut * pricing.out)) / 1_000_000;
      totalCost += cost;
      totalLat += out.ms;

      // LLM judge
      const judge = await callLLM(
        apiKey!, judgeModel,
        "You are a strict grading assistant. Compare the model output to the expected answer. Output JSON: {\"pass\": true|false, \"reason\": \"...\"}. Pass if semantic meaning matches; minor wording differences ok.",
        `Expected:\n${c.expected}\n\nActual:\n${out.text}`,
      );
      const judgeCost = ((judge.tokensIn * judgePrice.in) + (judge.tokensOut * judgePrice.out)) / 1_000_000;
      totalCost += judgeCost;

      let pass = false; let reason = "";
      try {
        const m = judge.text.match(/\{[\s\S]*\}/);
        if (m) { const j = JSON.parse(m[0]); pass = !!j.pass; reason = j.reason ?? ""; }
      } catch { /* default fail */ }
      if (pass) passed++;

      results.push({
        input: c.input, expected: c.expected, actual: out.text,
        pass, reason, tokens: out.tokensIn + out.tokensOut, latency_ms: out.ms,
      });

      await admin.from("llm_traces").insert({
        user_id: userId, feature: "eval", model: body.model,
        prompt_tokens: out.tokensIn, completion_tokens: out.tokensOut,
        cost_usd: +cost.toFixed(6), latency_ms: out.ms, status: "success",
        request_preview: c.input.slice(0, 200), response_preview: out.text.slice(0, 500),
        metadata: { dataset: body.dataset_name, prompt_id: body.prompt_id ?? null, pass },
      });
    } catch (e) {
      results.push({ input: c.input, expected: c.expected, actual: null, pass: false, reason: String(e) });
    }
  }

  const score = body.cases.length ? passed / body.cases.length : 0;
  const avgLat = body.cases.length ? Math.round(totalLat / body.cases.length) : 0;

  const { data: evalRow } = await admin.from("prompt_evals").insert({
    prompt_id: body.prompt_id ?? null, dataset_name: body.dataset_name, model: body.model,
    score, total_cases: body.cases.length, passed_cases: passed,
    avg_latency_ms: avgLat, total_cost_usd: +totalCost.toFixed(6),
    details: { results, prompt_name: body.prompt_name },
  }).select().single();

  return new Response(JSON.stringify({
    eval_id: evalRow?.id, score, passed, total: body.cases.length,
    avg_latency_ms: avgLat, total_cost_usd: +totalCost.toFixed(6), results,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
