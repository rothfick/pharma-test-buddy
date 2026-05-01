import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDashed,
  FileCode2,
  FlaskConical,
  Play,
  Square,
  RotateCcw,
  Terminal,
  Eraser,
} from "lucide-react";
import {
  E2E_CASES,
  E2E_TOTAL,
  runE2E,
  type E2ECase,
  type E2EStatus,
  type E2EEvent,
  type RunHandle,
} from "@/lib/e2e-runner";

const FILES = Array.from(
  E2E_CASES.reduce((map, c) => {
    if (!map.has(c.file)) map.set(c.file, []);
    map.get(c.file)!.push(c);
    return map;
  }, new Map<string, E2ECase[]>()).entries(),
);

const FILE_META: Record<string, { scope: string; description: string }> = {
  "live-driver.test.ts": {
    scope: "LiveDriver (in-browser DOM driver)",
    description:
      "Silnik sterujący iframem: selektory, kliknięcia, fill, asercje, cancel i screenshoty.",
  },
  "live-scenarios.test.ts": {
    scope: "Mapowanie 224 testów → komendy DOM",
    description:
      "Sprawdza, że każdy test z katalogu zostaje przetłumaczony na poprawną sekwencję komend.",
  },
  "playwright-starter-preview.test.tsx": {
    scope: "Modal Live Preview (75% overlay)",
    description:
      "Testy UI strony /playwright-starter — uruchamiane wyłącznie w Vitest (CI).",
  },
};

interface LogLine {
  caseId: string;
  text: string;
  kind: "info" | "pass" | "fail" | "skip" | "system";
  ts: number;
}

