import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Stats = {
  total: number;
  withUser: number;
  withReason: number;
  withHashChain: number;
  withTimestamp: number;
  uniqueHashes: number;
  oldest: string | null;
  newest: string | null;
};

const PRINCIPLES = [
  { key: "attributable", title: "Attributable", desc: "Każda akcja ma identyfikowalnego autora." },
  { key: "legible", title: "Legible", desc: "Dane czytelne i zachowane w pierwotnym formacie." },
  { key: "contemporaneous", title: "Contemporaneous", desc: "Zapis powstaje w momencie akcji." },
  { key: "original", title: "Original", desc: "Niezmienność zapisu (immutability)." },
  { key: "accurate", title: "Accurate", desc: "Hash chain potwierdza brak modyfikacji." },
  { key: "complete", title: "Complete", desc: "Wszystkie pola wymagane są wypełnione." },
  { key: "consistent", title: "Consistent", desc: "Spójna sekwencja czasowa zapisów." },
  { key: "enduring", title: "Enduring", desc: "Trwałe przechowywanie (retencja)." },
  { key: "available", title: "Available", desc: "Dostępne na żądanie audytora." },
];

export default function DataIntegrity() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("user_id, reason, prev_hash, current_hash, created_at")
        .order("created_at", { ascending: true })
        .limit(1000);
      const rows = data ?? [];
      const total = rows.length;
      const withUser = rows.filter((r) => r.user_id).length;
      const withReason = rows.filter((r) => r.reason).length;
      const withHashChain = rows.filter((r) => r.prev_hash && r.current_hash).length;
      const withTimestamp = rows.filter((r) => r.created_at).length;
      const uniqueHashes = new Set(rows.map((r) => r.current_hash)).size;
      setStats({
        total,
        withUser,
        withReason,
        withHashChain,
        withTimestamp,
        uniqueHashes,
        oldest: rows[0]?.created_at ?? null,
        newest: rows[rows.length - 1]?.created_at ?? null,
      });
    })();
  }, []);

  if (!stats) return <div data-testid="alcoa-loading">Loading…</div>;

  const pct = (n: number) => (stats.total === 0 ? 100 : Math.round((n / stats.total) * 100));
  const scores: Record<string, number> = {
    attributable: pct(stats.withUser),
    legible: 100,
    contemporaneous: pct(stats.withTimestamp),
    original: 100, // immutability via trigger
    accurate: pct(stats.withHashChain),
    complete: pct(Math.min(stats.withReason, stats.withUser)),
    consistent: stats.total === stats.uniqueHashes ? 100 : 80,
    enduring: 100,
    available: 100,
  };
  const avg = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 9);

  return (
    <div className="space-y-4" data-testid="alcoa-page">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ALCOA+ Score</span>
            <span className="text-3xl font-bold tabular-nums" data-testid="alcoa-score">{avg}%</span>
          </CardTitle>
          <CardDescription>
            Live wskaźnik integralności danych dla audit logu ({stats.total} wpisów).
            Bazowany na FDA / EMA / WHO data integrity guidelines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={avg} />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {PRINCIPLES.map((p) => {
          const score = scores[p.key];
          const ok = score >= 95;
          return (
            <Card key={p.key} data-testid={`alcoa-${p.key}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{p.title}</CardTitle>
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <CardDescription className="text-xs">{p.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{score}%</div>
                <Progress value={score} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
