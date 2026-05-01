import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Play, Save, Trophy } from "lucide-react";

const ALL_MODELS = [
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "openai/gpt-5",
];

type Result = {
  model: string;
  status: "idle" | "loading" | "ok" | "error";
  content?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  latencyMs?: number;
  error?: string;
};

export default function PromptPlayground() {
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a senior QA engineer. Be concise and precise."
  );
  const [userPrompt, setUserPrompt] = useState(
    "Write 3 concise Playwright test ideas for a login form with email + password and a 'remember me' checkbox."
  );
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([512]);
  const [selected, setSelected] = useState<string[]>([
    "google/gemini-3-flash-preview",
    "openai/gpt-5-mini",
  ]);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Save-to-registry state
  const [promptName, setPromptName] = useState("");
  const [promptDescription, setPromptDescription] = useState("");

  const toggleModel = (m: string) => {
    setSelected((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const runOne = async (model: string): Promise<Result> => {
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke("llm-gateway", {
        body: {
          feature: "prompt-playground",
          model,
          temperature: temperature[0],
          max_tokens: maxTokens[0],
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        },
      });
      const latencyMs = Math.round(performance.now() - t0);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const content = data?.choices?.[0]?.message?.content ?? "";
      const usage = data?.usage ?? {};
      // gateway also writes trace; compute approximate cost client-side via response if missing
      return {
        model,
        status: "ok",
        content,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        latencyMs,
      };
    } catch (e) {
      return {
        model,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
        latencyMs: Math.round(performance.now() - t0),
      };
    }
  };

  const runAll = async () => {
    if (selected.length === 0) {
      toast.error("Wybierz przynajmniej jeden model");
      return;
    }
    setRunning(true);
    setWinner(null);
    const initial: Record<string, Result> = {};
    selected.forEach((m) => (initial[m] = { model: m, status: "loading" }));
    setResults(initial);

    // Run in parallel — perfect for race-condition / latency comparison
    const settled = await Promise.all(selected.map((m) => runOne(m)));
    const next: Record<string, Result> = {};
    settled.forEach((r) => (next[r.model] = r));
    setResults(next);
    setRunning(false);
    toast.success(`Porównanie zakończone: ${settled.length} modeli`);
  };

  const saveToRegistry = async () => {
    if (!promptName.trim()) {
      toast.error("Podaj nazwę promptu");
      return;
    }
    const content = JSON.stringify({
      system: systemPrompt,
      user: userPrompt,
      temperature: temperature[0],
      max_tokens: maxTokens[0],
      winner,
    });
    const { error } = await supabase.from("prompt_registry").insert({
      name: promptName.trim(),
      description: promptDescription.trim() || null,
      content,
      version: 1,
      is_active: false,
    });
    if (error) {
      toast.error("Nie udało się zapisać (wymagana rola admin)");
      return;
    }
    toast.success("Prompt zapisany w registry");
    setPromptName("");
    setPromptDescription("");
  };

  const fmtCost = (c?: number) => (c == null ? "—" : `$${c.toFixed(6)}`);
  const fmtTokens = (t?: number) => (t == null ? "—" : t.toString());

  return (
    <div className="space-y-6" data-testid="prompt-playground">
      <Card>
        <CardHeader>
          <CardTitle>Prompt Playground</CardTitle>
          <p className="text-sm text-muted-foreground">
            Porównaj ten sam prompt na kilku modelach jednocześnie. Latency,
            tokens, koszt, output — wszystko widoczne. Wybierz "zwycięzcę" i
            zapisz do prompt registry.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system">System prompt</Label>
            <Textarea
              id="system"
              data-testid="pp-system"
              rows={2}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">User prompt</Label>
            <Textarea
              id="user"
              data-testid="pp-user"
              rows={4}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Temperature: {temperature[0].toFixed(2)}</Label>
              <Slider
                data-testid="pp-temp"
                value={temperature}
                onValueChange={setTemperature}
                min={0}
                max={2}
                step={0.05}
              />
            </div>
            <div className="space-y-2">
              <Label>Max tokens: {maxTokens[0]}</Label>
              <Slider
                data-testid="pp-maxtok"
                value={maxTokens}
                onValueChange={setMaxTokens}
                min={64}
                max={2048}
                step={64}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Modele do porównania ({selected.length})</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_MODELS.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-secondary/50"
                >
                  <Checkbox
                    checked={selected.includes(m)}
                    onCheckedChange={() => toggleModel(m)}
                    data-testid={`pp-model-${m}`}
                  />
                  <span className="font-mono text-xs">{m}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={runAll}
            disabled={running}
            data-testid="pp-run"
            className="w-full"
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uruchamiam {selected.length} modeli równolegle…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Porównaj modele
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {Object.keys(results).length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="pp-results">
          {selected.map((m) => {
            const r = results[m];
            if (!r) return null;
            const isWinner = winner === m;
            return (
              <Card
                key={m}
                className={isWinner ? "border-primary ring-2 ring-primary" : ""}
                data-testid={`pp-result-${m}`}
              >
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-mono text-sm break-all">{m}</CardTitle>
                    {isWinner && (
                      <Badge>
                        <Trophy className="mr-1 h-3 w-3" /> Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">⏱ {r.latencyMs ?? "—"} ms</Badge>
                    <Badge variant="outline">
                      in {fmtTokens(r.promptTokens)} / out {fmtTokens(r.completionTokens)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.status === "loading" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> generuję…
                    </div>
                  )}
                  {r.status === "error" && (
                    <p className="text-sm text-destructive">{r.error}</p>
                  )}
                  {r.status === "ok" && (
                    <>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-xs">
                        {r.content}
                      </pre>
                      <Button
                        variant={isWinner ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setWinner(isWinner ? null : m)}
                        data-testid={`pp-winner-${m}`}
                      >
                        <Trophy className="mr-2 h-4 w-4" />
                        {isWinner ? "Cofnij wybór" : "Wybierz jako winner"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {winner && (
        <Card data-testid="pp-save-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" /> Zapisz wygrany prompt do registry
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Wybrany model: <span className="font-mono">{winner}</span>. Wymaga
              roli admin.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="pname">Nazwa</Label>
              <Input
                id="pname"
                data-testid="pp-save-name"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="np. login-test-ideas-v1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pdesc">Opis</Label>
              <Input
                id="pdesc"
                data-testid="pp-save-desc"
                value={promptDescription}
                onChange={(e) => setPromptDescription(e.target.value)}
                placeholder="Krótki opis zastosowania"
              />
            </div>
            <Button onClick={saveToRegistry} data-testid="pp-save-btn">
              <Save className="mr-2 h-4 w-4" /> Zapisz w prompt_registry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