export function E2ETestsTab() {
  const [statuses, setStatuses] = useState<Record<string, E2EStatus>>({});
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const handleRef = useRef<RunHandle | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const counts = useMemo(() => {
    let pass = 0,
      fail = 0,
      skipped = 0,
      runningC = 0;
    for (const c of E2E_CASES) {
      const s = statuses[c.id];
      if (s === "pass") pass++;
      else if (s === "fail") fail++;
      else if (s === "skipped") skipped++;
      else if (s === "running") runningC++;
    }
    return { pass, fail, skipped, running: runningC, total: E2E_TOTAL };
  }, [statuses]);

  const completed = counts.pass + counts.fail + counts.skipped;
  const progress = Math.round((completed / E2E_TOTAL) * 100);

  function pushLog(line: LogLine) {
    setLogs((prev) => {
      const next = prev.concat(line);
      // cap to 1000 lines
      return next.length > 1000 ? next.slice(next.length - 1000) : next;
    });
  }

  function reset() {
    setStatuses({});
    setDurations({});
    setErrors({});
    setLogs([]);
  }

  function runAll(only?: E2ECase[]) {
    if (running) return;
    reset();
    setRunning(true);
    pushLog({
      caseId: "",
      text: `▶ Running ${only?.length ?? E2E_TOTAL} E2E test${(only?.length ?? E2E_TOTAL) === 1 ? "" : "s"}…`,
      kind: "system",
      ts: Date.now(),
    });
    const h = runE2E({
      cases: only,
      onEvent: (e: E2EEvent) => {
        if (e.type === "case-start") {
          setStatuses((p) => ({ ...p, [e.caseId]: "running" }));
          const c = E2E_CASES.find((x) => x.id === e.caseId);
          pushLog({
            caseId: e.caseId,
            text: `→ ${c?.file} › ${c?.name}`,
            kind: "info",
            ts: Date.now(),
          });
        } else if (e.type === "log") {
          pushLog({
            caseId: e.caseId,
            text: `   ${e.message}`,
            kind: "info",
            ts: Date.now(),
          });
        } else if (e.type === "case-end") {
          setStatuses((p) => ({ ...p, [e.caseId]: e.status ?? "fail" }));
          if (e.durationMs !== undefined)
            setDurations((p) => ({ ...p, [e.caseId]: e.durationMs! }));
          if (e.error) setErrors((p) => ({ ...p, [e.caseId]: e.error! }));
          const tag =
            e.status === "pass" ? "✓ PASS" : e.status === "skipped" ? "○ SKIP" : "✗ FAIL";
          pushLog({
            caseId: e.caseId,
            text: `${tag} (${e.durationMs ?? 0}ms)${e.error ? ` — ${e.error}` : ""}`,
            kind:
              e.status === "pass" ? "pass" : e.status === "skipped" ? "skip" : "fail",
            ts: Date.now(),
          });
        }
      },
    });
    handleRef.current = h;
    h.done.finally(() => {
      setRunning(false);
      pushLog({
        caseId: "",
        text: `■ Run complete`,
        kind: "system",
        ts: Date.now(),
      });
    });
  }

  function stop() {
    handleRef.current?.cancel();
  }

  return (
    <div className="space-y-4" data-testid="e2e-tests-tab">
      {/* Header / Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                End-to-End Tests
              </CardTitle>
              <CardDescription>
                {E2E_TOTAL} testów Vitest — pokrywają live driver, mapowanie scenariuszy i UI modala.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!running ? (
                <Button
                  size="sm"
                  onClick={() => runAll()}
                  data-testid="e2e-run-all"
                  className="shadow-elegant"
                >
                  <Play className="mr-1 h-3.5 w-3.5" /> Run all
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={stop}
                  data-testid="e2e-stop"
                >
                  <Square className="mr-1 h-3.5 w-3.5" /> Stop
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                disabled={running}
                data-testid="e2e-reset"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="Total" value={E2E_TOTAL} tone="muted" />
            <Stat label="Pass" value={counts.pass} tone="success" />
            <Stat label="Fail" value={counts.fail} tone="destructive" />
            <Stat label="Skipped" value={counts.skipped} tone="warning" />
            <Stat label="Progress" value={`${progress}%`} tone="primary" />
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Live log */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Terminal className="h-4 w-4 text-primary" /> Live log
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLogs([])}
              disabled={running}
              className="h-7 px-2 text-xs"
            >
              <Eraser className="mr-1 h-3 w-3" /> Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={logRef}
            className="h-56 overflow-auto rounded-md border bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-zinc-200"
            data-testid="e2e-log"
          >
            {logs.length === 0 ? (
              <p className="text-zinc-500">Naciśnij "Run all" aby uruchomić testy E2E w przeglądarce.</p>
            ) : (
              logs.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "whitespace-pre-wrap",
                    l.kind === "pass" && "text-emerald-400",
                    l.kind === "fail" && "text-red-400",
                    l.kind === "skip" && "text-amber-400",
                    l.kind === "system" && "text-primary",
                  )}
                >
                  {l.text}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files + per-case status */}
      {FILES.map(([file, cases]) => {
        const meta = FILE_META[file];
        return (
          <Card key={file}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileCode2 className="h-4 w-4 text-primary" />
                    {file}
                  </CardTitle>
                  <CardDescription>{meta?.scope}</CardDescription>
                  <p className="text-xs text-muted-foreground">{meta?.description}</p>
                  <code className="text-xs text-muted-foreground">src/test/{file}</code>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{cases.length} tests</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => runAll(cases)}
                    disabled={running}
                    className="h-7 px-2 text-xs"
                  >
                    <Play className="mr-1 h-3 w-3" /> Run file
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-72">
                <ul className="space-y-2 pr-2">
                  {cases.map((c) => {
                    const st = statuses[c.id] ?? "idle";
                    const dur = durations[c.id];
                    const err = errors[c.id];
                    return (
                      <li
                        key={c.id}
                        className={cn(
                          "rounded-md border bg-card p-3 transition-colors",
                          st === "running" && "border-primary/40 bg-primary/5",
                          st === "pass" && "border-emerald-500/30 bg-emerald-500/5",
                          st === "fail" && "border-destructive/40 bg-destructive/5",
                          st === "skipped" && "border-amber-500/30 bg-amber-500/5",
                        )}
                        data-testid={`e2e-case-${c.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <CaseIcon status={st} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{c.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{c.intent}</p>
                            {err && (
                              <p className="mt-1 break-words font-mono text-[11px] text-destructive">
                                {err}
                              </p>
                            )}
                          </div>
                          {dur !== undefined && (
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                              {dur}ms
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CaseIcon({ status }: { status: E2EStatus }) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />;
    case "fail":
      return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
    case "skipped":
      return <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />;
    case "running":
      return <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />;
    default:
      return <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />;
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
  const toneCls = {
    success: "text-emerald-600",
    destructive: "text-destructive",
    warning: "text-amber-600",
    primary: "text-primary",
    muted: "text-foreground",
  }[tone];
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold", toneCls)}>{value}</p>
    </div>
  );
}

export const E2E_TOTAL_TESTS = E2E_TOTAL;
