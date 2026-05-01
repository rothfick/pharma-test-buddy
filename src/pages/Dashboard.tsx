import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListTodo, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  todo: "hsl(var(--muted-foreground))",
  in_progress: "hsl(var(--primary))",
  review: "hsl(var(--warning))",
  done: "hsl(var(--success))",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "hsl(var(--muted-foreground))",
  medium: "hsl(var(--primary))",
  high: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, byStatus: {}, byPriority: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("tasks").select("status,priority");
      if (data) {
        const byStatus: Record<string, number> = {};
        const byPriority: Record<string, number> = {};
        data.forEach((t) => {
          byStatus[t.status] = (byStatus[t.status] || 0) + 1;
          byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
        });
        setStats({ total: data.length, byStatus, byPriority });
      }
      setLoading(false);
    };
    load();
  }, []);

  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.byPriority).map(([name, value]) => ({ name, value }));

  const kpis = [
    { label: "Total tasks", value: stats.total, icon: ListTodo, testid: "kpi-total" },
    { label: "In progress", value: stats.byStatus.in_progress || 0, icon: Clock, testid: "kpi-in-progress" },
    { label: "Done", value: stats.byStatus.done || 0, icon: CheckCircle2, testid: "kpi-done" },
    { label: "Critical", value: stats.byPriority.critical || 0, icon: AlertTriangle, testid: "kpi-critical" },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quality Metrics</h1>
        <p className="text-muted-foreground">Overview of tasks and team activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="kpi-grid">
        {kpis.map((kpi) => (
          <Card key={kpi.label} data-testid={kpi.testid}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid={`${kpi.testid}-value`}>
                {loading ? "—" : kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="chart-status">
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
            <CardDescription>Distribution across workflow stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((d) => (
                    <Cell key={d.name} fill={STATUS_COLORS[d.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="chart-priority">
          <CardHeader>
            <CardTitle>Tasks by priority</CardTitle>
            <CardDescription>Where the team is focusing</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {priorityData.map((d) => (
                    <Cell key={d.name} fill={PRIORITY_COLORS[d.name]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>QA hooks</CardTitle>
          <CardDescription>Stable selectors available on this page</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {["dashboard-page", "kpi-total", "kpi-in-progress", "kpi-done", "kpi-critical", "chart-status", "chart-priority"].map((t) => (
            <Badge key={t} variant="secondary" className="font-mono text-xs">data-testid="{t}"</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
