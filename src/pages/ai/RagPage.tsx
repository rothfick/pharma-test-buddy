import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Upload, Send, Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SAMPLE = `Playwright to framework do testów end-to-end stworzony przez Microsoft. Wspiera Chromium, Firefox i WebKit. Page Object Model (POM) to wzorzec, który separuje logikę testów od selektorów UI — każda strona ma własną klasę z metodami akcji i selektorami.

Testy w Playwright pisze się w TypeScript lub JavaScript. Asercje używają biblioteki @playwright/test z funkcją expect(). Auto-waiting jest wbudowane: locator().click() czeka na element domyślnie 30 sekund.

Dla flaky tests warto użyć trace viewer: PWDEBUG=1 npx playwright test, lub po fakcie playwright show-trace trace.zip. Retries konfiguruje się w playwright.config.ts — zalecane 2 retry w CI, 0 lokalnie.`;

export default function RagPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [title, setTitle] = useState("Playwright basics");
  const [content, setContent] = useState(SAMPLE);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("Jak debugować flaky testy w Playwright?");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<any>(null);

  async function loadDocs() {
    const { data } = await supabase.from("rag_documents").select("id,title,source,created_at").order("created_at", { ascending: false });
    setDocs(data ?? []);
  }
  useEffect(() => { loadDocs(); }, []);

  async function ingest() {
    if (!title || content.length < 20) return;
    setUploading(true);
    const { data, error } = await supabase.functions.invoke("rag-ingest", {
      body: { title, content, source: "manual" },
    });
    setUploading(false);
    if (error) { toast({ title: "Błąd", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Dokument dodany", description: `${data.chunks} chunków w ${data.duration_ms}ms` });
    setTitle(""); setContent(""); loadDocs();
  }

  async function deleteDoc(id: string) {
    await supabase.from("rag_documents").delete().eq("id", id);
    loadDocs();
  }

  async function ask() {
    if (question.length < 3) return;
    setAsking(true); setAnswer(null);
    const { data, error } = await supabase.functions.invoke("rag-query", { body: { question, top_k: 5 } });
    setAsking(false);
    if (error) { toast({ title: "Błąd", description: error.message, variant: "destructive" }); return; }
    setAnswer(data);
  }

  return (
    <div className="space-y-6" data-testid="ai-rag">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> RAG Q&A</CardTitle>
          <CardDescription>
            Upload dokumentu → lokalne embeddings (768d hashed bag-of-words) → pgvector → odpowiedź z cytowaniami przez Gemini.
            Guardrail: jeśli similarity &lt; 0.15, model odpowiada "nie wiem".
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Dodaj dokument</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Tytuł" value={title} onChange={e => setTitle(e.target.value)} disabled={uploading} />
            <Textarea rows={8} placeholder="Treść (min 20 znaków)" value={content} onChange={e => setContent(e.target.value)} disabled={uploading} />
            <Button onClick={ingest} disabled={uploading || !title || content.length < 20}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Embedding..." : "Dodaj i indeksuj"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Baza wiedzy ({docs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-auto">
            {docs.length === 0 && <p className="text-sm text-muted-foreground">Brak dokumentów. Dodaj pierwszy →</p>}
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <div className="truncate"><b>{d.title}</b> <span className="text-muted-foreground text-xs">{d.source}</span></div>
                <Button size="sm" variant="ghost" onClick={() => deleteDoc(d.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Zapytaj bazy wiedzy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Twoje pytanie..." disabled={asking} onKeyDown={e => e.key === "Enter" && ask()} />
            <Button onClick={ask} disabled={asking || question.length < 3}>
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Pytaj
            </Button>
          </div>
          {answer && (
            <div className="space-y-3">
              <div className="bg-muted p-3 rounded-md whitespace-pre-wrap text-sm">{answer.answer}</div>
              <div className="flex gap-2 flex-wrap text-xs">
                {answer.tokens != null && <Badge variant="outline">{answer.tokens} tok</Badge>}
                {answer.cost != null && <Badge variant="outline">${answer.cost}</Badge>}
                {answer.duration_ms != null && <Badge variant="outline">{answer.duration_ms}ms</Badge>}
              </div>
              {answer.citations?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Źródła</h4>
                  {answer.citations.map((c: any) => (
                    <div key={c.n} className="border-l-2 border-primary/50 pl-3 text-xs">
                      <div className="font-medium">[{c.n}] {c.title} <Badge variant="secondary" className="ml-1">sim {c.similarity.toFixed(3)}</Badge></div>
                      <div className="text-muted-foreground">{c.snippet}...</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
