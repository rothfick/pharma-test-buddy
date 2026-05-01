import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  DollarSign,
  GitBranch,
  Sparkles,
  Zap,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface CommandCenterData {
  loading: boolean;
  totalRuns: number;
  passRate: number;
  flakyOpen: number;
  coverage: number;
  llmCostToday: number;
  llmCalls: number;
  agentRuns: number;
  chaosRunning: number;
  perfP95: number;
  doraDeploys: number;
  doraCfr: number;
  recentRuns: Array<{ id: string; suite_name: string; status: string; total: number; passed: number; failed: number; duration_ms: number; created_at: string }>;
  recentAgents: Array<{ id: string; goal: string; status: string; total_cost_usd: number; created_at: string }>;
  runsTrend: Array<{ day: string; passed: number; failed: number }>;
  costTrend: Array<{ day: string; cost: number }>;
}

const initial: CommandCenterData = {
  loading: true,
  totalRuns: 0,
  passRate: 0,
  flakyOpen: 0,
  coverage: 0,
  llmCostToday: 0,
  llmCalls: 0,
  agentRuns: 0,
  chaosRunning: 0,
  perfP95: 0,
  doraDeploys: 0,
  doraCfr: 0,
  recentRuns: [],
  recentAgents: [],
  runsTrend: [],
  costTrend: [],
};

const fmtUsd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const dayKey = (iso: string) => iso.slice(0, 10);

