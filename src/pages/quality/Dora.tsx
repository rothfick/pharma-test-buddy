import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export default function Dora() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data: rows } = await supabase
        .from("dora_metrics")
        .select("*")
        .gte("metric_date", since)
        .order("metric_date", { ascending: true });
      setData((rows ?? []).map((r: any) => ({
        date: r.metric_date.slice(5),
        deployments: r.deployment_count,
        leadTime: r.lead_time_minutes,
        cfr: Number(r.change_failure_rate),
        mttr: r.mttr_minutes,
      })));
    })();
  }, []);

  const charts = [
    { title: "Deployment Frequency", key: "deployments", color: "hsl(var(--primary))", elite: "Multiple per day" },
    { title: "Lead Time for Changes (min)", key: "leadTime", color: "hsl(var(--accent))", elite: "< 1 day = elite" },
    { title: "Change Failure Rate (%)", key: "cfr", color: "hsl(var(--destructive))", elite: "0–15% = elite" },
    { title: "MTTR (min)", key: "mttr", color: "hsl(var(--primary))", elite: "< 1 hour = elite" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="dora-page">
      {charts.map((c) => (
        <Card key={c.key}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {c.title}
              <span className="text-xs font-normal text-muted-foreground">{c.elite}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {data.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data — seed demo data on Overview.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
