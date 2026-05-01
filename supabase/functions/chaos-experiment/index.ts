// Chaos experiment runner — controlled fault injection with safeguards
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  experiment_id: z.string().uuid(),
});

interface Sample {
  ts: number;
  latency_ms: number;
  status: number;
  ok: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: exp, error: fetchErr } = await supabase
      .from("chaos_experiments")
      .select("*")
      .eq("id", parsed.data.experiment_id)
      .maybeSingle();

    if (fetchErr || !exp) {
      return new Response(JSON.stringify({ error: "experiment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startedAt = Date.now();
    await supabase
      .from("chaos_experiments")
      .update({ status: "running", started_at: new Date(startedAt).toISOString() })
      .eq("id", exp.id);

    const params = (exp.parameters ?? {}) as Record<string, any>;
    const projectId = (Deno.env.get("SUPABASE_URL") ?? "").replace("https://", "").split(".")[0];
    const targetUrl = `https://${projectId}.supabase.co/functions/v1/perf-target`;

    // Map experiment type → perf-target params
    const expParams = new URLSearchParams();
    switch (exp.experiment_type) {
      case "latency":
        expParams.set("delay", String(params.delay_ms ?? 1000));
        break;
      case "error_injection":
        expParams.set("error_rate", String(params.error_rate ?? 0.5));
        break;
      case "slow_query":
        expParams.set("delay", String(params.delay_ms ?? 3000));
        break;
      case "random_failure":
        expParams.set("error_rate", String(params.error_rate ?? 0.3));
        expParams.set("delay", String(params.delay_ms ?? 200));
        break;
      case "memory_pressure":
        expParams.set("payload_size", String(params.payload_size ?? 32768));
        break;
    }

    // Blast radius → request count
    const requestCount = exp.blast_radius === "large" ? 50 : exp.blast_radius === "medium" ? 25 : 10;
    const samples: Sample[] = [];
    let aborted = false;
    let abortReason = "";

    // Parse abort condition (simple: "error_rate > 50%")
    const abortThreshold = parseAbortCondition(exp.abort_condition ?? "");

    for (let i = 0; i < requestCount; i++) {
      const t0 = Date.now();
      try {
        const resp = await fetch(`${targetUrl}?${expParams.toString()}`, {
          headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        });
        samples.push({ ts: t0, latency_ms: Date.now() - t0, status: resp.status, ok: resp.ok });
      } catch (e) {
        samples.push({ ts: t0, latency_ms: Date.now() - t0, status: 0, ok: false });
      }

      // Check abort condition every 5 samples
      if (abortThreshold !== null && i >= 4 && i % 5 === 0) {
        const failures = samples.filter((s) => !s.ok).length;
        const errorRate = (failures / samples.length) * 100;
        if (errorRate > abortThreshold) {
          aborted = true;
          abortReason = `Error rate ${errorRate.toFixed(1)}% exceeded threshold ${abortThreshold}%`;
          break;
        }
      }
    }

    const finishedAt = Date.now();
    const durationMs = finishedAt - startedAt;
    const failures = samples.filter((s) => !s.ok).length;
    const errorRate = samples.length > 0 ? (failures / samples.length) * 100 : 0;
    const latencies = samples.map((s) => s.latency_ms).sort((a, b) => a - b);
    const p = (q: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * q))] ?? 0;

    const observations = {
      total_requests: samples.length,
      successful: samples.length - failures,
      failed: failures,
      error_rate: errorRate,
      p50_ms: p(0.5),
      p95_ms: p(0.95),
      p99_ms: p(0.99),
      max_ms: latencies[latencies.length - 1] ?? 0,
      samples: samples.slice(0, 200), // cap for storage
    };

    const status = aborted ? "aborted" : errorRate < 10 ? "passed" : "failed";
    const conclusion = aborted
      ? `Experiment aborted: ${abortReason}. System safeguards working as expected.`
      : errorRate < 10
      ? `Hypothesis validated: system tolerated ${exp.experiment_type} with ${errorRate.toFixed(1)}% error rate.`
      : `Hypothesis rejected: ${errorRate.toFixed(1)}% error rate exceeded acceptable threshold.`;

    await supabase
      .from("chaos_experiments")
      .update({
        status,
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: durationMs,
        observations,
        conclusion,
      })
      .eq("id", exp.id);

    return new Response(JSON.stringify({ ok: true, status, observations, conclusion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseAbortCondition(s: string): number | null {
  // Matches "error_rate > 50%" or "error_rate > 50"
  const match = s.match(/error_rate\s*>\s*(\d+(?:\.\d+)?)/i);
  return match ? parseFloat(match[1]) : null;
}
