import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

interface Trace {
  id: string;
  feature: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  status: string;
  error: string | null;
  request_preview: string | null;
  response_preview: string | null;
  created_at: string;
}

const KPI = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
    </CardHeader>
    {sub && <CardContent className="text-xs text-muted-foreground">{sub}</CardContent>}
  </Card>
);

export default function Observability() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [testPrompt, setTestPrompt] = useState("Wyjaśnij w 2 zdaniach czym jest flaky test.");
  const [sending, setSending] = useState(false);

  const fetchTraces = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("llm_traces")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    else setTraces((data ?? []) as Trace[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTraces();
    const ch = supabase
      .channel("llm-traces")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "llm_traces" },
        (payload) => {
          setTraces((prev) => [payload.new as Trace, ...prev].slice(0, 100));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(
    () => traces.filter((t) =>
      !filter || t.feature.includes(filter) || t.model.includes(filter)
    ),
    [traces, filter]
  );

  const stats = useMemo(() => {
    const total = filtered.length;
    const cost = filtered.reduce((a, b) => a + Number(b.cost_usd), 0);
    const latency = total ? filtered.reduce((a, b) => a + b.latency_ms, 0) / total : 0;
    const tokens = filtered.reduce((a, b) => a + b.prompt_tokens + b.completion_tokens, 0);
    const cacheHits = filtered.filter((t) => t.cache_hit).length;
    const errors = filtered.filter((t) => t.status === "error").length;
    return { total, cost, latency, tokens, cacheHits, errors };
  }, [filtered]);

  const sendTest = async (model: string, useCache: boolean) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("llm-gateway", {
        body: {
          feature: "obs-test",
          model,
          use_cache: useCache,
          messages: [{ role: "user", content: testPrompt }],
        },
      });
      if (error) throw error;
      const text = (data as any)?.choices?.[0]?.message?.content ?? "(no content)";
      toast.success(`${model}${useCache ? " (cache)" : ""}: ${String(text).slice(0, 80)}…`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-observability">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPI label="Calls" value={String(stats.total)} sub="last 100" />
        <KPI label="Total cost" value={`$${stats.cost.toFixed(4)}`} />
        <KPI label="Avg latency" value={`${Math.round(stats.latency)} ms`} />
        <KPI label="Tokens" value={stats.tokens.toLocaleString()} />
        <KPI label="Cache hits" value={String(stats.cacheHits)} />
        <KPI label="Errors" value={String(stats.errors)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Try the gateway</CardTitle>
          <CardDescription>
            Wywołania idą przez edge function <code>llm-gateway</code>.
            Każde jest logowane, wyceniane i może użyć semantycznego cache.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            data-testid="obs-prompt"
            placeholder="Wpisz prompt testowy…"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm" disabled={sending}
              onClick={() => sendTest("google/gemini-3-flash-preview", false)}
              data-testid="obs-send-flash"
            >
              <Send className="mr-2 h-3.5 w-3.5" /> Gemini Flash
            </Button>
            <Button
              size="sm" variant="secondary" disabled={sending}
              onClick={() => sendTest("google/gemini-2.5-pro", false)}
              data-testid="obs-send-pro"
            >
              <Send className="mr-2 h-3.5 w-3.5" /> Gemini Pro
            </Button>
            <Button
              size="sm" variant="secondary" disabled={sending}
              onClick={() => sendTest("openai/gpt-5-mini", false)}
              data-testid="obs-send-gpt"
            >
              <Send className="mr-2 h-3.5 w-3.5" /> GPT-5 mini
            </Button>
            <Button
              size="sm" variant="outline" disabled={sending}
              onClick={() => sendTest("google/gemini-3-flash-preview", true)}
              data-testid="obs-send-cached"
            >
              <Send className="mr-2 h-3.5 w-3.5" /> Flash (cached)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Traces</CardTitle>
            <CardDescription>Realtime — nowe wywołania pojawiają się natychmiast.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter feature/model"
              className="w-48"
              data-testid="obs-filter"
            />
            <Button size="sm" variant="ghost" onClick={fetchTraces} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table data-testid="obs-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Tokens (in/out)</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Latency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} data-testid="obs-row">
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {new Date(t.created_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell><Badge variant="outline">{t.feature}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{t.model}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.prompt_tokens}/{t.completion_tokens}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${Number(t.cost_usd).toFixed(5)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t.latency_ms} ms</TableCell>
                    <TableCell>
                      {t.status === "error" ? (
                        <Badge variant="destructive">error</Badge>
                      ) : t.cache_hit ? (
                        <Badge>cache</Badge>
                      ) : (
                        <Badge variant="secondary">ok</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Brak trace'ów. Wyślij testowy prompt powyżej.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
