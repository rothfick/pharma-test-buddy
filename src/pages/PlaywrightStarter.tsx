import { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { E2ETestsTab, E2E_TOTAL_TESTS } from "@/components/playwright/E2ETestsTab";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  Monitor,
  Maximize2,
  Minimize2,
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
import { LiveBrowser, type HighlightRect } from "@/components/playwright/LiveBrowser";
import { LiveDriver, type DriverEvent } from "@/lib/live-driver";
import { buildScenario } from "@/lib/live-scenarios";
import { snapshotTasks, rollbackTasks } from "@/lib/live-rollback";
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
          <TabsTrigger value="e2e" data-testid="tab-e2e">
            E2E Tests ({E2E_TOTAL_TESTS})
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

        <TabsContent value="e2e" className="space-y-4 animate-fade-in">
          <E2ETestsTab />
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

  // If the currently selected test isn't in the filtered list, fall back to the first match
  const selectedInFiltered = filtered.find((t) => t.id === selectedId);
  const selected = selectedInFiltered ?? filtered[0] ?? PLAYWRIGHT_TESTS[0];
  useEffect(() => {
    if (!selectedInFiltered && filtered[0]) setSelectedId(filtered[0].id);
  }, [selectedInFiltered, filtered]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_1fr]">
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
              "flex flex-col space-y-1.5 p-6 border-b bg-gradient-to-r text-white bg-accent border-muted-foreground shadow-none",
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
            <RunWithPreview test={selected} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RunWithPreview({ test }: { test: PwTest }) {
  const [activeStep, setActiveStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [screenshotLabel, setScreenshotLabel] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string>("about:blank");
  const [rollbackInfo, setRollbackInfo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const cancelRef = useRef({ current: false });
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const driverRef = useRef<LiveDriver | null>(null);

  const scenario = useMemo(() => buildScenario(test), [test]);

  // Reset on test change
  useEffect(() => {
    cancelRef.current.current = true;
    setActiveStep(-1);
    setRunning(false);
    setResult(null);
    setHighlight(null);
    setCursor(null);
    setScreenshotLabel(null);
    setRollbackInfo(null);
  }, [test.id]);

  const onIframeReady = (el: HTMLIFrameElement) => {
    iframeRef.current = el;
  };

  const handleEvent = (e: DriverEvent) => {
    switch (e.type) {
      case "step-start":
        if (e.cmd?.kind === "goto") {
          setFlashKey((k) => k + 1);
        }
        break;
      case "step-end":
        // handled per command index in run loop
        break;
      case "highlight":
        if (e.rect) setHighlight(e.rect);
        break;
      case "cursor":
        if (e.rect) setCursor({ x: e.rect.x, y: e.rect.y });
        break;
      case "screenshot":
        setScreenshotLabel(e.label ?? null);
        setFlashKey((k) => k + 1);
        window.setTimeout(() => setScreenshotLabel(null), 900);
        break;
      case "url":
        if (e.url) setIframeUrl(e.url);
        break;
      case "log":
        // surfaced via run loop log
        break;
    }
  };

  const run = async () => {
    if (!iframeRef.current) {
      toast.error("Live preview not ready yet");
      return;
    }
    setExpanded(true);
    cancelRef.current = { current: false };
    setRunning(true);
    setResult({ status: "running", completedSteps: 0, totalSteps: test.steps.length, log: [] });
    setActiveStep(0);
    setHighlight(null);
    setCursor(null);

    // Snapshot first if scenario mutates
    let snap = null;
    if (scenario.mutates) {
      try {
        snap = await snapshotTasks();
      } catch (e) {
        console.warn("snapshot failed", e);
      }
    }

    const driver = new LiveDriver({
      iframe: iframeRef.current,
      origin: window.location.origin,
      onEvent: handleEvent,
      cancelRef: cancelRef.current,
    });
    driverRef.current = driver;

    const log: string[] = [];
    const t0 = performance.now();

    // Track which scenario step we're on based on cmd index ranges
    const stepRanges = scenario.stepRanges;
    let currentStepIdx = 0;
    let firstFailureStep: number | null = null;

    // We run commands one-by-one to update activeStep accurately
    let outcomeStatus: TestStatus = "pass";
    for (let i = 0; i < scenario.cmds.length; i++) {
      if (cancelRef.current.current) break;

      // advance step pointer
      while (currentStepIdx < stepRanges.length && i > stepRanges[currentStepIdx].end) {
        currentStepIdx++;
      }
      if (
        currentStepIdx < stepRanges.length &&
        i >= stepRanges[currentStepIdx].start &&
        i <= stepRanges[currentStepIdx].end
      ) {
        setActiveStep(currentStepIdx);
      }

      const cmd = scenario.cmds[i];
      try {
        await driver.runOne(cmd);
        if (cmd.kind !== "log" && cmd.kind !== "wait") {
          log.push(`✓ ${describeCmd(cmd)}`);
        }
      } catch (err) {
        const msg = (err as Error).message;
        log.push(`✗ ${describeCmd(cmd)} — ${msg}`);
        outcomeStatus = "fail";
        firstFailureStep = currentStepIdx;
        break;
      }

      // mark completed step on the boundary
      if (currentStepIdx < stepRanges.length && i === stepRanges[currentStepIdx].end) {
        setResult((r) =>
          r
            ? {
                ...r,
                completedSteps: currentStepIdx + 1,
                durationMs: Math.round(performance.now() - t0),
                log: [...log],
              }
            : r,
        );
      }
    }

    const elapsed = Math.round(performance.now() - t0);

    // Rollback
    if (snap) {
      try {
        const rb = await rollbackTasks(snap);
        const summary = `rollback: deleted ${rb.deleted}, restored ${rb.restored}${rb.errors.length ? `, errors: ${rb.errors.length}` : ""}`;
        setRollbackInfo(summary);
        log.push(`↺ ${summary}`);
      } catch (e) {
        const msg = (e as Error).message;
        setRollbackInfo(`rollback failed: ${msg}`);
        log.push(`✗ rollback failed: ${msg}`);
      }
    }

    setResult({
      status: cancelRef.current.current ? "skipped" : outcomeStatus,
      completedSteps: firstFailureStep ?? test.steps.length,
      totalSteps: test.steps.length,
      durationMs: elapsed,
      log,
    });
    setRunning(false);
    setHighlight(null);
  };

  const stop = () => {
    cancelRef.current.current = true;
    driverRef.current?.cancel();
    setRunning(false);
  };

  const reset = () => {
    cancelRef.current.current = true;
    setResult(null);
    setActiveStep(-1);
    setHighlight(null);
    setCursor(null);
    setRollbackInfo(null);
  };

  const finalStatus = result?.status;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: live iframe preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" /> Live preview (real app)
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {scenario.mutates ? "mutates · auto-rollback" : "read-only"}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                {iframeUrl}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={() => setExpanded((v) => !v)}
                data-testid="toggle-expand-preview"
                aria-label={expanded ? "Minimize preview" : "Maximize preview"}
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/*
            The LiveBrowser is wrapped in a div whose styles flip between
            inline and a fixed-position overlay sized to 75% of the viewport.
            This keeps the same iframe element mounted (driver keeps its ref).
          */}
          {expanded && (
            <div
              className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-fade-in"
              onClick={() => !running && setExpanded(false)}
              data-testid="preview-modal-backdrop"
            />
          )}
          <div
            className={cn(
              expanded
                ? "fixed left-1/2 top-1/2 z-[101] w-[75vw] h-[75vh] -translate-x-1/2 -translate-y-1/2 shadow-2xl rounded-xl overflow-hidden ring-2 ring-primary/40"
                : "relative",
            )}
            data-testid="preview-stage"
          >
            <LiveBrowser
              url={iframeUrl}
              highlight={highlight}
              cursor={cursor}
              flashKey={flashKey}
              screenshotLabel={screenshotLabel}
              recording={running}
              onIframeReady={onIframeReady}
              className={expanded ? "h-full !aspect-auto" : ""}
            />
            {expanded && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute right-3 top-12 z-10 h-7 px-2 shadow"
                onClick={() => setExpanded(false)}
                data-testid="close-preview-modal"
              >
                <Minimize2 className="mr-1 h-3.5 w-3.5" /> Close
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!running ? (
              <Button size="sm" onClick={run} data-testid={`run-${test.id}`} className="shadow-elegant">
                <Play className="mr-1 h-3 w-3" /> {result ? "Replay on live app" : "Run on live app"}
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stop}>
                <Square className="mr-1 h-3 w-3" /> Stop
              </Button>
            )}
            {result && !running && (
              <Button size="sm" variant="ghost" onClick={reset}>
                <RefreshCw className="mr-1 h-3 w-3" /> Reset
              </Button>
            )}
            {result?.durationMs !== undefined && (
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                {(result.durationMs / 1000).toFixed(2)}s · {result.completedSteps}/
                {result.totalSteps} steps
              </span>
            )}
          </div>
          {finalStatus && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                finalStatus === "pass" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                finalStatus === "fail" && "border-destructive/40 bg-destructive/10 text-destructive",
                finalStatus === "flaky" && "border-amber-500/40 bg-amber-500/10 text-amber-700",
                finalStatus === "running" && "border-primary/40 bg-primary/10 text-primary",
                finalStatus === "skipped" && "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
              )}
            >
              <StatusIcon status={finalStatus} pulse={finalStatus === "running"} />
              <span className="font-medium">{labelFor(finalStatus)}</span>
              {rollbackInfo && (
                <span className="ml-auto text-[11px] font-mono opacity-80">{rollbackInfo}</span>
              )}
            </div>
          )}
        </div>

        {/* Right: code + steps */}
        <div className="space-y-3">
          <CodeBlock code={test.code} filename={`tests/${test.id}.spec.ts`} />
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> Execution steps
            </h4>
            <ol className="space-y-1.5 text-sm">
              {test.steps.map((s, i) => {
                const done = result ? i < result.completedSteps : false;
                const current = activeStep === i && running;
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center gap-3 rounded-md border bg-card/50 px-3 py-1.5 transition",
                      current && "border-primary bg-primary/5 shadow-sm",
                      done && !current && "border-emerald-500/30 bg-emerald-500/5",
                    )}
                  >
                    <span className="w-4">
                      {current ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                    </span>
                    <span className="flex-1">{s.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ~{s.ms}ms
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          {result && result.log.length > 0 && (
            <pre className="max-h-40 overflow-auto rounded-md bg-zinc-950 p-2.5 text-[11px] leading-snug text-zinc-200">
              {result.log.join("\n")}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function describeCmd(cmd: import("@/lib/live-driver").Cmd): string {
  switch (cmd.kind) {
    case "goto":
      return `goto ${cmd.path}`;
    case "click":
      return `click ${cmd.selector}`;
    case "fill":
      return `fill ${cmd.selector} = "${cmd.value.length > 24 ? cmd.value.slice(0, 24) + "…" : cmd.value}"`;
    case "expectVisible":
      return `expect(${cmd.selector}).toBeVisible()`;
    case "expectText":
      return `expect(${cmd.selector}).toContainText("${cmd.text}")`;
    case "expectUrl":
      return `expect(page).toHaveURL(${String(cmd.pattern)})`;
    case "expectCount":
      return `expect(${cmd.selector}).toHaveCount(${cmd.min ?? "*"}–${cmd.max ?? "*"})`;
    case "waitForSelector":
      return `waitForSelector(${cmd.selector})`;
    case "wait":
      return `wait ${cmd.ms}ms`;
    case "screenshot":
      return `screenshot ${cmd.label}`;
    case "press":
      return `press(${cmd.key})`;
    case "select":
      return `select(${cmd.selector}, ${cmd.value})`;
    case "evaluate":
      return `page.evaluate(...)`;
    case "scrollIntoView":
      return `scrollIntoView(${cmd.selector})`;
    case "log":
      return cmd.message;
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
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

const CodeBlock = forwardRef<HTMLDivElement, { code: string; filename: string }>(
  function CodeBlock({ code, filename }, ref) {
    const lines = code.replace(/\n$/, "").split("\n");
    return (
      <div
        ref={ref}
        className="overflow-hidden rounded-lg border bg-zinc-950 text-zinc-100 shadow-inner"
      >
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
  },
);

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

/* SingleRunButton replaced by RunWithPreview above */

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
