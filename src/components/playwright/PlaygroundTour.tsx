// Long "Playground Tour" — clicks through every nested option in every QA
// Playground subpage, live, inside a real iframe of the app, with optional
// MediaRecorder capture saved as a downloadable WebM/MP4. Always wraps the run
// in a tasks snapshot/rollback so even mutating actions leave no residue.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Play,
  Square,
  Maximize2,
  Minimize2,
  Download,
  Video,
  CircleDot,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDashed,
  Compass,
  ShieldCheck,
} from "lucide-react";
import { LiveBrowser, type HighlightRect } from "@/components/playwright/LiveBrowser";
import { LiveDriver, type DriverEvent } from "@/lib/live-driver";
import { snapshotTasks, rollbackTasks } from "@/lib/live-rollback";
import {
  PLAYGROUND_TOUR,
  TOUR_TOTAL_STEPS,
  
  CATALOG_SUITE_STEPS,
  CATALOG_SUITE_TOTAL,
  FULL_SUITE_STEPS,
  FULL_SUITE_TOTAL_STEPS,
  FULL_SUITE_TOTAL_CMDS,
  STEP_CATEGORIES,
  type StepCategory,
  type TourStep,
} from "@/lib/playground-tour";
import { CATEGORY_STYLES } from "@/lib/playwright-categories";
import { Compass as CompassIcon } from "lucide-react";
import { ScreenRecorder, type RecorderResult } from "@/lib/screen-recorder";

type StepStatus = "idle" | "running" | "pass" | "fail" | "skipped";

interface LogLine {
  text: string;
  kind: "info" | "pass" | "fail" | "system" | "rollback";
  ts: number;
}

const PAGE_LABELS: Record<string, string> = {
  "/auth": "Sign-in",
  "/playground": "Overview",
  "/playground/interactions": "UI interactions",
  "/playground/async": "Async & race",
  "/playground/files": "Files & media",
  "/playground/security": "Auth & security",
  "/playground/a11y": "A11y & i18n",
  "/playground/legacy": "Legacy targets",
  "/compliance": "Compliance — Overview",
  "/compliance/audit-trail": "Compliance — Audit Trail",
  "/compliance/e-signatures": "Compliance — E-Signatures",
  "/compliance/data-integrity": "Compliance — ALCOA+",
  "/compliance/validation": "Compliance — IQ/OQ/PQ",
  __catalog__: `Test Catalog (${CATALOG_SUITE_TOTAL})`,
};

