import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DollarSign, Zap, Database, AlertTriangle, RefreshCw } from "lucide-react";

type Trace = {
  id: string;
  feature: string;
  model: string;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  status: string;
  total_tokens: number | null;
  request_preview: string | null;
  created_at: string;
};

type Budget = {
  id: string;
  feature: string;
  daily_limit_usd: number;
  enabled: boolean;
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 220 70% 50%))",
  "hsl(var(--chart-3, 160 60% 45%))",
  "hsl(var(--chart-4, 30 80% 55%))",
  "hsl(var(--chart-5, 280 65% 60%))",
  "hsl(var(--destructive))",
];

export default function CostTracker() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [tRes, bRes] = await Promise.all([
      supabase
        .from("llm_traces")
        .select("id, feature, model, cost_usd, latency_ms, cache_hit, status, total_tokens, request_preview, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("feature_budgets").select("*").order("feature"),
    ]);
    if (tRes.error) toast.error("Nie udało się załadować śladów LLM");
    if (bRes.error) toast.error("Nie udało się załadować budżetów");
    setTraces((tRes.data ?? []) as Trace[]);
    setBudgets((bRes.data ?? []) as Budget[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const inLast = (ms: number) =>
      traces.filter((t) => now - new Date(t.created_at).getTime() <= ms);
    const today = inLast(day);
    const sevenD = inLast(7 * day);
    const sum = (arr: Trace[]) => arr.reduce((s, t) => s + Number(t.cost_usd || 0), 0);
    const cacheRate = traces.length
      ? (traces.filter((t) => t.cache_hit).length / traces.length) * 100
      : 0;
    const errors = traces.filter((t) => t.status === "error").length;
    return {
      today: sum(today),
      sevenD: sum(sevenD),
      thirtyD: sum(traces),
      avgCost: traces.length ? sum(traces) / traces.length : 0,
      avgLatency: traces.length
        ? traces.reduce((s, t) => s + (t.latency_ms || 0), 0) / traces.length
        : 0,
      cacheRate,
      totalRequests: traces.length,
      errors,
    };
  }, [traces]);

  // ---------- Charts data ----------
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of traces) {
      const d = new Date(t.created_at).toISOString().slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + Number(t.cost_usd || 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date: date.slice(5), cost: +cost.toFixed(4) }));
  }, [traces]);

  const byFeature = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of traces) {
      map.set(t.feature, (map.get(t.feature) ?? 0) + Number(t.cost_usd || 0));
    }
    return Array.from(map.entries())
      .map(([feature, cost]) => ({ feature, cost: +cost.toFixed(4) }))
      .sort((a, b) => b.cost - a.cost);
  }, [traces]);

  const byModel = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of traces) {
      map.set(t.model, (map.get(t.model) ?? 0) + Number(t.cost_usd || 0));
    }
    return Array.from(map.entries())
      .map(([model, cost]) => ({ model: model.split("/").pop() ?? model, cost: +cost.toFixed(4) }))
      .sort((a, b) => b.cost - a.cost);
  }, [traces]);

  const topExpensive = useMemo(
    () =>
      [...traces]
        .sort((a, b) => Number(b.cost_usd) - Number(a.cost_usd))
        .slice(0, 10),
    [traces]
  );

  // ---------- Budget edit ----------
  const updateBudget = async (b: Budget, patch: Partial<Budget>) => {
    const { error } = await supabase
      .from("feature_budgets")
      .update(patch)
      .eq("id", b.id);
    if (error) {
      toast.error("Brak uprawnień (wymagana rola admin)");
      return;
    }
    toast.success("Budżet zaktualizowany");
    setBudgets((prev) => prev.map((x) => (x.id === b.id ? { ...x, ...patch } : x)));
  };

  const spendByFeatureToday = useMemo(() => {
    const map = new Map<string, number>();
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const t of traces) {
      if (now - new Date(t.created_at).getTime() > dayMs) continue;
      map.set(t.feature, (map.get(t.feature) ?? 0) + Number(t.cost_usd || 0));
    }
    return map;
  }, [traces]);

  return (
    <div className="space-y-6" data-testid="cost-tracker">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cost Tracker & Budget Guard</h2>
          <p className="text-sm text-muted-foreground">
            Wszystkie koszty AI w jednym miejscu. Budżety dzienne wymuszane
            server-side w llm-gateway.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" data-testid="ct-refresh">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Odśwież
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Spend dziś"
          value={`$${kpis.today.toFixed(4)}`}
          sub={`7d: $${kpis.sevenD.toFixed(4)} • 30d: $${kpis.thirtyD.toFixed(4)}`}
          testid="kpi-today"
        />
        <KpiCard
          icon={Zap}
          label="Średnia latency"
          value={`${Math.round(kpis.avgLatency)} ms`}
          sub={`Średni koszt: $${kpis.avgCost.toFixed(6)}`}
          testid="kpi-latency"
        />
        <KpiCard
          icon={Database}
          label="Cache hit rate"
          value={`${kpis.cacheRate.toFixed(1)}%`}
          sub={`${kpis.totalRequests} requestów (30d)`}
          testid="kpi-cache"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Błędy"
          value={kpis.errors.toString()}
          sub={kpis.totalRequests
            ? `${((kpis.errors / kpis.totalRequests) * 100).toFixed(1)}% error rate`
            : "—"}
          testid="kpi-errors"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Spend per dzień (30d)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(v: number) => `$${v.toFixed(4)}`}
                />
                <Line type="monotone" dataKey="cost" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Spend per feature</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byFeature}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="feature" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(v: number) => `$${v.toFixed(4)}`}
                />
                <Bar dataKey="cost">
                  {byFeature.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Spend per model</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byModel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="model" type="category" width={140} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(v: number) => `$${v.toFixed(4)}`}
                />
                <Bar dataKey="cost" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Budgets */}
      <Card data-testid="ct-budgets">
        <CardHeader>
          <CardTitle>Budżety dzienne (USD)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Po przekroczeniu limitu llm-gateway zwraca HTTP 429 z{" "}
            <code className="text-xs">budget_exceeded</code>. Zmiany wymagają roli admin.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgets.length === 0 && (
            <p className="text-sm text-muted-foreground">Brak budżetów.</p>
          )}
          {budgets.map((b) => {
            const spend = spendByFeatureToday.get(b.feature) ?? 0;
            const pct = b.daily_limit_usd > 0
              ? Math.min(100, (spend / Number(b.daily_limit_usd)) * 100)
              : 0;
            const exceeded = pct >= 100;
            return (
              <div
                key={b.id}
                className="space-y-2 rounded-lg border border-border p-3"
                data-testid={`budget-${b.feature}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-semibold">{b.feature}</code>
                    {exceeded && b.enabled && (
                      <Badge variant="destructive">EXCEEDED</Badge>
                    )}
                    {!b.enabled && <Badge variant="outline">disabled</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`limit-${b.id}`} className="text-xs">$/dzień</Label>
                      <Input
                        id={`limit-${b.id}`}
                        data-testid={`limit-${b.feature}`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={b.daily_limit_usd}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v !== Number(b.daily_limit_usd)) {
                            updateBudget(b, { daily_limit_usd: v });
                          }
                        }}
                        className="h-8 w-24"
                      />
                    </div>
                    <Switch
                      checked={b.enabled}
                      onCheckedChange={(checked) => updateBudget(b, { enabled: checked })}
                      data-testid={`enabled-${b.feature}`}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${spend.toFixed(4)} / ${Number(b.daily_limit_usd).toFixed(2)}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Top expensive */}
      <Card>
        <CardHeader><CardTitle>Top 10 najdroższych requestów</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2" data-testid="top-expensive">
            {topExpensive.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{t.feature}</Badge>
                    <code className="text-muted-foreground">{t.model}</code>
                    <span className="text-muted-foreground">
                      {new Date(t.created_at).toLocaleString()}
                    </span>
                    {t.cache_hit && <Badge variant="secondary">cache</Badge>}
                  </div>
                  {t.request_preview && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {t.request_preview}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-semibold">${Number(t.cost_usd).toFixed(6)}</div>
                  <div className="text-muted-foreground">
                    {t.latency_ms}ms • {t.total_tokens ?? 0} tok
                  </div>
                </div>
              </div>
            ))}
            {topExpensive.length === 0 && (
              <p className="text-sm text-muted-foreground">Brak danych. Uruchom kilka requestów AI.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, testid,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  sub: string;
  testid: string;
}) {
  return (
    <Card data-testid={testid}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
