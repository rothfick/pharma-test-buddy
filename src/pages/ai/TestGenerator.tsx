import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, Wand2, Square } from "lucide-react";
import { toast } from "sonner";

const SYSTEM = `You are a senior Playwright + TypeScript engineer.
Given a user story, output ONE complete, runnable Playwright test file.
Rules:
- Use @playwright/test, TypeScript, Page Object pattern (inline class in same file).
- Stable selectors: prefer getByRole / getByTestId. Never use xpath or text-only selectors for buttons.
- Add at least 3 meaningful assertions (expect.toHaveURL, toHaveText, toBeVisible).
- Add a brief // Arrange / // Act / // Assert structure.
- Output ONLY the code block in TypeScript, no prose.`;

const EXAMPLES = [
  "Użytkownik loguje się emailem i hasłem, widzi dashboard, klika 'New Task', wypełnia tytuł 'Fix login bug', priorytet 'high', zapisuje, widzi nowy task na liście.",
  "Tester otwiera /playground/files, przeciąga plik do dropzone, widzi miniaturę i nazwę pliku, klika 'Download CSV', sprawdza że plik się pobiera.",
  "Admin idzie do /tasks, filtruje po statusie 'in_progress', zaznacza 3 wiersze, klika 'Bulk delete', potwierdza w modalu, lista jest krótsza o 3.",
];

export default function TestGenerator() {
  const [story, setStory] = useState(EXAMPLES[0]);
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!story.trim()) return;
    setOutput("");
    setStreaming(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-gateway`;
      const session = (await import("@/integrations/supabase/client"))
        .supabase.auth.getSession ? null : null;
      const { data: sessionData } = await (await import("@/integrations/supabase/client"))
        .supabase.auth.getSession();
      const token = sessionData.session?.access_token
        ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(url, {
        method: "POST",
        signal: ac.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          feature: "test-generator",
          model: "google/gemini-2.5-pro",
          fallbacks: ["google/gemini-3-flash-preview"],
          stream: true,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: story },
          ],
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.text();
        throw new Error(err || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              acc += delta;
              setOutput(acc);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Stream failed");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const cancel = () => abortRef.current?.abort();

  // strip ```ts fences for copy
  const cleanCode = output.replace(/^```(?:ts|typescript)?\n?/m, "").replace(/```\s*$/m, "");

  const copy = async () => {
    await navigator.clipboard.writeText(cleanCode || output);
    toast.success("Skopiowano do schowka");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="ai-test-generator">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4" /> User story
          </CardTitle>
          <CardDescription>
            Opisz scenariusz po polsku lub angielsku. Model: <Badge variant="secondary">gemini-2.5-pro</Badge> z fallbackiem na flash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={8}
            placeholder="Np. Użytkownik loguje się i tworzy task…"
            data-testid="testgen-input"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <Button
                key={i} size="sm" variant="outline"
                onClick={() => setStory(ex)}
                data-testid={`testgen-example-${i}`}
              >
                Example {i + 1}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generate}
              disabled={streaming || !story.trim()}
              data-testid="testgen-generate"
            >
              {streaming
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Streaming…</>
                : <><Wand2 className="mr-2 h-4 w-4" /> Generate test</>}
            </Button>
            {streaming && (
              <Button variant="outline" onClick={cancel} data-testid="testgen-cancel">
                <Square className="mr-2 h-4 w-4" /> Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Generated Playwright test</CardTitle>
            <CardDescription>
              Streaming token-by-token. Każde wywołanie loguje się w Observability.
            </CardDescription>
          </div>
          {output && (
            <Button size="sm" variant="ghost" onClick={copy} data-testid="testgen-copy">
              <Copy className="mr-2 h-3.5 w-3.5" /> Copy
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <pre
            className="max-h-[520px] overflow-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed"
            data-testid="testgen-output"
          >
            <code>{output || "// Wygenerowany kod pojawi się tutaj…"}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
