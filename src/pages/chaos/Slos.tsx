import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, CheckCircle2, AlertTriangle } from "lucide-react";

interface Slo {
  id: string;
  name: string;
  description: string | null;
  service: string;
  metric: string;
  target_value: number;
  comparator: string;
  window_days: number;
  is_active: boolean;
}

interface SloStatus {
  slo: Slo;
  current: number;
  passing: boolean;
  budget_remaining: number;
  samples: number;
}

export default function Slos() {
  const [statuses, setStatuses] = useState<SloStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: slos } = await supabase.from("slo_definitions").select("*").eq("is_active", true);
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: runs } = await supabase
        .from("perf_runs")
        .select("p95_ms, p99_ms, error_rate, total_requests, failed_requests")
        .gte("created_at", since.toISOString());

      const allRuns = runs ?? [];
      const totalReqs = allRuns.reduce((s, r) => s + (r.total_requests ?? 0), 0);
      const totalFails = allRuns.reduce((s, r) => s + (r.failed_requests ?? 0), 0);
      const availability = totalReqs > 0 ? ((totalReqs - totalFails) / totalReqs) * 100 : 100;
      const avgErrorRate = totalReqs > 0 ? (totalFails / totalReqs) * 100 : 0;
      const avgP95 = allRuns.length > 0 ? allRuns.reduce((s, r) => s + (r.p95_ms ?? 0), 0) / allRuns.length : 0;
      const avgP99 = allRuns.length > 0 ? allRuns.reduce((s, r) => s + (r.p99_ms ?? 0), 0) / allRuns.length : 0;

      const result: SloStatus[] = (slos ?? []).map((slo: Slo) => {
        let current = 0;
        if (slo.metric === "availability") current = availability;
        else if (slo.metric === "latency_p95") current = avgP95;
        else if (slo.metric === "latency_p99") current = avgP99;
        else if (slo.metric === "error_rate") current = avgErrorRate;

        const passing = slo.comparator === "gte" ? current >= slo.target_value : current <= slo.target_value;
        // Error budget: how much "room" left vs target
        const budget_remaining =
          slo.comparator === "gte"
            ? Math.max(0, ((current - slo.target_value) / slo.target_value) * 100)
            : Math.max(0, ((slo.target_value - current) / slo.target_value) * 100);

        return { slo, current, passing, budget_remaining, samples: allRuns.length };
      });

      setStatuses(result);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6" data-testid="slos-page">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Service Level Objectives
          </CardTitle>
          <CardDescription>
            Tracked over a 30-day rolling window from {statuses[0]?.samples ?? 0} performance runs.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {statuses.map((s) => (
          <Card key={s.slo.id} data-testid={`slo-${s.slo.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {s.passing ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                    {s.slo.name}
                  </CardTitle>
                  {s.slo.description && (
                    <CardDescription className="text-xs">{s.slo.description}</CardDescription>
                  )}
                </div>
                <Badge variant={s.passing ? "default" : "destructive"}>{s.passing ? "Healthy" : "Breach"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-3xl font-bold">{formatValue(s.slo.metric, s.current)}</div>
                  <div className="text-xs text-muted-foreground">
                    target: {s.slo.comparator === "gte" ? "≥" : "≤"} {formatValue(s.slo.metric, s.slo.target_value)}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Error budget remaining</span>
                  <span className="font-mono">{s.budget_remaining.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(100, s.budget_remaining)} className={s.passing ? "" : "[&>div]:bg-destructive"} />
              </div>
              <div className="text-xs text-muted-foreground">
                Window: {s.slo.window_days} days · Service: {s.slo.service} · Metric: <code className="text-xs">{s.slo.metric}</code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {statuses[0]?.samples === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No performance runs recorded yet. Run a few load tests in the Performance Lab to populate SLO metrics.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatValue(metric: string, value: number): string {
  if (metric === "availability") return `${value.toFixed(2)}%`;
  if (metric === "error_rate") return `${value.toFixed(2)}%`;
  if (metric.startsWith("latency")) return `${Math.round(value)}ms`;
  return value.toFixed(2);
}
