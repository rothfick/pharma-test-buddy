// Universal LLM gateway: trace logging, cost calculation, semantic cache,
// fallback chain, streaming + non-streaming, structured output via tools.
// All AI calls in the app go through this function for full observability.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// USD per 1M tokens (rough public estimates for cost dashboard)
const PRICING: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash-lite": { in: 0.1, out: 0.4 },
  "google/gemini-3-flash-preview": { in: 0.15, out: 0.6 },
  "google/gemini-2.5-flash": { in: 0.3, out: 1.2 },
  "google/gemini-2.5-pro": { in: 1.25, out: 10 },
  "google/gemini-3.1-pro-preview": { in: 1.5, out: 12 },
  "openai/gpt-5-nano": { in: 0.1, out: 0.4 },
  "openai/gpt-5-mini": { in: 0.4, out: 1.6 },
  "openai/gpt-5": { in: 5, out: 15 },
  "openai/gpt-5.2": { in: 6, out: 18 },
};

function calcCost(model: string, pIn: number, pOut: number): number {
  const p = PRICING[model] ?? { in: 0.5, out: 2 };
  return +(((pIn * p.in) + (pOut * p.out)) / 1_000_000).toFixed(6);
}

interface GatewayRequest {
  feature: string;
  messages: Array<{ role: string; content: unknown }>;
  model?: string;
  fallbacks?: string[];
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  temperature?: number;
  max_tokens?: number;
  use_cache?: boolean;
  cache_threshold?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Identify user from JWT (best-effort; we still allow anonymous for demo)
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    try {
      const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabaseAuth.auth.getUser();
      userId = data.user?.id ?? null;
    } catch (_) { /* ignore */ }
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: GatewayRequest;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    feature, messages,
    model = "google/gemini-3-flash-preview",
    fallbacks = [],
    stream = false,
    tools, tool_choice,
    temperature, max_tokens,
    use_cache = false,
  } = body;

  if (!feature || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "feature + messages required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---------- Budget guard ----------
  try {
    const { data: budget } = await admin
      .from("feature_budgets")
      .select("daily_limit_usd, enabled")
      .eq("feature", feature)
      .maybeSingle();

    if (budget && budget.enabled) {
      const { data: spendData } = await admin
        .rpc("feature_spend_today", { _feature: feature });
      const spendToday = Number(spendData ?? 0);
      if (spendToday >= Number(budget.daily_limit_usd)) {
        await admin.from("llm_traces").insert({
          user_id: userId, feature, model,
          status: "error", error: "budget_exceeded",
          latency_ms: Date.now() - t0,
        });
        return new Response(JSON.stringify({
          error: "budget_exceeded",
          message: `Daily budget for "${feature}" exhausted ($${spendToday.toFixed(4)} / $${Number(budget.daily_limit_usd).toFixed(2)}). Try again tomorrow or raise the limit.`,
          spend_today: spendToday,
          daily_limit: Number(budget.daily_limit_usd),
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  } catch (e) { console.error("budget guard failed", e); }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const cacheKey = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";

  if (use_cache && !stream && !tools && cacheKey) {
    try {
      const { data: cached } = await admin
        .from("semantic_cache")
        .select("id, response")
        .eq("feature", feature)
        .eq("prompt_text", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (cached) {
        await admin.from("semantic_cache").update({ hit_count: 1 })
          .eq("id", cached.id);
        await admin.from("llm_traces").insert({
          user_id: userId, feature, model, cache_hit: true,
          latency_ms: Date.now() - t0,
          response_preview: cached.response.slice(0, 500),
          request_preview: cacheKey.slice(0, 500),
        });
        return new Response(JSON.stringify({
          choices: [{ message: { role: "assistant", content: cached.response } }],
          cached: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } catch (e) { console.error("cache lookup failed", e); }
  }

  // ---------- Try model + fallbacks ----------
  const tryChain = [model, ...fallbacks];
  let lastError = "";

  for (const currentModel of tryChain) {
    try {
      const payload: Record<string, unknown> = {
        model: currentModel, messages, stream,
      };
      if (tools) payload.tools = tools;
      if (tool_choice) payload.tool_choice = tool_choice;
      if (temperature != null) payload.temperature = temperature;
      if (max_tokens != null) payload.max_tokens = max_tokens;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        lastError = `${currentModel}: ${resp.status} ${errText.slice(0, 200)}`;
        if (resp.status === 429 || resp.status === 402) {
          await admin.from("llm_traces").insert({
            user_id: userId, feature, model: currentModel,
            status: "error", error: `${resp.status}`,
            latency_ms: Date.now() - t0,
          });
          return new Response(JSON.stringify({
            error: resp.status === 429
              ? "Rate limit exceeded — try again in a moment."
              : "AI credits exhausted — add funds in workspace settings.",
          }), {
            status: resp.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue; // try next fallback
      }

      // ---------- Streaming path ----------
      if (stream && resp.body) {
        const [forClient, forLog] = resp.body.tee();
        // Background log of streamed tokens
        (async () => {
          let pIn = 0, pOut = 0, full = "";
          const reader = forLog.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const j = JSON.parse(data);
                const delta = j.choices?.[0]?.delta?.content;
                if (typeof delta === "string") full += delta;
                if (j.usage) {
                  pIn = j.usage.prompt_tokens ?? pIn;
                  pOut = j.usage.completion_tokens ?? pOut;
                }
              } catch (_) { /* partial */ }
            }
          }
          const cost = calcCost(currentModel, pIn, pOut);
          await admin.from("llm_traces").insert({
            user_id: userId, feature, model: currentModel,
            prompt_tokens: pIn, completion_tokens: pOut,
            cost_usd: cost, latency_ms: Date.now() - t0,
            request_preview: cacheKey.slice(0, 500),
            response_preview: full.slice(0, 500),
            metadata: { streamed: true },
          });
        })().catch((e) => console.error("stream log failed", e));

        return new Response(forClient, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // ---------- Non-streaming path ----------
      const json = await resp.json();
      const pIn = json.usage?.prompt_tokens ?? 0;
      const pOut = json.usage?.completion_tokens ?? 0;
      const cost = calcCost(currentModel, pIn, pOut);
      const respText = json.choices?.[0]?.message?.content
        ?? JSON.stringify(json.choices?.[0]?.message?.tool_calls ?? "");

      await admin.from("llm_traces").insert({
        user_id: userId, feature, model: currentModel,
        prompt_tokens: pIn, completion_tokens: pOut,
        cost_usd: cost, latency_ms: Date.now() - t0,
        request_preview: cacheKey.slice(0, 500),
        response_preview: typeof respText === "string" ? respText.slice(0, 500) : "",
        metadata: { used_fallback: currentModel !== model },
      });

      // Cache write (only plain text, no tools)
      if (use_cache && !tools && cacheKey && typeof respText === "string") {
        await admin.from("semantic_cache").insert({
          feature, model: currentModel,
          prompt_text: cacheKey, response: respText,
        }).then(() => {}, (e) => console.error("cache write", e));
      }

      return new Response(JSON.stringify(json), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      lastError = `${currentModel}: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
  }

  await admin.from("llm_traces").insert({
    user_id: userId, feature, model,
    status: "error", error: lastError,
    latency_ms: Date.now() - t0,
  });
  return new Response(JSON.stringify({ error: lastError || "All models failed" }), {
    status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
