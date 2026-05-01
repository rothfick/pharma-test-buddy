import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export default function Coverage() {
  const [data, setData] = useState<any[]>([]);
  const [latest, setLatest] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("coverage_snapshots")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);
      const mapped = (rows ?? []).map((r: any) => ({
        date: new Date(r.created_at).toLocaleDateString(),
        line: Number(r.line_coverage),
        branch: Number(r.branch_coverage),
        statement: Number(r.statement_coverage),
        function: Number(r.function_coverage),
      }));
      setData(mapped);
      setLatest(rows?.[rows.length - 1] ?? null);
    })();
  }, []);

  const kpis = latest ? [
    { label: "Line", value: Number(latest.line_coverage) },
    { label: "Branch", value: Number(latest.branch_coverage) },
    { label: "Statement", value: Number(latest.statement_coverage) },
    { label: "Function", value: Number(latest.function_coverage) },
  ] : [];

  return (
    <div className="space-y-4" data-testid="coverage-page">
      <div className="grid gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{k.label} coverage</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}%</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${k.value}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Coverage trend</CardTitle></CardHeader>
        <CardContent className="h-72">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No coverage snapshots yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Area type="monotone" dataKey="line" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                <Area type="monotone" dataKey="branch" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