export function PlaygroundTour() {
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [iframeUrl, setIframeUrl] = useState("/auth");
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [shotLabel, setShotLabel] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [statuses, setStatuses] = useState<Record<number, StepStatus>>({});
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [recordEnabled, setRecordEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recResult, setRecResult] = useState<RecorderResult | null>(null);
  const [recError, setRecError] = useState<string | null>(null);
  const [rollbackInfo, setRollbackInfo] = useState<string | null>(null);
  const [recElapsed, setRecElapsed] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const driverRef = useRef<LiveDriver | null>(null);
  const cancelRef = useRef<{ current: boolean }>({ current: false });
  const recorderRef = useRef<ScreenRecorder | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  // Recording elapsed timer.
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setRecElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const completed = useMemo(() => {
    let n = 0;
    for (let i = 0; i < FULL_SUITE_TOTAL_STEPS; i++) {
      const s = statuses[i];
      if (s === "pass" || s === "fail" || s === "skipped") n++;
    }
    return n;
  }, [statuses]);
  const progress = Math.round((completed / FULL_SUITE_TOTAL_STEPS) * 100);

  const counts = useMemo(() => {
    let pass = 0, fail = 0, skipped = 0;
    for (const v of Object.values(statuses)) {
      if (v === "pass") pass++;
      else if (v === "fail") fail++;
      else if (v === "skipped") skipped++;
    }
    return { pass, fail, skipped };
  }, [statuses]);

  // Per-category live counters for the "Category strip" shown above the
  // preview. Order matches the user's request (API, Smoke, Regression,
  // Chaos, Security, Performance) with the rest appended after.
  const PRIMARY_CATEGORIES: StepCategory[] = [
    "Smoke",
    "API",
    "Regression",
    "Chaos / Resilience",
    "Security",
    "Performance",
  ];
  const SECONDARY_CATEGORIES: StepCategory[] = [
    "Auth & MFA",
    "E2E Journeys",
    "Accessibility",
    "Visual",
    "Mobile",
    "Compliance (21 CFR Part 11)",
    "Tour" as StepCategory,
  ];

  const categoryStats = useMemo(() => {
    const init = () => ({ total: 0, pass: 0, fail: 0, running: 0, skipped: 0, idle: 0 });
    const map = new Map<StepCategory, ReturnType<typeof init>>();
    for (let i = 0; i < FULL_SUITE_TOTAL_STEPS; i++) {
      const cat = STEP_CATEGORIES[i] ?? ("Tour" as StepCategory);
      if (!map.has(cat)) map.set(cat, init());
      const bucket = map.get(cat)!;
      bucket.total++;
      const st = statuses[i];
      if (st === "pass") bucket.pass++;
      else if (st === "fail") bucket.fail++;
      else if (st === "running") bucket.running++;
      else if (st === "skipped") bucket.skipped++;
      else bucket.idle++;
    }
    return map;
  }, [statuses]);

  const activeCategory: StepCategory | null =
    activeIdx >= 0 ? STEP_CATEGORIES[activeIdx] ?? null : null;


  function pushLog(line: Omit<LogLine, "ts">) {
    setLogs((prev) => {
      const next = prev.concat({ ...line, ts: Date.now() });
      return next.length > 1500 ? next.slice(next.length - 1500) : next;
    });
  }

  function reset() {
    cancelRef.current.current = true;
    driverRef.current?.cancel();
    setStatuses({});
    setActiveIdx(-1);
    setHighlight(null);
    setCursor(null);
    setShotLabel(null);
    setLogs([]);
    setRecResult(null);
    setRecError(null);
    setRollbackInfo(null);
    setRecElapsed(0);
  }

  async function start() {
    if (running) return;
    reset();
    setRunning(true);
    setExpanded(true); // auto-expand the live preview to 75%
    cancelRef.current = { current: false };
    pushLog({ text: `▶ Full suite starting — ${TOUR_TOTAL_STEPS} tour steps + ${CATALOG_SUITE_TOTAL} catalog tests = ${FULL_SUITE_TOTAL_STEPS} steps / ${FULL_SUITE_TOTAL_CMDS} commands`, kind: "system" });

    // ── Recording must start FIRST, synchronously from the click, so that
    // browsers without iframe.captureStream (Safari/Firefox) can fall back to
    // getDisplayMedia() which requires an active user gesture.
    if (recordEnabled) {
      try {
        const rec = new ScreenRecorder();
        await rec.start({
          iframe: iframeRef.current,
          allowDisplayMediaFallback: true,
        });
        recorderRef.current = rec;
        setRecording(true);
        pushLog({ text: "🎥 Recording started", kind: "system" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRecError(msg);
        pushLog({ text: `⚠ Recording skipped: ${msg}`, kind: "system" });
      }
    }

    // Snapshot for rollback (after recording so the gesture isn't consumed first).
    pushLog({ text: "📸 Snapshotting tasks for rollback…", kind: "system" });
    const snap = await snapshotTasks();
    if (snap) pushLog({ text: `   captured ${snap.rows.length} task rows`, kind: "info" });
    else pushLog({ text: "   no snapshot (not authenticated or no tasks)", kind: "info" });


    // Navigate iframe to first page (sign-in) so the LiveDriver has something to attach to.
    setIframeUrl("/auth");
    await new Promise((r) => setTimeout(r, 800));

    if (!iframeRef.current) {
      pushLog({ text: "✗ iframe not mounted", kind: "fail" });
      setRunning(false);
      return;
    }

    const driver = new LiveDriver({
      iframe: iframeRef.current,
      origin: window.location.origin,
      cancelRef: cancelRef.current,
      defaultTimeoutMs: 12000,
      onEvent: handleDriverEvent,
    });
    driverRef.current = driver;

    const t0 = performance.now();
    let firstFailure = -1;

    for (let i = 0; i < FULL_SUITE_STEPS.length; i++) {
      if (cancelRef.current.current) break;
      const step = FULL_SUITE_STEPS[i];
      setActiveIdx(i);
      setStatuses((p) => ({ ...p, [i]: "running" }));
      pushLog({
        text: `→ [${i + 1}/${FULL_SUITE_TOTAL_STEPS}] ${PAGE_LABELS[step.page] ?? step.page} · ${step.label}`,
        kind: "info",
      });

      // Reflect goto URL changes in the chrome bar immediately.
      const goto = step.cmds.find((c) => c.kind === "goto") as { kind: "goto"; path: string } | undefined;
      if (goto) setIframeUrl(goto.path);

      const r = await driver.runAll(step.cmds);
      if (cancelRef.current.current) {
        setStatuses((p) => ({ ...p, [i]: "skipped" }));
        pushLog({ text: "   ○ cancelled", kind: "fail" });
        break;
      }
      if (r.ok) {
        setStatuses((p) => ({ ...p, [i]: "pass" }));
        pushLog({ text: "   ✓ done", kind: "pass" });
      } else {
        if (firstFailure === -1) firstFailure = i;
        setStatuses((p) => ({ ...p, [i]: "fail" }));
        pushLog({
          text: `   ✗ failed: ${r.error ?? "unknown"} (cmd #${(r.failedAt ?? 0) + 1})`,
          kind: "fail",
        });
        // Continue with the next step instead of aborting the whole tour —
        // a missing element on one page shouldn't kill the demo.
      }
    }

    const elapsed = Math.round((performance.now() - t0) / 100) / 10;
    pushLog({ text: `■ Tour finished in ${elapsed}s`, kind: "system" });

    // Rollback.
    if (snap) {
      try {
        const rb = await rollbackTasks(snap);
        const summary = `rollback: deleted ${rb.deleted}, restored ${rb.restored}${rb.errors.length ? `, errors ${rb.errors.length}` : ""}`;
        setRollbackInfo(summary);
        pushLog({ text: `↺ ${summary}`, kind: "rollback" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRollbackInfo(`rollback failed: ${msg}`);
        pushLog({ text: `✗ rollback failed: ${msg}`, kind: "fail" });
      }
    }

    // Stop recording.
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try {
        const result = await recorderRef.current.stop();
        setRecResult(result);
        const mb = (result.sizeBytes / 1024 / 1024).toFixed(2);
        pushLog({
          text: `🎬 Recording saved (${mb} MB · ${result.extension.toUpperCase()})`,
          kind: "system",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRecError(msg);
        pushLog({ text: `✗ recording stop failed: ${msg}`, kind: "fail" });
      }
      setRecording(false);
    }

    setRunning(false);
    setActiveIdx(-1);
    setExpanded(false); // auto-close the live preview when the tour ends
  }

  function handleDriverEvent(e: DriverEvent) {
    if (e.type === "highlight" && e.rect) {
      setHighlight(e.rect);
      // Anchor cursor near the centre of the rect.
      setCursor({ x: e.rect.x + e.rect.w / 2, y: e.rect.y + e.rect.h / 2 });
    } else if (e.type === "screenshot") {
      setShotLabel(e.label ?? null);
      setFlashKey((k) => k + 1);
      window.setTimeout(() => setShotLabel(null), 1100);
    } else if (e.type === "url" && e.url) {
      setIframeUrl(e.url);
    } else if (e.type === "log" && e.message) {
      pushLog({ text: `   · ${e.message}`, kind: "info" });
    }
  }

  function stop() {
    cancelRef.current.current = true;
    driverRef.current?.cancel();
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.cancel();
    }
    setRecording(false);
    setRunning(false);
    setExpanded(false);
  }

  // Group steps by page for the right-hand panel.
  // Catalog suite gets its own dedicated group so the 224 tests don't drown
  // out the playground sections in the side panel.
  const groupedSteps = useMemo(() => {
    const map = new Map<string, { idx: number; step: TourStep }[]>();
    PLAYGROUND_TOUR.forEach((step, idx) => {
      if (!map.has(step.page)) map.set(step.page, []);
      map.get(step.page)!.push({ idx, step });
    });
    const tourPart = Array.from(map.entries());
    const catalog = CATALOG_SUITE_STEPS.map((step, j) => ({
      idx: PLAYGROUND_TOUR.length + j,
      step,
    }));
    return [...tourPart, ["__catalog__", catalog] as [string, typeof catalog]];
  }, []);

  return (
    <div className="space-y-4" data-testid="playground-tour">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Playground Tour
              </CardTitle>
              <CardDescription>
                Przeklikuje wszystkie {TOUR_TOTAL_STEPS} sekcji Playground + uruchamia {CATALOG_SUITE_TOTAL} testów z Test Catalog
                w iframe (75% widoku po starcie). Cała sesja jest opcjonalnie nagrywana do pliku.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={recordEnabled}
                  onChange={(e) => setRecordEnabled(e.target.checked)}
                  disabled={running}
                  data-testid="tour-record-toggle"
                />
                <Video className="h-3 w-3" /> Record
              </label>
              {!running ? (
                <Button size="sm" onClick={start} data-testid="tour-start" className="shadow-elegant">
                  <Play className="mr-1 h-3.5 w-3.5" /> Start tour
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={stop} data-testid="tour-stop">
                  <Square className="mr-1 h-3.5 w-3.5" /> Stop
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="Steps" value={FULL_SUITE_TOTAL_STEPS} tone="muted" />
            <Stat label="Done" value={completed} tone="primary" />
            <Stat label="Pass" value={counts.pass} tone="success" />
            <Stat label="Fail" value={counts.fail} tone="destructive" />
            <Stat label="Progress" value={`${progress}%`} tone="primary" />
          </div>
          <Progress value={progress} className="h-2" />

          {/* Live category strip — pokazuje na żywo postęp w kategoriach
              testów (Smoke, API, Regression, Chaos, Security, Performance, …)
              w trakcie trwania Playground Tour. */}
          <div className="space-y-2" data-testid="tour-category-strip">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Test categories — live
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PRIMARY_CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat}
                  category={cat}
                  stats={categoryStats.get(cat) ?? { total: 0, pass: 0, fail: 0, running: 0, skipped: 0, idle: 0 }}
                  active={activeCategory === cat}
                />
              ))}
            </div>
            <details className="group">
              <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground">
                + more categories ({SECONDARY_CATEGORIES.length})
              </summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SECONDARY_CATEGORIES.map((cat) => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    stats={categoryStats.get(cat) ?? { total: 0, pass: 0, fail: 0, running: 0, skipped: 0, idle: 0 }}
                    active={activeCategory === cat}
                  />
                ))}
              </div>
            </details>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Auto-rollback
            </Badge>
            {recording && (
              <Badge variant="destructive" className="gap-1">
                <CircleDot className="h-3 w-3 animate-pulse" /> REC {Math.floor(recElapsed / 60)}:
                {String(recElapsed % 60).padStart(2, "0")}
              </Badge>
            )}
            {rollbackInfo && <span className="font-mono">{rollbackInfo}</span>}
            {recError && (
              <span className="text-destructive">⚠ {recError}</span>
            )}
          </div>
          {recResult && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3 text-xs">
              <Video className="h-4 w-4 text-primary" />
              <span className="font-medium">Recording ready</span>
              <span className="font-mono text-muted-foreground">
                {(recResult.sizeBytes / 1024 / 1024).toFixed(2)} MB ·{" "}
                {(recResult.durationMs / 1000).toFixed(1)}s · {recResult.extension.toUpperCase()}
              </span>
              <a
                href={recResult.url}
                download={`playground-tour.${recResult.extension}`}
                className="ml-auto"
              >
                <Button size="sm" variant="secondary" data-testid="tour-download">
                  <Download className="mr-1 h-3.5 w-3.5" /> Download
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[3fr,2fr]">
        {/* Live preview stage */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Live preview</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">{iframeUrl}</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={() => setExpanded((v) => !v)}
                  data-testid="tour-toggle-expand"
                >
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {expanded && (
              <div
                className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-fade-in"
                onClick={() => !running && setExpanded(false)}
                data-testid="tour-modal-backdrop"
              />
            )}
            <div
              className={cn(
                expanded
                  ? "fixed left-1/2 top-1/2 z-[101] w-[75vw] h-[75vh] -translate-x-1/2 -translate-y-1/2 shadow-2xl rounded-xl overflow-hidden ring-2 ring-primary/40"
                  : "relative",
              )}
              data-testid="tour-stage"
            >
              <LiveBrowser
                url={iframeUrl}
                highlight={highlight}
                cursor={cursor}
                flashKey={flashKey}
                screenshotLabel={shotLabel}
                recording={running}
                onIframeReady={(el) => {
                  iframeRef.current = el;
                  // Initial navigation if iframe is empty.
                  if (el.src === "" || el.src === "about:blank") {
                    el.src = `${window.location.origin}${iframeUrl}`;
                  }
                }}
                className={expanded ? "h-full !aspect-auto" : ""}
              />
              {expanded && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute right-3 top-12 z-10 h-7 px-2 shadow"
                  onClick={() => setExpanded(false)}
                  data-testid="tour-close-modal"
                >
                  <Minimize2 className="mr-1 h-3.5 w-3.5" /> Close
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Steps + log */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Steps ({FULL_SUITE_TOTAL_STEPS})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-3">
                  {groupedSteps.map(([page, items]) => (
                    <div key={page}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {PAGE_LABELS[page] ?? page} · {items.length}
                      </p>
                      <ul className="space-y-1">
                        {items.map(({ idx, step }) => {
                          const st = statuses[idx] ?? "idle";
                          const active = idx === activeIdx;
                          return (
                            <li
                              key={idx}
                              className={cn(
                                "flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-xs transition-colors",
                                active && "border-primary/50 bg-primary/5",
                                st === "pass" && "border-emerald-500/30",
                                st === "fail" && "border-destructive/40 bg-destructive/5",
                              )}
                              data-testid={`tour-step-${idx}`}
                            >
                              <StepIcon status={st} />
                              <span className="font-mono text-[10px] text-muted-foreground w-6 shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{step.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live log</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                ref={logRef}
                className="h-44 overflow-auto rounded-md border bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-zinc-200"
                data-testid="tour-log"
              >
                {logs.length === 0 ? (
                  <p className="text-zinc-500">Naciśnij "Start tour" aby uruchomić demo.</p>
                ) : (
                  logs.map((l, i) => (
                    <div
                      key={i}
                      className={cn(
                        "whitespace-pre-wrap",
                        l.kind === "pass" && "text-emerald-400",
                        l.kind === "fail" && "text-red-400",
                        l.kind === "system" && "text-primary",
                        l.kind === "rollback" && "text-amber-400",
                      )}
                    >
                      {l.text}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />;
    case "fail":
      return <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />;
    case "skipped":
      return <CircleDashed className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
    case "running":
      return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />;
    default:
      return <CircleDashed className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />;
  }
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "success" | "destructive" | "warning" | "primary" | "muted";
}) {
  const cls = {
    success: "text-emerald-600",
    destructive: "text-destructive",
    warning: "text-amber-600",
    primary: "text-primary",
    muted: "text-foreground",
  }[tone];
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold", cls)}>{value}</p>
    </div>
  );
}
