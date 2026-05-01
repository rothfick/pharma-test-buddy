import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function Legacy() {
  return (
    <div className="space-y-6" data-testid="legacy-page">
      <ApiTester />
      <FlakyComponent />
      <InfiniteScroll />
      <ShadowDomCard />
      <IframeCard />
    </div>
  );
}

function ApiTester() {
  const [delay, setDelay] = useState(0);
  const [fail, setFail] = useState(0);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const callApi = async () => {
    setLoading(true);
    setResult("");
    setDuration(null);
    const start = performance.now();
    try {
      const url = `${FUNCTIONS_URL}/qa-api?delay=${delay}&fail=${fail}`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const text = await res.text();
      setDuration(Math.round(performance.now() - start));
      setResult(`HTTP ${res.status}\n\n${text}`);
    } catch (e) {
      setResult(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-testid="api-tester">
      <CardHeader>
        <CardTitle>API tester</CardTitle>
        <CardDescription>
          Edge function ze sterowaną latencją i wstrzykiwaniem błędów — pod testy timeoutów, retry i error handlingu.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="delay">Delay (ms)</Label>
            <Input id="delay" type="number" value={delay} onChange={(e) => setDelay(parseInt(e.target.value) || 0)} data-testid="api-delay" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fail">Force HTTP status (0 = success)</Label>
            <Input id="fail" type="number" value={fail} onChange={(e) => setFail(parseInt(e.target.value) || 0)} data-testid="api-fail" />
          </div>
        </div>
        <Button onClick={callApi} disabled={loading} data-testid="api-call">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Call /qa-api
        </Button>
        {duration !== null && <Badge variant="secondary" data-testid="api-duration">Duration: {duration}ms</Badge>}
        {result && (
          <pre className="rounded-md border border-border bg-secondary/30 p-3 text-xs whitespace-pre-wrap" data-testid="api-result">
            {result}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

function FlakyComponent() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const trigger = () => {
    setLoading(true);
    setVisible(false);
    setCount((c) => c + 1);
    const delay = Math.floor(Math.random() * 2300) + 200;
    setTimeout(() => {
      setVisible(true);
      setLoading(false);
    }, delay);
  };

  return (
    <Card data-testid="flaky-component">
      <CardHeader>
        <CardTitle>Flaky component</CardTitle>
        <CardDescription>Renderuje wynik po losowym opóźnieniu 200–2500ms.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={trigger} disabled={loading} data-testid="flaky-trigger">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Trigger render
        </Button>
        <div className="min-h-[60px] rounded-md border border-dashed border-border p-4">
          {visible ? (
            <div data-testid="flaky-result" className="text-success">✓ Rendered after click #{count}</div>
          ) : (
            <div className="text-sm text-muted-foreground">Waiting for trigger…</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InfiniteScroll() {
  const [items, setItems] = useState<number[]>(Array.from({ length: 20 }, (_, i) => i + 1));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setItems((prev) => [...prev, ...Array.from({ length: 10 }, (_, i) => prev.length + i + 1)]);
        }
      },
      { threshold: 1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Card data-testid="infinite-scroll">
      <CardHeader>
        <CardTitle>Infinite scroll</CardTitle>
        <CardDescription>Doładowuje pozycje przy scrollu do dołu listy.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 overflow-auto rounded-md border border-border" data-testid="scroll-container">
          <ul>
            {items.map((n) => (
              <li key={n} className="border-b border-border px-4 py-2 text-sm" data-testid={`scroll-item-${n}`}>
                Item #{n}
              </li>
            ))}
            <div ref={sentinelRef} className="h-2" />
          </ul>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Loaded: {items.length}</p>
      </CardContent>
    </Card>
  );
}

function ShadowDomCard() {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        .box { padding: 16px; border: 1px dashed hsl(217 91% 60%); border-radius: 8px; font-family: system-ui; }
        button { padding: 8px 16px; background: hsl(217 91% 60%); color: white; border: none; border-radius: 6px; cursor: pointer; }
      </style>
      <div class="box">
        <p data-testid="shadow-text">Hello from inside Shadow DOM</p>
        <button data-testid="shadow-button" onclick="this.textContent='Clicked!'">Click me</button>
      </div>
    `;
  }, []);

  return (
    <Card data-testid="shadow-dom">
      <CardHeader>
        <CardTitle>Shadow DOM</CardTitle>
        <CardDescription>Trening przebijania shadow rootów lokatorami.</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={hostRef} data-testid="shadow-host" />
      </CardContent>
    </Card>
  );
}

function IframeCard() {
  const html = `<!doctype html><html><body style="font-family:system-ui;padding:16px;background:#f9fafb">
    <h3>Iframe content</h3>
    <input id="iframe-input" data-testid="iframe-input" placeholder="Type here"/>
    <button data-testid="iframe-button" onclick="document.getElementById('iframe-output').textContent=document.getElementById('iframe-input').value">Echo</button>
    <p id="iframe-output" data-testid="iframe-output"></p>
  </body></html>`;
  const src = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  return (
    <Card data-testid="iframe-card">
      <CardHeader>
        <CardTitle>Iframe</CardTitle>
        <CardDescription>Trening przełączania kontekstów ramek.</CardDescription>
      </CardHeader>
      <CardContent>
        <iframe src={src} title="qa-iframe" className="h-48 w-full rounded-md border border-border" data-testid="qa-iframe" />
      </CardContent>
    </Card>
  );
}
