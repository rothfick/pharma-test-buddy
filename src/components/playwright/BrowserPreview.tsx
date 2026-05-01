import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Lock,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  MousePointer2,
} from "lucide-react";
import type { VisualAction, ViewportLayout, VisualPlan } from "@/lib/playwright-visual";

interface Props {
  plan: VisualPlan | null;
  // 0..plan.actions.length — current cursor in the action stream. -1 = idle.
  actionIndex: number;
  // optional override speed factor for the per-action animation
  className?: string;
}

interface CursorState {
  x: number;
  y: number;
  ripple: number; // increments to trigger ripple animation
}

interface FieldState {
  [targetId: string]: string;
}

interface ToastState {
  id: number;
  ok: boolean;
  message: string;
}

const VIEWPORT_RATIO = 9 / 16;

export function BrowserPreview({ plan, actionIndex, className }: Props) {
  const [cursor, setCursor] = useState<CursorState>({ x: 50, y: 50, ripple: 0 });
  const [fields, setFields] = useState<FieldState>({});
  const [url, setUrl] = useState<string>("about:blank");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [waitLabel, setWaitLabel] = useState<string | null>(null);
  const [screenshotLabel, setScreenshotLabel] = useState<string | null>(null);
  const lastIndexRef = useRef(-1);
  const toastTimerRef = useRef<number | null>(null);

  // Reset when a new plan begins
  useEffect(() => {
    setFields({});
    setToast(null);
    setHighlight(null);
    setWaitLabel(null);
    setScreenshotLabel(null);
    lastIndexRef.current = -1;
    if (plan) {
      setUrl(plan.scene.url);
      setCursor({ x: 50, y: 50, ripple: 0 });
    } else {
      setUrl("about:blank");
    }
  }, [plan]);

  // Process actions as actionIndex advances
  useEffect(() => {
    if (!plan) return;
    const start = lastIndexRef.current + 1;
    const end = Math.min(actionIndex, plan.actions.length - 1);
    for (let i = start; i <= end; i++) {
      applyAction(plan.actions[i]);
    }
    lastIndexRef.current = end;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionIndex, plan]);

  function applyAction(a: VisualAction) {
    switch (a.kind) {
      case "navigate":
        setUrl(a.url);
        setFlash((n) => n + 1);
        break;
      case "move":
        setCursor((c) => ({ x: a.x, y: a.y, ripple: c.ripple }));
        break;
      case "click":
        setCursor((c) => ({ x: a.x, y: a.y, ripple: c.ripple + 1 }));
        if (a.targetId) {
          setHighlight(a.targetId);
          window.setTimeout(() => setHighlight((h) => (h === a.targetId ? null : h)), 600);
        }
        break;
      case "type":
        setFields((f) => ({ ...f, [a.targetId]: a.text }));
        break;
      case "assert":
        setToast({ id: Date.now(), ok: a.ok, message: a.message });
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
        break;
      case "screenshot":
        setScreenshotLabel(a.label);
        setFlash((n) => n + 1);
        window.setTimeout(() => setScreenshotLabel(null), 900);
        break;
      case "wait":
        setWaitLabel(a.label);
        window.setTimeout(
          () => setWaitLabel((w) => (w === a.label ? null : w)),
          900,
        );
        break;
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-zinc-950 text-zinc-100 shadow-xl",
        className,
      )}
      style={{ aspectRatio: `${1 / VIEWPORT_RATIO}` }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex items-center gap-1 text-zinc-500">
          <ArrowLeft className="h-3.5 w-3.5" />
          <ArrowRight className="h-3.5 w-3.5" />
          <RefreshCw className="h-3.5 w-3.5" />
        </div>
        <div className="ml-1 flex flex-1 items-center gap-1.5 rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] text-zinc-300">
          <Lock className="h-3 w-3 text-emerald-400" />
          <span className="truncate font-mono">{url}</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">
          chromium · 1280×720
        </div>
      </div>

      {/* Viewport */}
      <div className="relative flex-1 overflow-hidden bg-white text-zinc-900" style={{ height: "calc(100% - 33px)" }}>
        {plan ? (
          <Layout layout={plan.scene.layout} fields={fields} highlight={highlight} />
        ) : (
          <IdleScreen />
        )}

        {/* Flash for navigate / screenshot */}
        <FlashOverlay key={`flash-${flash}`} />

        {/* Wait spinner pill */}
        {waitLabel && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white shadow-md backdrop-blur-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{waitLabel}</span>
          </div>
        )}

        {/* Screenshot label */}
        {screenshotLabel && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 shadow">
            <Camera className="h-3 w-3" />
            <span className="font-mono">{screenshotLabel}</span>
          </div>
        )}

        {/* Toast (assertion) */}
        {toast && (
          <div
            key={toast.id}
            className={cn(
              "absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-md px-3 py-2 text-xs shadow-lg",
              toast.ok
                ? "bg-emerald-500/95 text-white"
                : "bg-destructive/95 text-destructive-foreground",
            )}
            style={{ animation: "fade-in 0.25s ease-out" }}
          >
            {toast.ok ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        )}

        {/* Cursor */}
        {plan && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
              transition: "left 350ms cubic-bezier(0.4,0,0.2,1), top 350ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* ripple */}
            <span
              key={cursor.ripple}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary"
              style={{
                width: 16,
                height: 16,
                animation: cursor.ripple > 0 ? "ripple 0.6s ease-out forwards" : undefined,
              }}
            />
            <MousePointer2
              className="relative h-5 w-5 fill-white text-zinc-900 drop-shadow"
              strokeWidth={1.5}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes ripple {
          0% { width: 8px; height: 8px; opacity: 1; }
          100% { width: 60px; height: 60px; opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function FlashOverlay() {
  const [opacity, setOpacity] = useState(0.45);
  useEffect(() => {
    const t = window.setTimeout(() => setOpacity(0), 30);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-white"
      style={{
        opacity,
        transition: "opacity 380ms ease-out",
      }}
    />
  );
}

function IdleScreen() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-100 text-zinc-400">
      <MousePointer2 className="h-6 w-6" />
      <p className="text-xs">Live preview will start when the test runs</p>
    </div>
  );
}

/* ---------- Mock layouts ---------- */

function Layout({
  layout,
  fields,
  highlight,
}: {
  layout: ViewportLayout;
  fields: FieldState;
  highlight: string | null;
}) {
  switch (layout) {
    case "login":
      return <LoginLayout fields={fields} highlight={highlight} />;
    case "dashboard":
      return <DashboardLayout highlight={highlight} />;
    case "form":
      return <FormLayout highlight={highlight} />;
    case "checkout":
      return <CheckoutLayout highlight={highlight} />;
    case "settings":
      return <SettingsLayout highlight={highlight} />;
    case "mobile":
      return <MobileLayout highlight={highlight} />;
    case "audit":
      return <AuditLayout fields={fields} highlight={highlight} />;
    case "api":
      return <ApiLayout />;
    case "perf":
      return <PerfLayout />;
    case "chaos":
      return <ChaosLayout />;
    case "a11y":
      return <A11yLayout />;
    case "list":
      return <DashboardLayout highlight={highlight} />;
  }
}

function HL({ id, highlight, children, className }: { id: string; highlight: string | null; children: React.ReactNode; className?: string }) {
  const active = highlight === id;
  return (
    <div
      className={cn(
        "transition-shadow",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-white rounded-md",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ChromeNav() {
  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-violet-500" />
        <span className="text-sm font-bold">QA Playground</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>Dashboard</span>
        <span>Tests</span>
        <span>Reports</span>
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500" />
      </div>
    </div>
  );
}

function LoginLayout({ fields, highlight }: { fields: FieldState; highlight: string | null }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-violet-50 p-4">
      <div className="w-full max-w-xs rounded-xl border bg-white p-4 shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-violet-500" />
          <span className="text-sm font-bold">Sign in</span>
        </div>
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-zinc-500">Email</label>
            <HL id="email" highlight={highlight}>
              <div className="flex h-7 items-center rounded border bg-white px-2 text-xs">
                <span className="font-mono text-zinc-900">{fields.email ?? ""}</span>
                <Caret show={highlight === "email"} />
              </div>
            </HL>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500">Password</label>
            <HL id="password" highlight={highlight}>
              <div className="flex h-7 items-center rounded border bg-white px-2 text-xs">
                <span className="font-mono text-zinc-900">{fields.password ?? ""}</span>
                <Caret show={highlight === "password"} />
              </div>
            </HL>
          </div>
          <HL id="submit" highlight={highlight}>
            <button className="mt-1 h-7 w-full rounded bg-blue-600 text-xs font-medium text-white">
              Sign in
            </button>
          </HL>
        </div>
      </div>
    </div>
  );
}

function DashboardLayout({ highlight }: { highlight: string | null }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ChromeNav />
      <HL id="main" highlight={highlight} className="flex-1 p-4">
        <div className="grid h-full grid-cols-3 gap-3">
          <div className="col-span-2 rounded-lg border bg-white p-3">
            <p className="text-[10px] uppercase text-zinc-500">Pass rate</p>
            <p className="text-2xl font-bold">98.4%</p>
            <div className="mt-2 flex h-16 items-end gap-1">
              {[40, 55, 38, 70, 62, 80, 90, 75, 88, 92, 84, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-blue-500 to-violet-500"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Stat label="Tests" value="224" />
            <Stat label="Avg duration" value="42s" />
            <Stat label="Flaky" value="2.1%" />
          </div>
        </div>
      </HL>
    </div>
  );
}

function FormLayout({ highlight }: { highlight: string | null }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ChromeNav />
      <div className="flex-1 p-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-bold">Project settings</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Name" />
            <Field label="Slug" />
            <Field label="Region" />
            <Field label="Tier" />
          </div>
          <div className="mt-3 flex justify-end">
            <HL id="apply" highlight={highlight}>
              <button className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white">
                Apply
              </button>
            </HL>
          </div>
        </div>
        <HL id="toast" highlight={highlight} className="mt-2" />
      </div>
    </div>
  );
}

function CheckoutLayout({ highlight }: { highlight: string | null }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ChromeNav />
      <div className="flex flex-1 gap-3 p-4">
        <div className="w-40 space-y-2">
          {["profile", "team", "billing", "review"].map((s) => (
            <HL key={s} id={`step-${s}`} highlight={highlight}>
              <div className="rounded-md border bg-white px-2 py-1.5 text-xs capitalize">
                {s}
              </div>
            </HL>
          ))}
        </div>
        <div className="flex-1 rounded-lg border bg-white p-4">
          <p className="text-sm font-bold">Onboarding</p>
          <div className="mt-3 space-y-2">
            <Field label="Workspace name" />
            <Field label="Team size" />
          </div>
          <div className="mt-4 flex justify-end">
            <HL id="continue" highlight={highlight}>
              <button className="rounded bg-violet-600 px-4 py-1.5 text-xs font-medium text-white">
                Continue
              </button>
            </HL>
          </div>
        </div>
      </div>
      <HL id="dashboard" highlight={highlight} />
    </div>
  );
}

function SettingsLayout({ highlight }: { highlight: string | null }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ChromeNav />
      <div className="flex-1 p-4">
        <div className="rounded-lg border bg-white p-3">
          <p className="text-sm font-bold">Security headers</p>
          <ul className="mt-2 space-y-1 text-[11px] font-mono text-zinc-700">
            <li>content-security-policy: default-src 'self'…</li>
            <li>strict-transport-security: max-age=31536000</li>
            <li>x-frame-options: DENY</li>
            <li>referrer-policy: no-referrer</li>
          </ul>
        </div>
        <HL id="headers" highlight={highlight} className="mt-2" />
      </div>
    </div>
  );
}

function MobileLayout({ highlight }: { highlight: string | null }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-200 p-4">
      <div className="relative h-full max-h-[420px] w-[210px] overflow-hidden rounded-[28px] border-[6px] border-zinc-900 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-zinc-50 px-3 py-1 text-[10px] text-zinc-500">
          <span>9:41</span>
          <HL id="menu" highlight={highlight}>
            <div className="flex flex-col gap-0.5">
              <span className="block h-0.5 w-3 bg-zinc-900" />
              <span className="block h-0.5 w-3 bg-zinc-900" />
              <span className="block h-0.5 w-3 bg-zinc-900" />
            </div>
          </HL>
        </div>
        <HL id="nav" highlight={highlight} className="p-3">
          <p className="text-[11px] font-bold">QA Playground</p>
          <ul className="mt-2 space-y-1.5 text-[10px] text-zinc-600">
            <li className="rounded bg-blue-50 px-2 py-1 text-blue-700">Dashboard</li>
            <li className="px-2 py-1">Tests</li>
            <li className="px-2 py-1">Reports</li>
            <li className="px-2 py-1">Settings</li>
          </ul>
        </HL>
      </div>
    </div>
  );
}

function AuditLayout({ fields, highlight }: { fields: FieldState; highlight: string | null }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ChromeNav />
      <div className="flex-1 space-y-3 p-4">
        <div className="rounded-lg border bg-white p-3">
          <p className="text-sm font-bold">Record #42 — Approval required</p>
          <div className="mt-2 flex justify-end">
            <HL id="approve" highlight={highlight}>
              <button className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
                Approve
              </button>
            </HL>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-3">
          <p className="text-xs font-semibold">Electronic signature</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500">Password</label>
              <HL id="password" highlight={highlight}>
                <div className="flex h-7 items-center rounded border px-2 text-xs">
                  <span className="font-mono">{fields.password ?? ""}</span>
                  <Caret show={highlight === "password"} />
                </div>
              </HL>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500">Meaning</label>
              <div className="flex h-7 items-center rounded border px-2 text-xs">
                Approval
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <HL id="sign" highlight={highlight}>
              <button className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                Sign
              </button>
            </HL>
          </div>
        </div>
        <HL id="audit" highlight={highlight}>
          <div className="rounded-lg border bg-zinc-950 p-2 font-mono text-[10px] text-emerald-300">
            audit_log[0] = {`{ action: "approve", meaning: "approval", hash: "0x9f…" }`}
          </div>
        </HL>
      </div>
    </div>
  );
}

