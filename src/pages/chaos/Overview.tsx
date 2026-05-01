import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Gauge, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Stats {
  totalExperiments: number;
  passedExperiments: number;
  totalPerfRuns: number;
  avgP95: number;
  activeSlos: number;
}

export default function ChaosOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [exp, perf, slos] = await Promise.all([
        supabase.from("chaos_experiments").select("status"),
        supabase.from("perf_runs").select("p95_ms").order("created_at", { ascending: false }).limit(20),
        supabase.from("slo_definitions").select("id").eq("is_active", true),
      ]);
      const expData = exp.data ?? [];
      const perfData = perf.data ?? [];
      setStats({
        totalExperiments: expData.length,
        passedExperiments: expData.filter((e: any) => e.status === "passed").length,
        totalPerfRuns: perfData.length,
        avgP95:
          perfData.length > 0
            ? Math.round(perfData.reduce((s: number, r: any) => s + (r.p95_ms ?? 0), 0) / perfData.length)
            : 0,
        activeSlos: (slos.data ?? []).length,
      });
    })();
  }, []);

  return (
    <div className="space-y-6" data-testid="chaos-overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Zap}
          label="Chaos experiments"
          value={stats?.totalExperiments ?? 0}
          sub={`${stats?.passedExperiments ?? 0} passed`}
          testid="stat-experiments"
        />
        <StatCard
          icon={Gauge}
          label="Perf runs (recent)"
          value={stats?.totalPerfRuns ?? 0}
          sub="last 20 results"
          testid="stat-perf"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg p95 latency"
          value={`${stats?.avgP95 ?? 0}ms`}
          sub="across recent runs"
          testid="stat-p95"
        />
        <StatCard
          icon={Target}
          label="Active SLOs"
          value={stats?.activeSlos ?? 0}
          sub="being tracked"
          testid="stat-slos"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={Zap}
          title="Chaos Experiments"
          desc="Inject latency, errors and resource pressure. Validate hypotheses with blast-radius safeguards and automatic abort conditions."
          to="/chaos/experiments"
          features={[
            "5 experiment types",
            "Configurable blast radius",
            "Auto-abort on threshold",
            "Hypothesis-driven",
          ]}
          testid="card-experiments"
        />
        <FeatureCard
          icon={Gauge}
          title="Performance Lab"
          desc="k6-style load testing with 5 profiles: smoke, load, stress, spike, soak. Live p50/p95/p99 metrics with histogram charts."
          to="/chaos/perf"
          features={[
            "Concurrent virtual users",
            "5 load profiles",
            "p50/p95/p99 percentiles",
            "Histogram + trend charts",
          ]}
          testid="card-perf"
        />
        <FeatureCard
          icon={Target}
          title="Service Level Objectives"
          desc="Track availability, latency and error budget against SLO targets. Google SRE-aligned."
          to="/chaos/slo"
          features={[
            "Availability tracking",
            "Latency targets (p95/p99)",
            "Error budget burn rate",
            "30-day rolling window",
          ]}
          testid="card-slo"
        />
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Principles of Chaos Engineering
          </CardTitle>
          <CardDescription>Based on principlesofchaos.org</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">1</Badge>
              <span>Build a hypothesis around steady-state behavior — define what "normal" looks like.</span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">2</Badge>
              <span>Vary real-world events — network failures, latency spikes, traffic surges.</span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">3</Badge>
              <span>Run experiments in production (or production-like) — synthetic loads miss real behavior.</span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">4</Badge>
              <span>Automate experiments to run continuously — chaos as a regression test.</span>
            </li>
            <li className="flex gap-2">
              <Badge variant="outline" className="shrink-0">5</Badge>
              <span>Minimize blast radius — start small, fail safe, abort early.</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  testid,
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
  sub: string;
  testid: string;
}) {
  return (
    <Card data-testid={testid}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground/70">{sub}</div>
      </CardContent>
    </Card>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  to,
  features,
  testid,
}: {
  icon: typeof Zap;
  title: string;
  desc: string;
  to: string;
  features: string[];
  testid: string;
}) {
  return (
    <Card data-testid={testid}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{desc}</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        <Button asChild size="sm" variant="outline">
          <Link to={to}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
