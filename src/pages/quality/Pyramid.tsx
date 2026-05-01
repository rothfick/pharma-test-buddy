import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";

const HEALTH = {
  unit: { min: 70, color: "hsl(var(--primary))" },
  integration: { min: 20, color: "hsl(var(--accent))" },
  e2e: { min: 5, color: "hsl(var(--destructive))" },
} as const;

export default function Pyramid() {
  const [data, setData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ unit: 0, integration: 0, e2e: 0 });

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: rows } = await supabase
        .from("test_runs")
        .select("run_type,total,passed,failed,duration_ms")
        .gte("created_at", since);

      const agg: Record<string, { total: number; passed: number; failed: number; duration: number }> = {};
      (rows ?? []).forEach((r: any) => {
        const k = r.run_type;
        if (!agg[k]) agg[k] = { total: 0, passed: 0, failed: 0, duration: 0 };
        agg[k].total += r.total;
        agg[k].passed += r.passed;
        agg[k].failed += r.failed;
        agg[k].duration += r.duration_ms;
      });

      const t = { unit: agg.unit?.total ?? 0, integration: agg.integration?.total ?? 0, e2e: agg.e2e?.total ?? 0 };
      const sum = t.unit + t.integration + t.e2e || 1;
      setTotals(t);
      setData([
        { layer: "E2E", count: t.e2e, pct: +((t.e2e / sum) * 100).toFixed(1), color: HEALTH.e2e.color, ideal: "< 10%" },
        { layer: "Integration", count: t.integration, pct: +((t.integration / sum) * 100).toFixed(1), color: HEALTH.integration.color, ideal: "~ 20%" },
        { layer: "Unit", count: t.unit, pct: +((t.unit / sum) * 100).toFixed(1), color: HEALTH.unit.color, ideal: "≥ 70%" },
      ]);
    })();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="pyramid-page">
      <Card>
        <CardHeader><CardTitle>Test Pyramid Distribution (7d)</CardTitle></CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="layer" type="category" stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pyramid Health</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.map((d) => (
            <div key={d.layer} className="rounded-md border border-border p-3" data-testid={`pyramid-${d.layer.toLowerCase()}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{d.layer}</span>
                <span className="text-sm text-muted-foreground">{d.count.toLocaleString()} tests · {d.pct}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full" style={{ width: `${d.pct}%`, background: d.color }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Ideal: {d.ideal}</p>
            </div>
          ))}
          <p className="pt-2 text-xs text-muted-foreground">
            Pyramid = many fast unit tests at the base, fewer integration tests, very few slow E2E at the top.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