function ApiLayout() {
  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-[11px]">
        <span className="font-mono text-emerald-400">GET /v1/resource</span>
        <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-emerald-400">
          200 OK · 142ms
        </span>
      </div>
      <pre className="flex-1 overflow-auto p-3 text-[11px] leading-relaxed text-zinc-200">
        <code>{`{
  "id": "rec_8f3k9",
  "createdAt": "2026-05-01T10:42:11Z",
  "status": "active",
  "owner": { "id": "usr_1a2b", "email": "qa@example.com" }
}`}</code>
      </pre>
    </div>
  );
}

function PerfLayout() {
  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <ChromeNav />
      <div className="grid flex-1 grid-cols-3 gap-3 p-4">
        <Stat label="LCP" value="1.84s" tone="ok" />
        <Stat label="CLS" value="0.04" tone="ok" />
        <Stat label="INP" value="142ms" tone="ok" />
        <div className="col-span-3 rounded-lg border bg-white p-2">
          <div className="flex h-16 items-end gap-1">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-amber-400 to-yellow-500"
                style={{ height: `${20 + Math.abs(Math.sin(i / 2)) * 70}%` }}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-zinc-500">Frame durations · 30s window</p>
        </div>
      </div>
    </div>
  );
}

function ChaosLayout() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center gap-2 border-b border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-[11px] text-fuchsia-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Chaos: latency 1500ms injected</span>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
          <p className="mt-2 text-xs text-zinc-500">Loading… please wait</p>
        </div>
      </div>
    </div>
  );
}

function A11yLayout() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <ChromeNav />
      <div className="flex-1 p-4">
        <div className="rounded-lg border bg-white p-3">
          <p className="text-sm font-bold">axe-core analysis</p>
          <ul className="mt-2 space-y-1 text-[11px]">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> color-contrast: pass</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> label: pass</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> heading-order: pass</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> landmark-one-main: pass</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Caret({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-zinc-900" />;
}

function Field({ label }: { label: string }) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500">{label}</label>
      <div className="h-7 rounded border bg-zinc-50" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-2",
        tone === "ok" && "border-emerald-300",
      )}
    >
      <p className="text-[10px] uppercase text-zinc-500">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
