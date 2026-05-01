import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Beaker, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DEFAULT_PROMPT = `Jesteś asystentem QA. Klasyfikuj bug report jako jeden z: bug, feature, question. Odpowiedz JEDNYM słowem.`;
const DEFAULT_DATASET = `[
  {"input":"App crashes when I click Save","expected":"bug"},
  {"input":"Can you add dark mode?","expected":"feature"},
  {"input":"How do I reset my password?","expected":"question"},
  {"input":"Login button is not working on Safari","expected":"bug"},
  {"input":"Please add export to CSV","expected":"feature"}
]`;

const MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
];

export default function EvalsPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [dataset, setDataset] = useState(DEFAULT_DATASET);
  const [datasetName, setDatasetName] = useState("bug-classification-v1");
  const [model, setModel] = useState(MODELS[0]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  async function loadHistory() {
    const { data } = await supabase.from("prompt_evals").select("*").order("created_at", { ascending: false }).limit(10);
    setHistory(data ?? []);
  }
  useEffect(() => { loadHistory(); }, []);

  async function run() {
    let cases: any[];
    try { cases = JSON.parse(dataset); } catch {
      toast({ title: "Zły dataset", description: "Musi być JSON array {input, expected}", variant: "destructive" });
      return;
    }
    if (!Array.isArray(cases) || !cases.every(c => c.input && c.expected)) {
      toast({ title: "Zły format", description: "[{input, expected}, ...]", variant: "destructive" });
      return;
    }
    setRunning(true); setResult(null);
    const { data, error } = await supabase.functions.invoke("eval-run", {
      body: { prompt_content: prompt, model, dataset_name: datasetName, cases },
    });
    setRunning(false);
    if (error) { toast({ title: "Błąd", description: error.message, variant: "destructive" }); return; }
    setResult(data);
    loadHistory();
  }

  return (
    <div className="space-y-6" data-testid="ai-evals">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5" /> Eval Harness</CardTitle>
          <CardDescription>
            Prompt + dataset + model → score, latency, koszt. <b>LLM-as-judge</b> ocenia każdy case (gemini-3-flash).
            Idealne do A/B promptów albo regresji modelu.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Konfiguracja</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">System prompt</label>
              <Textarea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} disabled={running} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">Model</label>
                <Select value={model} onValueChange={setModel} disabled={running}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODELS.map(m => <SelectItem key={m} value={m}>{m.split("/")[1]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Dataset name</label>
                <Input value={datasetName} onChange={e => setDatasetName(e.target.value)} disabled={running} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Cases (JSON array)</label>
              <Textarea rows={8} value={dataset} onChange={e => setDataset(e.target.value)} className="font-mono text-xs" disabled={running} />
            </div>
            <Button onClick={run} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Evaluating..." : "Run eval"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Wynik</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!result && <p className="text-sm text-muted-foreground">Uruchom eval żeby zobaczyć wyniki...</p>}
            {result && (
              <>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant={result.score >= 0.8 ? "default" : "destructive"}>
                    Score: {(result.score * 100).toFixed(0)}%
                  </Badge>
                  <Badge variant="outline">{result.passed}/{result.total} pass</Badge>
                  <Badge variant="outline">{result.avg_latency_ms}ms avg</Badge>
                  <Badge variant="outline">${result.total_cost_usd}</Badge>
                </div>
                <div className="space-y-2 max-h-96 overflow-auto">
                  {result.results?.map((r: any, i: number) => (
                    <div key={i} className={`border-l-2 pl-3 text-xs ${r.pass ? "border-emerald-500" : "border-destructive"}`}>
                      <div className="flex items-center gap-1 font-medium">
                        {r.pass ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-destructive" />}
                        {r.input}
                      </div>
                      <div className="text-muted-foreground">expected: <code>{r.expected}</code> · actual: <code>{r.actual}</code></div>
                      {r.reason && <div className="italic text-muted-foreground">{r.reason}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historia evaluacji</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 && <p className="text-sm text-muted-foreground">Brak. Uruchom pierwszą ewaluację →</p>}
          <div className="space-y-1">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm border-b py-1">
                <div className="flex items-center gap-2">
                  <Badge variant={h.score >= 0.8 ? "default" : "destructive"}>{(h.score * 100).toFixed(0)}%</Badge>
                  <span className="font-medium">{h.dataset_name}</span>
                  <span className="text-xs text-muted-foreground">{h.model.split("/")[1]}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {h.passed_cases}/{h.total_cases} · {h.avg_latency_ms}ms · ${h.total_cost_usd}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
