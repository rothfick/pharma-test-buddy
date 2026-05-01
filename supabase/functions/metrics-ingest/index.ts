import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DoraSchema = z.object({
  type: z.literal("dora"),
  metric_date: z.string(),
  environment: z.string().default("production"),
  service: z.string().default("main"),
  deployment_count: z.number().int().min(0),
  lead_time_minutes: z.number().int().min(0),
  change_failure_rate: z.number().min(0).max(100),
  mttr_minutes: z.number().int().min(0),
  metadata: z.record(z.any()).optional(),
});

const TestRunSchema = z.object({
  type: z.literal("test_run"),
  run_type: z.enum(["unit", "integration", "e2e", "perf", "a11y"]),
  suite_name: z.string(),
  branch: z.string().optional(),
  commit_sha: z.string().optional(),
  ci_provider: z.string().optional(),
  pipeline_url: z.string().optional(),
  total: z.number().int().min(0),
  passed: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0).default(0),
  flaky: z.number().int().min(0).default(0),
  duration_ms: z.number().int().min(0),
  status: z.enum(["success", "failed", "cancelled"]).default("success"),
  metadata: z.record(z.any()).optional(),
});

const FlakySchema = z.object({
  type: z.literal("flaky"),
  test_name: z.string(),
  suite_name: z.string(),
  root_cause: z.string().optional(),
  owner: z.string().optional(),
});

const CoverageSchema = z.object({
  type: z.literal("coverage"),
  commit_sha: z.string().optional(),
  branch: z.string().optional(),
  line_coverage: z.number().min(0).max(100),
  branch_coverage: z.number().min(0).max(100),
  statement_coverage: z.number().min(0).max(100),
  function_coverage: z.number().min(0).max(100),
  total_lines: z.number().int().min(0).default(0),
  covered_lines: z.number().int().min(0).default(0),
});

const Body = z.discriminatedUnion("type", [DoraSchema, TestRunSchema, FlakySchema, CoverageSchema]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Public demo ingest endpoint — uses service role to bypass RLS so the
    // dashboard seed flow on /quality-metrics works for anonymous visitors.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const b = parsed.data;

    if (b.type === "dora") {
      const { error } = await supabase.from("dora_metrics").upsert({
        metric_date: b.metric_date,
        environment: b.environment,
        service: b.service,
        deployment_count: b.deployment_count,
        lead_time_minutes: b.lead_time_minutes,
        change_failure_rate: b.change_failure_rate,
        mttr_minutes: b.mttr_minutes,
        metadata: b.metadata ?? {},
      }, { onConflict: "metric_date,environment,service" });
      if (error) throw error;
    } else if (b.type === "test_run") {
      const { type: _t, ...row } = b;
      const { error } = await supabase.from("test_runs").insert({ ...row, metadata: b.metadata ?? {} });
      if (error) throw error;
    } else if (b.type === "flaky") {
      // Increment failure count if exists, else insert
      const { data: existing } = await supabase
        .from("flaky_tests")
        .select("id, failure_count, total_runs")
        .eq("test_name", b.test_name)
        .eq("suite_name", b.suite_name)
        .maybeSingle();
      if (existing) {
        await supabase.from("flaky_tests").update({
          failure_count: existing.failure_count + 1,
          total_runs: existing.total_runs + 1,
          last_failed_at: new Date().toISOString(),
          ...(b.root_cause ? { root_cause: b.root_cause } : {}),
          ...(b.owner ? { owner: b.owner } : {}),
        }).eq("id", existing.id);
      } else {
        await supabase.from("flaky_tests").insert({
          test_name: b.test_name,
          suite_name: b.suite_name,
          root_cause: b.root_cause ?? null,
          owner: b.owner ?? null,
        });
      }
    } else if (b.type === "coverage") {
      const { type: _t, ...row } = b;
      const { error } = await supabase.from("coverage_snapshots").insert(row);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
