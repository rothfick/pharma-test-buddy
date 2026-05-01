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
  Zap,
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
} from "lucide-react";
import { toast } from "sonner";
import {
  PLAYWRIGHT_TESTS,
  PLAYWRIGHT_CATEGORIES,
  TOTAL_TESTS,
  type PwTest,
  type TestStatus,
} from "@/lib/playwright-tests";
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
    <div className="space-y-6" data-testid="playwright-starter-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playwright Starter Kit</h1>
        <p className="text-muted-foreground">
          {TOTAL_TESTS} tests across {PLAYWRIGHT_CATEGORIES.length} categories — POM, self-healing
          locators, AI generation, accessibility, visual, performance, security & GxP. Browse the
          full catalog, view real Playwright code, and run a live demo execution.
        </p>
      </div>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                qa-playwright-starter.zip
              </CardTitle>
              <CardDescription>
                {TOTAL_TESTS} tests · TypeScript 5 · Playwright 1.48 · Multi-browser · CI/CD ready
              </CardDescription>
            </div>
            <Button size="lg" onClick={download} disabled={downloading} data-testid="download-zip">
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download ZIP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{TOTAL_TESTS} tests</Badge>
            <Badge variant="secondary">@playwright/test ^1.48</Badge>
            <Badge variant="secondary">@axe-core/playwright</Badge>
            <Badge variant="secondary">k6 perf scripts</Badge>
            <Badge variant="secondary">5 browsers</Badge>
            <Badge variant="secondary">Sharding (4×)</Badge>
          </div>
        </CardContent>
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

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <CatalogTab />
        </TabsContent>

        <TabsContent value="runner" className="space-y-4">
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
        <FeatureCard
          icon={Layers}
          title="Page Object Model"
          desc="BasePage abstraction with smart navigation, LoginPage and DashboardPage examples. Path aliases via tsconfig."
        />
        <FeatureCard
          icon={Shield}
          title="Self-healing locators"
          desc="smartLocator() tries multiple strategies (testId → role → text → CSS) with observability logging."
        />
        <FeatureCard
          icon={Sparkles}
          title="AI test generator"
          desc='npm run ai:gen "User checks out" → generates a complete .spec.ts via Lovable AI Gateway.'
        />
        <FeatureCard
          icon={Eye}
          title="Accessibility (axe-core)"
          desc="WCAG 2.1 AA assertions baked in. Tag with @a11y, run nightly."
        />
        <FeatureCard
          icon={TestTube}
          title="Visual regression"
          desc="Pixel-diff screenshots per browser with maxDiffPixelRatio threshold."
        />
        <FeatureCard
          icon={Activity}
          title="k6 performance scripts"
          desc="Load + stress profiles with thresholds (p95<500ms, error_rate<1%)."
        />
        <FeatureCard
          icon={Workflow}
          title="CI/CD pipelines"
          desc="GitHub Actions sharding (4×) + Azure DevOps multi-browser matrix."
        />
        <FeatureCard
          icon={Zap}
          title="Smart fixtures"
          desc="auth.fixture.ts — pre-authenticated page per role via storageState."
        />
        <FeatureCard
          icon={FileCode}
          title="Tags & test groups"
          desc="@smoke, @regression, @e2e, @a11y, @visual, @perf, @security, @gxp, @chaos, @mobile."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suite composition ({TOTAL_TESTS} tests)</CardTitle>
          <CardDescription>Breakdown per category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PLAYWRIGHT_CATEGORIES.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
              >
                <span>{c.name}</span>
                <Badge variant="outline">{c.count}</Badge>
              </div>
            ))}
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
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
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
          <div className="flex flex-wrap gap-1">
            <CategoryChip
              label={`${ALL} (${TOTAL_TESTS})`}
              active={category === ALL}
              onClick={() => setCategory(ALL)}
            />
            {PLAYWRIGHT_CATEGORIES.map((c) => (
              <CategoryChip
                key={c.name}
                label={`${c.name} (${c.count})`}
                active={category === c.name}
                onClick={() => setCategory(c.name)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} matching</p>
        </CardHeader>
        <ScrollArea className="h-[560px] border-t">
          <ul className="divide-y">
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 px-4 py-2 text-left transition hover:bg-muted/60",
                    selected.id === t.id && "bg-muted",
                  )}
                  data-testid={`test-row-${t.id}`}
                >
                  <div className="flex items-center gap-2">
                    <ExpectedDot status={t.expected} />
                    <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      {t.category}
                    </Badge>
                  </div>
                  <span className="text-sm leading-tight">{t.title}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">No matches</li>
            )}
          </ul>
        </ScrollArea>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{selected.title}</CardTitle>
              <CardDescription>
                <span className="font-mono">{selected.id}</span> · {selected.category}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {selected.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={selected.code} />
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Execution steps
            </h4>
            <ol className="space-y-1 text-sm">
              {selected.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}.</span>
                  <span>{s.label}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
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
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded bg-muted p-4 text-xs leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

function SingleRunButton({ test }: { test: PwTest }) {
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setResult({ status: "running", completedSteps: 0, totalSteps: test.steps.length, log: [] });
    const log: string[] = [];
    let elapsed = 0;
    for (let i = 0; i < test.steps.length; i++) {
      const s = test.steps[i];
      // Scaled-down for snappy UX (10% of declared ms, min 80ms)
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
    // Apply expected outcome to the final state
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

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon status={result?.status ?? "idle"} />
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
          <Button
            size="sm"
            onClick={run}
            disabled={running}
            data-testid={`run-${test.id}`}
          >
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
            className="mt-3 h-1"
          />
          <pre className="mt-3 max-h-40 overflow-auto rounded bg-background/60 p-2 text-[11px] leading-snug">
            {result.log.join("\n") || "Starting…"}
          </pre>
        </>
      )}
    </div>
  );
}

