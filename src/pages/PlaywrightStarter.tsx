import { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Download,
  FileCode,
  Sparkles,
  Shield,
  Activity,
  Workflow,
  TestTube,
  Eye,
  Layers,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CircleDashed,
  Search,
  RefreshCw,
  Zap,
  Terminal,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import {
  PLAYWRIGHT_TESTS,
  PLAYWRIGHT_CATEGORIES,
  TOTAL_TESTS,
  type PwTest,
  type TestStatus,
} from "@/lib/playwright-tests";
import { CATEGORY_STYLES } from "@/lib/playwright-categories";
import { cn } from "@/lib/utils";

type RunStatus = TestStatus | "running" | "queued" | "idle";

interface RunResult {
  status: RunStatus;
  durationMs?: number;
  completedSteps: number;
  totalSteps: number;
  log: string[];
}

const ALL = "All" as const;

const EXPECTED_COUNTS = (() => {
  const c = { pass: 0, fail: 0, flaky: 0, skipped: 0 };
  for (const t of PLAYWRIGHT_TESTS) c[t.expected]++;
  return c;
})();

export default function PlaywrightStarter() {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/playwright-starter`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "qa-playwright-starter.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Downloaded — extract and run npm install");
    } catch (e) {
      toast.error(`Download failed: ${(e as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="playwright-starter-page">
      {/* HERO */}
      <Card className="relative overflow-hidden border-primary/30">
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent"
          aria-hidden
        />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> Stage 5
                </Badge>
                <Badge variant="outline">Production-grade</Badge>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                Playwright{" "}
                <span className="text-gradient-primary">Starter Kit</span>
              </h1>
              <p className="text-muted-foreground">
                <strong className="text-foreground">{TOTAL_TESTS} tests</strong> across{" "}
                <strong className="text-foreground">{PLAYWRIGHT_CATEGORIES.length}</strong>{" "}
                categories — POM, self-healing locators, AI generation, accessibility, visual,
                performance, security & GxP. Browse the full catalog, view real Playwright code,
                and run a live demo execution.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={download} disabled={downloading} data-testid="download-zip" className="shadow-elegant">
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download ZIP
                </Button>
                <Badge variant="secondary" className="px-3 py-1.5">
                  TypeScript 5
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5">
                  Playwright 1.48
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5">
                  CI/CD ready
                </Badge>
              </div>
            </div>

            {/* Donut summary */}
            <div className="flex items-center gap-6 rounded-xl border bg-background/70 p-5 backdrop-blur">
              <Donut
                total={TOTAL_TESTS}
                segments={[
                  { value: EXPECTED_COUNTS.pass, color: "hsl(var(--success))" },
                  { value: EXPECTED_COUNTS.flaky, color: "hsl(var(--warning))" },
                  { value: EXPECTED_COUNTS.fail, color: "hsl(var(--destructive))" },
                  { value: EXPECTED_COUNTS.skipped, color: "hsl(var(--muted-foreground))" },
                ]}
              />
              <div className="space-y-1.5 text-xs">
                <LegendDot color="hsl(var(--success))" label="Pass" value={EXPECTED_COUNTS.pass} />
                <LegendDot color="hsl(var(--warning))" label="Flaky" value={EXPECTED_COUNTS.flaky} />
                <LegendDot color="hsl(var(--destructive))" label="Fail" value={EXPECTED_COUNTS.fail} />
                <LegendDot
                  color="hsl(var(--muted-foreground))"
                  label="Skipped"
                  value={EXPECTED_COUNTS.skipped}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="catalog" data-testid="tab-catalog">
            Test Catalog ({TOTAL_TESTS})
          </TabsTrigger>
          <TabsTrigger value="runner" data-testid="tab-runner">
            Live Runner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-fade-in">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4 animate-fade-in">
          <CatalogTab />
        </TabsContent>

        <TabsContent value="runner" className="space-y-4 animate-fade-in">
          <RunnerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Overview ---------- */

function OverviewTab() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={Layers} title="Page Object Model" desc="BasePage abstraction with smart navigation, LoginPage and DashboardPage examples." />
        <FeatureCard icon={Shield} title="Self-healing locators" desc="smartLocator() tries multiple strategies (testId → role → text → CSS) with logging." />
        <FeatureCard icon={Sparkles} title="AI test generator" desc='npm run ai:gen "User checks out" → generates a complete .spec.ts via Lovable AI Gateway.' />
        <FeatureCard icon={Eye} title="Accessibility (axe-core)" desc="WCAG 2.1 AA assertions baked in. Tag with @a11y, run nightly." />
        <FeatureCard icon={TestTube} title="Visual regression" desc="Pixel-diff screenshots per browser with maxDiffPixelRatio threshold." />
        <FeatureCard icon={Activity} title="k6 performance scripts" desc="Load + stress profiles with thresholds (p95<500ms, error_rate<1%)." />
        <FeatureCard icon={Workflow} title="CI/CD pipelines" desc="GitHub Actions sharding (4×) + Azure DevOps multi-browser matrix." />
        <FeatureCard icon={Zap} title="Smart fixtures" desc="auth.fixture.ts — pre-authenticated page per role via storageState." />
        <FeatureCard icon={FileCode} title="Tags & test groups" desc="@smoke, @regression, @e2e, @a11y, @visual, @perf, @security, @gxp, @chaos, @mobile." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suite composition ({TOTAL_TESTS} tests)</CardTitle>
          <CardDescription>Breakdown per category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLAYWRIGHT_CATEGORIES.map((c) => {
              const s = CATEGORY_STYLES[c.name];
              const Icon = s.icon;
              const pct = Math.round((c.count / TOTAL_TESTS) * 100);
              return (
                <div
                  key={c.name}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border bg-card p-4 transition hover:shadow-elegant hover:-translate-y-0.5",
                    s.ring,
                  )}
                >
                  <div
                    className={cn(
                      "absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40",
                      s.dot,
                    )}
                  />
                  <div className="relative flex items-start justify-between gap-2">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br text-white shadow-md",
                        s.gradient,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {c.count}
                    </Badge>
                  </div>
                  <div className="relative mt-3">
                    <p className="text-sm font-medium">{c.name}</p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full bg-gradient-to-r", s.gradient)} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{pct}% of suite</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/* ---------- Catalog ---------- */

function CatalogTab() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string>(PLAYWRIGHT_TESTS[0].id);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLAYWRIGHT_TESTS.filter((t) => {
      if (category !== ALL && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [query, category]);

  const selected =
    PLAYWRIGHT_TESTS.find((t) => t.id === selectedId) ?? filtered[0] ?? PLAYWRIGHT_TESTS[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,440px)_1fr]">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="catalog-search"
              placeholder={`Search ${TOTAL_TESTS} tests…`}
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip
              label={ALL}
              count={TOTAL_TESTS}
              active={category === ALL}
              onClick={() => setCategory(ALL)}
            />
            {PLAYWRIGHT_CATEGORIES.map((c) => (
              <CategoryChip
                key={c.name}
                label={c.name}
                count={c.count}
                active={category === c.name}
                onClick={() => setCategory(c.name)}
                styleKey={c.name}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} matching</p>
        </CardHeader>
        <ScrollArea className="h-[580px] border-t">
          <ul className="divide-y">
            {filtered.map((t) => {
              const s = CATEGORY_STYLES[t.category];
              const Icon = s.icon;
              const active = selected.id === t.id;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-muted/60",
                      active && "bg-muted",
                    )}
                    data-testid={`test-row-${t.id}`}
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white",
                        s.gradient,
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <ExpectedDot status={t.expected} />
                        <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span>
                      </div>
                      <p className="text-sm leading-tight mt-0.5">{t.title}</p>
                    </div>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">No matches</li>
            )}
          </ul>
        </ScrollArea>
      </Card>

      <div className="space-y-4">
        <Card key={selected.id} className="overflow-hidden animate-fade-in">
          <CardHeader
            className={cn(
              "border-b bg-gradient-to-r text-white",
              CATEGORY_STYLES[selected.category].gradient,
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {(() => {
                  const Icon = CATEGORY_STYLES[selected.category].icon;
                  return (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                      <Icon className="h-5 w-5" />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle className="text-base text-white">{selected.title}</CardTitle>
                  <CardDescription className="text-white/80">
                    <span className="font-mono">{selected.id}</span> · {selected.category}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {selected.tags.map((tag) => (
                  <Badge key={tag} className="bg-white/20 text-white border-0 text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <CodeBlock code={selected.code} filename={`tests/${selected.id}.spec.ts`} />
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> Execution steps
              </h4>
              <ol className="space-y-1.5 text-sm">
                {selected.steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-md border bg-card/50 px-3 py-1.5"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{s.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ~{s.ms}ms
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <SingleRunButton test={selected} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
  styleKey,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  styleKey?: string;
}) {
  const style = styleKey ? CATEGORY_STYLES[styleKey as keyof typeof CATEGORY_STYLES] : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
        active
          ? cn(
              "border-transparent text-white shadow-sm bg-gradient-to-r",
              style ? style.gradient : "from-primary to-accent",
            )
          : cn(
              "border-border bg-background text-muted-foreground hover:bg-muted",
              style && "hover:" + style.text,
            ),
      )}
    >
      {style && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            active ? "bg-white" : style.dot,
          )}
        />
      )}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px]",
          active ? "bg-white/25" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function CodeBlock({ code, filename }: { code: string; filename: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className="overflow-hidden rounded-lg border bg-zinc-950 text-zinc-100 shadow-inner">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <Terminal className="h-3 w-3" /> {filename}
        </div>
        <div className="w-12" />
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[2.25rem_1fr]">
              <span className="select-none text-right pr-3 text-zinc-600">{i + 1}</span>
              <span className="whitespace-pre">{highlightLine(line)}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

function highlightLine(line: string) {
  // Lightweight token highlighter (no external dep)
  const parts: Array<{ t: string; c?: string }> = [];
  const regex =
    /(\/\/.*$)|(['"`])((?:\\.|(?!\2).)*)\2|\b(import|from|export|const|let|var|function|async|await|return|if|else|for|of|in|new|test|expect|process)\b|\b(true|false|null|undefined|\d+(?:\.\d+)?)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line))) {
    if (m.index > last) parts.push({ t: line.slice(last, m.index) });
    if (m[1]) parts.push({ t: m[1], c: "text-zinc-500 italic" });
    else if (m[2]) parts.push({ t: m[0], c: "text-emerald-400" });
    else if (m[4]) parts.push({ t: m[4], c: "text-violet-400" });
    else if (m[5]) parts.push({ t: m[5], c: "text-amber-400" });
    last = regex.lastIndex;
  }
  if (last < line.length) parts.push({ t: line.slice(last) });
  return parts.map((p, i) =>
    p.c ? (
      <span key={i} className={p.c}>
        {p.t}
      </span>
    ) : (
      <span key={i}>{p.t}</span>
    ),
  );
}

function SingleRunButton({ test }: { test: PwTest }) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  // Reset when test changes
  useEffect(() => {
    setResult(null);
    setRunning(false);
  }, [test.id]);

  const run = async () => {
    setRunning(true);
    setResult({ status: "running", completedSteps: 0, totalSteps: test.steps.length, log: [] });
    const log: string[] = [];
    let elapsed = 0;
    for (let i = 0; i < test.steps.length; i++) {
      const s = test.steps[i];
      const wait = Math.max(80, Math.round(s.ms * 0.1));
      await new Promise((r) => setTimeout(r, wait));
      elapsed += s.ms;
      log.push(`✓ ${s.label} (${s.ms}ms)`);
      setResult({
        status: "running",
        completedSteps: i + 1,
        totalSteps: test.steps.length,
        log: [...log],
        durationMs: elapsed,
      });
    }
    const status: TestStatus = test.expected;
    if (status === "fail")
      log.push("✗ AssertionError: expected element to be visible (mock outcome)");
    if (status === "flaky") log.push("⚠ Flaky: passed on retry #2");
    setResult({
      status,
      completedSteps: test.steps.length,
      totalSteps: test.steps.length,
      log,
      durationMs: elapsed,
    });
    setRunning(false);
  };

  const reset = () => setResult(null);
  const finalStatus = result?.status;

  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/30 p-3 transition",
        finalStatus === "pass" && "border-emerald-500/40 bg-emerald-500/5",
        finalStatus === "fail" && "border-destructive/40 bg-destructive/5",
        finalStatus === "flaky" && "border-amber-500/40 bg-amber-500/5",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon status={result?.status ?? "idle"} pulse={running} />
          <span className="font-medium">
            {result ? labelFor(result.status) : "Ready to run (demo)"}
          </span>
          {result?.durationMs !== undefined && (
            <span className="font-mono text-xs text-muted-foreground">
              {(result.durationMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {result && !running && (
            <Button size="sm" variant="ghost" onClick={reset}>
              <RefreshCw className="mr-1 h-3 w-3" /> Reset
            </Button>
          )}
          <Button size="sm" onClick={run} disabled={running} data-testid={`run-${test.id}`}>
            {running ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Play className="mr-1 h-3 w-3" />
            )}
            Run demo
          </Button>
        </div>
      </div>
      {result && (
        <>
          <Progress
            value={(result.completedSteps / result.totalSteps) * 100}
            className="mt-3 h-1.5"
          />
          <pre className="mt-3 max-h-40 overflow-auto rounded bg-zinc-950 p-2.5 text-[11px] leading-snug text-zinc-200">
            {result.log.length === 0 ? "Starting…" : result.log.join("\n")}
          </pre>
        </>
      )}
    </div>
  );
}

/* ---------- Live Runner ---------- */

function RunnerTab() {
  const [category, setCategory] = useState<string>(ALL);
  const [results, setResults] = useState<Record<string, RunStatus>>({});
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [parallelism, setParallelism] = useState(8);

  const queue = useMemo(
    () =>
      category === ALL
        ? PLAYWRIGHT_TESTS
        : PLAYWRIGHT_TESTS.filter((t) => t.category === category),
    [category],
  );

  const counts = useMemo(() => {
    const c = { pass: 0, fail: 0, flaky: 0, skipped: 0, running: 0, queued: 0 };
    for (const id in results) {
      const s = results[id];
      if (s in c) (c as Record<string, number>)[s]++;
    }
    return c;
  }, [results]);

  useEffect(
    () => () => {
      cancelRef.current = true;
    },
    [],
  );

  const start = async () => {
    cancelRef.current = false;
    setRunning(true);
    setProgress(0);
    const initial: Record<string, RunStatus> = {};
    queue.forEach((t) => (initial[t.id] = "queued"));
    setResults(initial);

    let done = 0;
    let cursor = 0;
    const total = queue.length;

    async function worker() {
      while (!cancelRef.current) {
        const idx = cursor++;
        if (idx >= total) return;
        const t = queue[idx];
        setResults((prev) => ({ ...prev, [t.id]: "running" }));
        const totalMs = t.steps.reduce((a, s) => a + s.ms, 0);
        const wait = Math.min(220, Math.max(40, Math.round(totalMs * 0.04)));
        await new Promise((r) => setTimeout(r, wait));
        if (cancelRef.current) return;
        setResults((prev) => ({ ...prev, [t.id]: t.expected }));
        done++;
        setProgress(Math.round((done / total) * 100));
      }
    }

    await Promise.all(Array.from({ length: parallelism }, () => worker()));
    setRunning(false);
    if (!cancelRef.current) toast.success(`Run complete: ${total} tests`);
  };

  const stop = () => {
    cancelRef.current = true;
    setRunning(false);
    toast.info("Run cancelled");
  };

  const reset = () => {
    setResults({});
    setProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Live runner (demo)</CardTitle>
            <CardDescription>
              Simulates Playwright execution across {queue.length} tests with configurable
              parallelism. Outcomes are deterministic for predictable demos.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">Workers</label>
            <Input
              type="number"
              min={1}
              max={32}
              value={parallelism}
              onChange={(e) =>
                setParallelism(Math.min(32, Math.max(1, Number(e.target.value) || 1)))
              }
              className="w-16"
              disabled={running}
            />
            {!running ? (
              <Button onClick={start} data-testid="run-all" className="shadow-elegant">
                <Play className="mr-1 h-3 w-3" /> Run {queue.length} tests
              </Button>
            ) : (
              <Button variant="destructive" onClick={stop}>
                <Square className="mr-1 h-3 w-3" /> Stop
              </Button>
            )}
            <Button variant="ghost" onClick={reset} disabled={running}>
              <RefreshCw className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            label={ALL}
            count={TOTAL_TESTS}
            active={category === ALL}
            onClick={() => !running && setCategory(ALL)}
          />
          {PLAYWRIGHT_CATEGORIES.map((c) => (
            <CategoryChip
              key={c.name}
              label={c.name}
              count={c.count}
              active={category === c.name}
              onClick={() => !running && setCategory(c.name)}
              styleKey={c.name}
            />
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatCard label="Progress" value={`${progress}%`} accent="primary" />
          <StatCard label="Pass" value={counts.pass} accent="success" />
          <StatCard label="Flaky" value={counts.flaky} accent="warning" />
          <StatCard label="Fail" value={counts.fail} accent="destructive" />
          <StatCard label="Skipped" value={counts.skipped} accent="muted" />
        </div>

        <Progress value={progress} className="h-2" />

        {/* Mini-grid heatmap */}
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Test grid ({queue.length})
          </h4>
          <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-2">
            {queue.map((t) => {
              const st = results[t.id] ?? "idle";
              return (
                <span
                  key={t.id}
                  title={`${t.id} — ${t.title}`}
                  className={cn(
                    "h-3 w-3 rounded-sm transition-colors",
                    st === "pass" && "bg-emerald-500",
                    st === "fail" && "bg-destructive",
                    st === "flaky" && "bg-amber-500",
                    st === "skipped" && "bg-muted-foreground/40",
                    st === "running" && "bg-primary animate-pulse",
                    st === "queued" && "bg-muted-foreground/20",
                    st === "idle" && "bg-muted",
                  )}
                />
              );
            })}
          </div>
        </div>

        <ScrollArea className="h-[420px] rounded-lg border">
          <ul className="divide-y">
            {queue.map((t) => {
              const st = results[t.id] ?? "idle";
              const s = CATEGORY_STYLES[t.category];
              return (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 text-sm transition-colors",
                    st === "running" && "bg-primary/5",
                    st === "pass" && "bg-emerald-500/5",
                    st === "fail" && "bg-destructive/5",
                  )}
                  data-testid={`runner-row-${t.id}`}
                >
                  <StatusIcon status={st} pulse={st === "running"} />
                  <span className="font-mono text-[10px] text-muted-foreground w-20 shrink-0">
                    {t.id}
                  </span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      s.dot,
                    )}
                    title={t.category}
                  />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                    {st === "idle" ? "—" : labelFor(st)}
                  </span>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ---------- shared bits ---------- */

function ExpectedDot({ status }: { status: TestStatus }) {
  const cls =
    status === "pass"
      ? "bg-emerald-500"
      : status === "fail"
        ? "bg-destructive"
        : status === "flaky"
          ? "bg-amber-500"
          : "bg-muted-foreground";
  return <span className={cn("h-2 w-2 rounded-full shrink-0", cls)} aria-hidden />;
}

function StatusIcon({ status, pulse }: { status: RunStatus; pulse?: boolean }) {
  const wrap = (node: React.ReactNode, color?: string) => (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full",
        pulse && color && "animate-pulse-ring",
      )}
    >
      {node}
    </span>
  );
  switch (status) {
    case "pass":
      return wrap(<CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />);
    case "fail":
      return wrap(<XCircle className="h-4 w-4 text-destructive shrink-0" />);
    case "flaky":
      return wrap(<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />);
    case "skipped":
      return wrap(<CircleDashed className="h-4 w-4 text-muted-foreground shrink-0" />);
    case "running":
      return wrap(<Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />, "primary");
    case "queued":
      return wrap(<CircleDashed className="h-4 w-4 text-muted-foreground/60 shrink-0" />);
    default:
      return wrap(<CircleDashed className="h-4 w-4 text-muted-foreground/40 shrink-0" />);
  }
}

function labelFor(s: RunStatus): string {
  return {
    pass: "Pass",
    fail: "Fail",
    flaky: "Flaky",
    skipped: "Skipped",
    running: "Running",
    queued: "Queued",
    idle: "Idle",
  }[s];
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: "primary" | "success" | "warning" | "destructive" | "muted";
}) {
  const accentMap: Record<typeof accent, string> = {
    primary: "from-primary/15 to-primary/5 text-primary border-primary/30",
    success: "from-emerald-500/15 to-emerald-500/5 text-emerald-500 border-emerald-500/30",
    warning: "from-amber-500/15 to-amber-500/5 text-amber-500 border-amber-500/30",
    destructive: "from-destructive/15 to-destructive/5 text-destructive border-destructive/30",
    muted: "from-muted to-muted/50 text-muted-foreground border-border",
  };
  return (
    <div className={cn("rounded-lg border bg-gradient-to-br p-3", accentMap[accent])}>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Sparkles;
  title: string;
  desc: string;
}) {
  return (
    <Card
      className="group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-elegant"
      data-testid={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
      <CardHeader className="relative">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-white shadow-md">
            <Icon className="h-4 w-4" />
          </div>
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}

function Donut({
  total,
  segments,
  size = 120,
  thickness = 14,
}: {
  total: number;
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={thickness}
          fill="none"
        />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circumference;
          const dasharray = `${len} ${circumference - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              fill="none"
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{total}</span>
        <span className="text-[10px] uppercase text-muted-foreground">tests</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono">{value}</span>
    </div>
  );
}