export default function Dashboard() {
  const [d, setD] = useState<CommandCenterData>(initial);

  useEffect(() => {
    const load = async () => {
      const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const sinceToday = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").toISOString();

      const [
        runs,
        coverage,
        flaky,
        llmToday,
        agents,
        chaos,
        perf,
        dora,
      ] = await Promise.all([
        supabase
          .from("test_runs")
          .select("id,suite_name,status,total,passed,failed,duration_ms,created_at")
          .gte("created_at", since7)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("coverage_snapshots")
          .select("line_coverage,created_at")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase.from("flaky_tests").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("llm_traces")
          .select("cost_usd,created_at")
          .gte("created_at", since7),
        supabase
          .from("agent_runs")
          .select("id,goal,status,total_cost_usd,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("chaos_experiments")
          .select("id", { count: "exact", head: true })
          .eq("status", "running"),
        supabase
          .from("perf_runs")
          .select("p95_ms,created_at")
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("dora_metrics")
          .select("deployment_count,change_failure_rate,metric_date")
          .gte("metric_date", since7.slice(0, 10)),
      ]);

      const runsRows = runs.data ?? [];
      const totalRuns = runsRows.length;
      const sumPassed = runsRows.reduce((a, r) => a + (r.passed ?? 0), 0);
      const sumTotal = runsRows.reduce((a, r) => a + (r.total ?? 0), 0);
      const passRate = sumTotal > 0 ? sumPassed / sumTotal : 0;

      const trendMap = new Map<string, { passed: number; failed: number }>();
      runsRows.forEach((r) => {
        const k = dayKey(r.created_at);
        const cur = trendMap.get(k) ?? { passed: 0, failed: 0 };
        cur.passed += r.passed ?? 0;
        cur.failed += r.failed ?? 0;
        trendMap.set(k, cur);
      });
      const runsTrend = Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => ({ day: day.slice(5), ...v }));

      const llmRows = llmToday.data ?? [];
      const costMap = new Map<string, number>();
      let costToday = 0;
      llmRows.forEach((t) => {
        const k = dayKey(t.created_at);
        costMap.set(k, (costMap.get(k) ?? 0) + Number(t.cost_usd ?? 0));
        if (t.created_at >= sinceToday) costToday += Number(t.cost_usd ?? 0);
      });
      const costTrend = Array.from(costMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, cost]) => ({ day: day.slice(5), cost: Number(cost.toFixed(4)) }));

      const doraRows = dora.data ?? [];
      const doraDeploys = doraRows.reduce((a, r) => a + (r.deployment_count ?? 0), 0);
      const doraCfr = doraRows.length
        ? doraRows.reduce((a, r) => a + Number(r.change_failure_rate ?? 0), 0) / doraRows.length
        : 0;

      setD({
        loading: false,
        totalRuns,
        passRate,
        flakyOpen: flaky.count ?? 0,
        coverage: Number(coverage.data?.[0]?.line_coverage ?? 0),
        llmCostToday: costToday,
        llmCalls: llmRows.length,
        agentRuns: (agents.data ?? []).length,
        chaosRunning: chaos.count ?? 0,
        perfP95: perf.data?.[0]?.p95_ms ?? 0,
        doraDeploys,
        doraCfr,
        recentRuns: runsRows.slice(0, 6),
        recentAgents: agents.data ?? [],
        runsTrend,
        costTrend,
      });
    };
    load();
  }, []);

  const kpis = [
    {
      label: "Test runs (7d)",
      value: d.totalRuns,
      sub: `${fmtPct(d.passRate)} pass rate`,
      icon: Activity,
      to: "/quality-metrics",
      testid: "kpi-runs",
    },
    {
      label: "Coverage",
      value: d.coverage ? `${d.coverage.toFixed(1)}%` : "—",
      sub: "latest snapshot",
      icon: BarChart3,
      to: "/quality-metrics/coverage",
      testid: "kpi-coverage",
    },
    {
      label: "Flaky open",
      value: d.flakyOpen,
      sub: "needs triage",
      icon: AlertTriangle,
      to: "/quality-metrics/flaky",
      testid: "kpi-flaky",
    },
    {
      label: "LLM spend today",
      value: fmtUsd(d.llmCostToday),
      sub: `${d.llmCalls} calls (7d)`,
      icon: DollarSign,
      to: "/ai/cost-tracker",
      testid: "kpi-llm-cost",
    },
    {
      label: "Agent runs",
      value: d.agentRuns,
      sub: "recent",
      icon: Bot,
      to: "/ai/agents",
      testid: "kpi-agents",
    },
    {
      label: "Chaos running",
      value: d.chaosRunning,
      sub: "experiments live",
      icon: Zap,
      to: "/chaos/experiments",
      testid: "kpi-chaos",
    },
    {
      label: "Perf p95",
      value: d.perfP95 ? `${d.perfP95}ms` : "—",
      sub: "last run",
      icon: Activity,
      to: "/chaos/perf",
      testid: "kpi-perf",
    },
    {
      label: "DORA deploys (7d)",
      value: d.doraDeploys,
      sub: `CFR ${fmtPct(d.doraCfr)}`,
      icon: GitBranch,
      to: "/quality-metrics/dora",
      testid: "kpi-dora",
    },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QA Command Center</h1>
          <p className="text-muted-foreground">Live signals from tests, AI, chaos and compliance.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/playwright-starter" data-testid="cta-starter">
              <Sparkles className="mr-2 h-4 w-4" /> Run starter suite
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/quality-metrics" data-testid="cta-quality">
              <ShieldCheck className="mr-2 h-4 w-4" /> Quality metrics
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="kpi-grid">
        {kpis.map((kpi) => (
          <Link key={kpi.label} to={kpi.to} className="block">
            <Card className="transition-colors hover:border-primary/40" data-testid={kpi.testid}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`${kpi.testid}-value`}>
                  {d.loading ? "—" : kpi.value}
                </div>
                <p className="text-xs text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="chart-runs">
          <CardHeader>
            <CardTitle>Test runs (7 days)</CardTitle>
            <CardDescription>Passed vs failed per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.runsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="passed" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" stackId="a" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-cost">
          <CardHeader>
            <CardTitle>LLM spend (7 days)</CardTitle>
            <CardDescription>Total cost per day across features</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={d.costTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Area type="monotone" dataKey="cost" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="recent-runs">
          <CardHeader>
            <CardTitle>Recent test runs</CardTitle>
            <CardDescription>Latest entries from <code className="text-xs">test_runs</code></CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!d.loading && d.recentRuns.length === 0 && (
              <p className="text-sm text-muted-foreground">No runs yet. Trigger a starter suite to populate.</p>
            )}
            {d.recentRuns.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  {r.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="font-medium">{r.suite_name}</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {r.passed}/{r.total}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{(r.duration_ms / 1000).toFixed(1)}s</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="recent-agents">
          <CardHeader>
            <CardTitle>Recent AI agent runs</CardTitle>
            <CardDescription>Latest entries from <code className="text-xs">agent_runs</code></CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!d.loading && d.recentAgents.length === 0 && (
              <p className="text-sm text-muted-foreground">No agent runs yet.</p>
            )}
            {d.recentAgents.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Bot className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{a.goal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.status === "completed" ? "secondary" : "outline"} className="text-xs">
                    {a.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{fmtUsd(Number(a.total_cost_usd))}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