/* ---------- Live Runner (batch) ---------- */

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

  useEffect(() => () => {
    cancelRef.current = true;
  }, []);

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
        // Sum of step ms scaled — keeps demo fast (~30-150ms per test)
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
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>Live runner (demo)</CardTitle>
              <CardDescription>
                Simulates Playwright execution across {queue.length} tests with configurable
                parallelism. Outcomes are deterministic so you can demo expected pass / fail /
                flaky distribution.
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
                <Button onClick={start} data-testid="run-all">
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
          <div className="flex flex-wrap gap-1">
            <CategoryChip
              label={`${ALL} (${TOTAL_TESTS})`}
              active={category === ALL}
              onClick={() => !running && setCategory(ALL)}
            />
            {PLAYWRIGHT_CATEGORIES.map((c) => (
              <CategoryChip
                key={c.name}
                label={`${c.name} (${c.count})`}
                active={category === c.name}
                onClick={() => !running && setCategory(c.name)}
              />
            ))}
          </div>

          <div>
            <Progress value={progress} className="h-2" />
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Progress: {progress}%</span>
              <Stat label="Pass" value={counts.pass} className="text-emerald-500" />
              <Stat label="Fail" value={counts.fail} className="text-destructive" />
              <Stat label="Flaky" value={counts.flaky} className="text-amber-500" />
              <Stat label="Skipped" value={counts.skipped} className="text-muted-foreground" />
              <Stat label="Running" value={counts.running} className="text-primary" />
            </div>
          </div>

          <ScrollArea className="h-[480px] rounded border">
            <ul className="divide-y">
              {queue.map((t) => {
                const st = results[t.id] ?? "idle";
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm"
                    data-testid={`runner-row-${t.id}`}
                  >
                    <StatusIcon status={st} />
                    <span className="font-mono text-[10px] text-muted-foreground w-20 shrink-0">
                      {t.id}
                    </span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px] shrink-0">
                      {t.category}
                    </Badge>
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
    </>
  );
}

/* ---------- helpers ---------- */

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

function StatusIcon({ status }: { status: RunStatus }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "fail":
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    case "flaky":
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case "skipped":
      return <CircleDashed className="h-4 w-4 text-muted-foreground shrink-0" />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
    case "queued":
      return <CircleDashed className="h-4 w-4 text-muted-foreground/60 shrink-0" />;
    default:
      return <CircleDashed className="h-4 w-4 text-muted-foreground/40 shrink-0" />;
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

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("font-mono", className)}>
      {label}: {value}
    </span>
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
    <Card data-testid={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
