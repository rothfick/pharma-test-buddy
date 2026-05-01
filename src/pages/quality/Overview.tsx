import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, GitBranch, AlertTriangle, BarChart3, Sparkles } from "lucide-react";

interface Stats {
  deployments7d: number;
  avgLeadTime: number;
  avgCfr: number;
  avgMttr: number;
  totalRuns: number;
  passRate: number;
  flakyOpen: number;
  latestCoverage: number;
}

export default function QualityOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const [doraRes, runsRes, flakyRes, covRes] = await Promise.all([
      supabase.from("dora_metrics").select("*").gte("metric_date", since),
      supabase.from("test_runs").select("total,passed,failed").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from("flaky_tests").select("id").eq("status", "open"),
      supabase.from("coverage_snapshots").select("line_coverage").order("created_at", { ascending: false }).limit(1),
    ]);

    const dora = doraRes.data ?? [];
    const runs = runsRes.data ?? [];
    const totalRuns = runs.reduce((s, r) => s + (r.total ?? 0), 0);
    const totalPassed = runs.reduce((s, r) => s + (r.passed ?? 0), 0);

    setStats({
      deployments7d: dora.reduce((s, d) => s + (d.deployment_count ?? 0), 0),
      avgLeadTime: dora.length ? Math.round(dora.reduce((s, d) => s + (d.lead_time_minutes ?? 0), 0) / dora.length) : 0,
      avgCfr: dora.length ? +(dora.reduce((s, d) => s + Number(d.change_failure_rate ?? 0), 0) / dora.length).toFixed(1) : 0,
      avgMttr: dora.length ? Math.round(dora.reduce((s, d) => s + (d.mttr_minutes ?? 0), 0) / dora.length) : 0,
      totalRuns,
      passRate: totalRuns ? +((totalPassed / totalRuns) * 100).toFixed(1) : 0,
      flakyOpen: flakyRes.data?.length ?? 0,
      latestCoverage: Number(covRes.data?.[0]?.line_coverage ?? 0),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const today = new Date();
      // 14 days of DORA
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
        await supabase.functions.invoke("metrics-ingest", {
          body: {
            type: "dora",
            metric_date: d,
            deployment_count: 2 + Math.floor(Math.random() * 6),
            lead_time_minutes: 60 + Math.floor(Math.random() * 240),
            change_failure_rate: +(5 + Math.random() * 10).toFixed(2),
            mttr_minutes: 30 + Math.floor(Math.random() * 90),
          },
        });
      }
      // Test runs
      const types = ["unit", "integration", "e2e"] as const;
      for (const t of types) {
        const total = t === "unit" ? 1200 : t === "integration" ? 250 : 80;
        const failed = Math.floor(Math.random() * 5);
        await supabase.functions.invoke("metrics-ingest", {
          body: {
            type: "test_run", run_type: t, suite_name: `${t}-suite`,
            branch: "main", commit_sha: "demo" + Math.random().toString(36).slice(2, 8),
            ci_provider: "github-actions",
            total, passed: total - failed, failed, skipped: 0, flaky: t === "e2e" ? 2 : 0,
            duration_ms: t === "unit" ? 45000 : t === "integration" ? 180000 : 540000,
            status: failed === 0 ? "success" : "failed",
          },
        });
      }
      // Flaky
      await supabase.functions.invoke("metrics-ingest", { body: { type: "flaky", test_name: "should login via SSO", suite_name: "auth-e2e", root_cause: "race condition on redirect" } });
      await supabase.functions.invoke("metrics-ingest", { body: { type: "flaky", test_name: "uploads large file", suite_name: "files-e2e", root_cause: "network timeout" } });
      // Coverage
      await supabase.functions.invoke("metrics-ingest", {
        body: { type: "coverage", branch: "main", commit_sha: "demo",
          line_coverage: 82.3, branch_coverage: 74.1, statement_coverage: 81.9, function_coverage: 86.4,
          total_lines: 12500, covered_lines: 10288 },
      });
      toast.success("Demo data seeded");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Seed failed");
    } finally {
      setSeeding(false);
    }
  };

  const cards = [
    { label: "Deployments (7d)", value: stats?.deployments7d ?? "—", icon: GitBranch, hint: "DORA: Deployment Frequency" },
    { label: "Avg Lead Time", value: stats ? `${stats.avgLeadTime}m` : "—", icon: Activity, hint: "Code commit → production" },
    { label: "Change Failure Rate", value: stats ? `${stats.avgCfr}%` : "—", icon: AlertTriangle, hint: "DORA: % failed deployments" },
    { label: "MTTR", value: stats ? `${stats.avgMttr}m` : "—", icon: Activity, hint: "Mean Time To Restore" },
    { label: "Test Pass Rate (7d)", value: stats ? `${stats.passRate}%` : "—", icon: BarChart3, hint: `${stats?.totalRuns ?? 0} tests` },
    { label: "Flaky (open)", value: stats?.flakyOpen ?? "—", icon: AlertTriangle, hint: "Top quality risk" },
    { label: "Line Coverage", value: stats ? `${stats.latestCoverage}%` : "—", icon: Activity, hint: "Latest snapshot" },
  ];

  return (
    <div className="space-y-6" data-testid="qm-overview-page">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Aggregated last 7 days</p>
        <Button variant="outline" size="sm" onClick={seedDemo} disabled={seeding} data-testid="qm-seed-demo">
          <Sparkles className="mr-2 h-4 w-4" />
          {seeding ? "Seeding…" : "Seed demo data"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} data-testid={`kpi-${c.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                {c.label}
                <c.icon className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "…" : c.value}</div>
              <p className="text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to ingest from CI/CD</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">POST to <code>/functions/v1/metrics-ingest</code> with bearer token. Discriminated by <code>type</code>.</p>
          <div className="flex flex-wrap gap-2">
            {["dora", "test_run", "flaky", "coverage"].map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{`curl -X POST $URL/functions/v1/metrics-ingest \\
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \\
  -d '{"type":"dora","metric_date":"2026-05-01","deployment_count":4,"lead_time_minutes":120,"change_failure_rate":7.5,"mttr_minutes":45}'`}</code></pre>
        </CardContent>
      </Card>
    </div>
  );
}
