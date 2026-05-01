// Maps EACH test step -> its OWN visual "actions". Each test gets a personalized
// scenario based on (a) the literal step.label text and (b) the test title.
// We also choose REAL routes from this app (e.g. /auth, /tasks, /wizard,
// /chaos/experiments, /compliance/audit-trail, /security/mfa, /quality-metrics,
// /ai/observability, /playground/...) so the URL bar and layout match what the
// test would actually exercise in this codebase.

import type { PwCategory, PwTest } from "./playwright-tests";

export type VisualAction =
  | { kind: "navigate"; url: string }
  | { kind: "move"; x: number; y: number }
  | { kind: "click"; x: number; y: number; targetId?: string }
  | { kind: "type"; targetId: string; text: string }
  | { kind: "assert"; targetId: string; ok: boolean; message: string }
  | { kind: "screenshot"; label: string }
  | { kind: "wait"; label: string };

export type ViewportLayout =
  | "login"
  | "dashboard"
  | "form"
  | "list"
  | "checkout"
  | "settings"
  | "mobile"
  | "audit"
  | "api"
  | "perf"
  | "chaos"
  | "a11y"
  | "tasks"
  | "wizard"
  | "quality"
  | "ai"
  | "profile";

export interface VisualScene {
  url: string;
  layout: ViewportLayout;
  routeLabel: string; // human description shown in scene header
}

export interface VisualPlan {
  scene: VisualScene;
  actions: VisualAction[];
  stepActionCounts: number[]; // parallel to test.steps
}

/* ---------------- Route resolution ---------------- */

// Pick a real route from THIS app based on the test's category + title.
function resolveScene(test: PwTest): VisualScene {
  const t = test.title.toLowerCase();
  const cat = test.category;
  const baseHost = "https://lovable-qa.app";

  // Title-based overrides first (most specific)
  if (/sign in|sign-in|login|credential|password|mfa|totp|magic link|oauth|jwt|session|logout|reset/i.test(test.title)) {
    if (/mfa|totp|aal2|backup code/i.test(test.title))
      return { url: `${baseHost}/security/mfa`, layout: "settings", routeLabel: "/security/mfa" };
    if (/session/i.test(test.title))
      return { url: `${baseHost}/security/sessions`, layout: "settings", routeLabel: "/security/sessions" };
    return { url: `${baseHost}/auth`, layout: "login", routeLabel: "/auth" };
  }
  if (/wizard|onboard|step|continue/i.test(test.title))
    return { url: `${baseHost}/wizard`, layout: "wizard", routeLabel: "/wizard" };
  if (/task|todo/i.test(test.title))
    return { url: `${baseHost}/tasks`, layout: "tasks", routeLabel: "/tasks" };
  if (/profile|avatar/i.test(test.title))
    return { url: `${baseHost}/profile`, layout: "profile", routeLabel: "/profile" };
  if (/audit|e-signature|signature|record|approval|tamper|gxp|21 cfr|validation/i.test(test.title))
    return { url: `${baseHost}/compliance/audit-trail`, layout: "audit", routeLabel: "/compliance/audit-trail" };
  if (/dora|pyramid|flaky|coverage|metric/i.test(test.title))
    return { url: `${baseHost}/quality-metrics`, layout: "quality", routeLabel: "/quality-metrics" };
  if (/agent|llm|prompt|rag|eval|guardrail|self-heal|bug triage|workflow|cost|synthetic/i.test(test.title))
    return { url: `${baseHost}/ai/observability`, layout: "ai", routeLabel: "/ai/observability" };
  if (/chaos|latency|circuit|breaker|bulkhead|fallback|outage|degrad|backpressure|stampede|failover/i.test(test.title))
    return { url: `${baseHost}/chaos/experiments`, layout: "chaos", routeLabel: "/chaos/experiments" };
  if (/perf|lcp|cls|inp|ttfb|p95|p99|hydration|prefetch/i.test(test.title))
    return { url: `${baseHost}/chaos/perf`, layout: "perf", routeLabel: "/chaos/perf" };

  // Category fallbacks — also map to real app routes
  switch (cat) {
    case "Smoke":
      return { url: `${baseHost}/`, layout: "dashboard", routeLabel: "/" };
    case "Auth & MFA":
      return { url: `${baseHost}/auth`, layout: "login", routeLabel: "/auth" };
    case "Regression":
      return { url: `${baseHost}/playground/interactions`, layout: "form", routeLabel: "/playground/interactions" };
    case "E2E Journeys":
      return { url: `${baseHost}/wizard`, layout: "wizard", routeLabel: "/wizard" };
    case "Accessibility":
      return { url: `${baseHost}/playground/a11y`, layout: "a11y", routeLabel: "/playground/a11y" };
    case "Visual":
      return { url: `${baseHost}/`, layout: "dashboard", routeLabel: "/" };
    case "API":
      return { url: `${baseHost}/functions/v1/api`, layout: "api", routeLabel: "/functions/v1/*" };
    case "Performance":
      return { url: `${baseHost}/chaos/perf`, layout: "perf", routeLabel: "/chaos/perf" };
    case "Security":
      return { url: `${baseHost}/security`, layout: "settings", routeLabel: "/security" };
    case "Mobile":
      return { url: `${baseHost}/`, layout: "mobile", routeLabel: "/ (iPhone 14)" };
    case "Compliance (21 CFR Part 11)":
      return { url: `${baseHost}/compliance/audit-trail`, layout: "audit", routeLabel: "/compliance/audit-trail" };
    case "Chaos / Resilience":
      return { url: `${baseHost}/chaos/experiments`, layout: "chaos", routeLabel: "/chaos/experiments" };
  }
}

/* ---------------- Per-step action synthesis ---------------- */

interface Ctx {
  test: PwTest;
  scene: VisualScene;
  stepIndex: number;
  totalSteps: number;
}

// Translate a single step.label into a personalized list of VisualActions.
function actionsForStep(label: string, ctx: Ctx): VisualAction[] {
  const L = label.toLowerCase();
  const acts: VisualAction[] = [];
  const t = ctx.test;
  const isLast = ctx.stepIndex === ctx.totalSteps - 1;

  // ---- Navigate / open
  if (/^navigate|^open|^goto|go to/i.test(label)) {
    // re-emit a navigate so the URL bar updates if a sub-route is mentioned
    const mUrl = label.match(/\/[\w/-]+/);
    if (mUrl) acts.push({ kind: "navigate", url: ctx.scene.url.replace(/\/[^/]*$/, "") + mUrl[0] });
    acts.push({ kind: "wait", label: `GET ${ctx.scene.routeLabel}` });
    return acts;
  }

  // ---- Fill credentials / form
  if (/fill credential/i.test(L)) {
    acts.push({ kind: "move", x: 50, y: 42 });
    acts.push({ kind: "click", x: 50, y: 42, targetId: "email" });
    acts.push({ kind: "type", targetId: "email", text: "qa+demo@lovable.dev" });
    acts.push({ kind: "move", x: 50, y: 54 });
    acts.push({ kind: "click", x: 50, y: 54, targetId: "password" });
    acts.push({ kind: "type", targetId: "password", text: "••••••••••" });
    return acts;
  }

  // ---- Submit
  if (/submit|sign in|sign-in|login/i.test(L)) {
    acts.push({ kind: "move", x: 50, y: 66 });
    acts.push({ kind: "click", x: 50, y: 66, targetId: "submit" });
    acts.push({ kind: "wait", label: "POST /auth/v1/token → 200" });
    if (/redirect/i.test(L)) acts.push({ kind: "wait", label: "redirect → /" });
    return acts;
  }

  // ---- Seed fixture
  if (/seed/i.test(L)) {
    acts.push({ kind: "wait", label: `seed: ${t.id}.fixture.json` });
    return acts;
  }

  // ---- Inject (chaos / axe)
  if (/inject/i.test(L)) {
    if (/axe/i.test(L)) {
      acts.push({ kind: "wait", label: "inject @axe-core/playwright" });
    } else {
      // chaos
      const fault = /(\d+)\s*ms/.exec(label)?.[1];
      acts.push({
        kind: "wait",
        label: fault
          ? `POST /functions/v1/chaos-experiment {latency:${fault}ms}`
          : "POST /functions/v1/chaos-experiment",
      });
    }
    return acts;
  }

  // ---- Walk through wizard / multi-step
  if (/walk through|wizard|step through/i.test(L)) {
    for (const s of ["profile", "team", "billing", "review"]) {
      acts.push({ kind: "move", x: 22, y: 30 + ["profile", "team", "billing", "review"].indexOf(s) * 12 });
      acts.push({ kind: "click", x: 22, y: 30 + ["profile", "team", "billing", "review"].indexOf(s) * 12, targetId: `step-${s}` });
      acts.push({ kind: "click", x: 78, y: 80, targetId: "continue" });
    }
    return acts;
  }

  // ---- Perform user action (regression)
  if (/perform user action|user action|click apply|apply/i.test(L)) {
    acts.push({ kind: "move", x: 72, y: 62 });
    acts.push({ kind: "click", x: 72, y: 62, targetId: "apply" });
    return acts;
  }

  // ---- Build / send request (API)
  if (/build .*request|build typed/i.test(L)) {
    acts.push({ kind: "wait", label: "build request (zod schema)" });
    return acts;
  }
  if (/send .*request|apirequest|send via|crafted request/i.test(L)) {
    const route = ctx.scene.routeLabel.startsWith("/functions") ? ctx.scene.routeLabel : "/functions/v1/api";
    acts.push({ kind: "wait", label: `GET ${route} → 200` });
    return acts;
  }

  // ---- Validate (zod / schema)
  if (/validate|zod|schema/i.test(L)) {
    acts.push({ kind: "wait", label: "Schema.parse(body)" });
    if (isLast) acts.push({ kind: "assert", targetId: "schema", ok: true, message: "Zod schema OK" });
    return acts;
  }

  // ---- Tracing / Web Vitals / drive scenario
  if (/start tracing/i.test(L)) {
    acts.push({ kind: "wait", label: "tracing.start({ screenshots: true })" });
    return acts;
  }
  if (/drive scenario|drive (user )?flow|run flow|scenario/i.test(L)) {
    acts.push({ kind: "move", x: 30, y: 50 });
    acts.push({ kind: "wait", label: "PerformanceObserver: LCP/INP/CLS" });
    acts.push({ kind: "move", x: 70, y: 60 });
    return acts;
  }

  // ---- Visual: fonts ready / mask / compare
  if (/fonts ready/i.test(L)) {
    acts.push({ kind: "wait", label: "document.fonts.ready" });
    return acts;
  }
  if (/mask/i.test(L)) {
    acts.push({ kind: "wait", label: "mask: [data-volatile]" });
    return acts;
  }
  if (/compare|baseline|screenshot/i.test(L)) {
    acts.push({ kind: "screenshot", label: `${t.id}.png` });
    if (isLast)
      acts.push({
        kind: "assert",
        targetId: "diff",
        ok: t.expected !== "fail",
        message:
          t.expected === "fail"
            ? "diffPixels: 1248 (> threshold)"
            : "diffPixels: 12 (< threshold)",
      });
    return acts;
  }

  // ---- Compliance: audited action / audit log
  if (/audited action|approve/i.test(L)) {
    acts.push({ kind: "move", x: 78, y: 28 });
    acts.push({ kind: "click", x: 78, y: 28, targetId: "approve" });
    acts.push({ kind: "click", x: 50, y: 56, targetId: "password" });
    acts.push({ kind: "type", targetId: "password", text: "••••••••" });
    acts.push({ kind: "click", x: 78, y: 78, targetId: "sign" });
    return acts;
  }
  if (/query audit|audit_log/i.test(L)) {
    acts.push({ kind: "wait", label: "GET /api/audit?record=42" });
    return acts;
  }

  // ---- Mobile
  if (/device descriptor/i.test(L)) {
    acts.push({ kind: "wait", label: "test.use({ ...devices['iPhone 14'] })" });
    return acts;
  }
  if (/run flow/i.test(L) && t.category === "Mobile") {
    acts.push({ kind: "move", x: 80, y: 10 });
    acts.push({ kind: "click", x: 80, y: 10, targetId: "menu" });
    return acts;
  }

  // ---- Restore baseline
  if (/restore/i.test(L)) {
    acts.push({ kind: "wait", label: "DELETE /functions/v1/chaos-experiment" });
    return acts;
  }

  // ---- a11y analyse
  if (/run analysis|axe.run|analy[sz]e/i.test(L)) {
    acts.push({ kind: "wait", label: "axe.run({ tags: ['wcag2aa'] })" });
    return acts;
  }

  // ---- Wait for networkidle/redirect/etc
  if (/wait/i.test(L)) {
    const m = label.match(/for\s+(.*)$/i);
    acts.push({ kind: "wait", label: m ? m[1] : "networkidle" });
    return acts;
  }

  // ---- Verify backend state via API
  if (/verify backend|backend state|api/i.test(L)) {
    acts.push({ kind: "wait", label: "GET /api/me → 200" });
    return acts;
  }

  // ---- Assertions (final or intermediate)
  if (/^assert|verify|check/i.test(label) || /assert/i.test(L)) {
    const ok = t.expected === "pass" || t.expected === "flaky";
    const msg = assertMessageFor(t, label, ok);
    acts.push({ kind: "assert", targetId: assertTargetFor(ctx.scene.layout), ok, message: msg });
    return acts;
  }

  // ---- Default: subtle move + named wait that quotes the actual step text
  acts.push({ kind: "move", x: 40 + (ctx.stepIndex * 17) % 40, y: 40 + (ctx.stepIndex * 13) % 30 });
  acts.push({ kind: "wait", label: label });
  return acts;
}

function assertTargetFor(layout: ViewportLayout): string {
  switch (layout) {
    case "login":
      return "dashboard";
    case "audit":
      return "audit";
    case "api":
      return "schema";
    case "perf":
      return "vitals";
    case "chaos":
      return "graceful";
    case "a11y":
      return "a11y";
    case "tasks":
      return "tasks";
    case "wizard":
      return "dashboard";
    case "quality":
      return "metrics";
    case "ai":
      return "ai";
    default:
      return "main";
  }
}

function assertMessageFor(t: PwTest, label: string, ok: boolean): string {
  if (!ok) return `AssertionError while verifying: ${shortTitle(t.title)}`;
  // Try to derive a meaningful expectation from title patterns
  const title = t.title;
  if (/under (\d+)\s*s/i.test(title)) {
    const m = title.match(/under (\d+)\s*s/i)!;
    return `${title.split("under")[0].trim()}: ${(parseInt(m[1]) - 0.16).toFixed(2)}s < ${m[1]}s`;
  }
  if (/under (\d+)\s*ms/i.test(title)) {
    const m = title.match(/under (\d+)\s*ms/i)!;
    return `${title.split("under")[0].trim()}: ${Math.max(20, parseInt(m[1]) - 58)}ms < ${m[1]}ms`;
  }
  if (/0 violations|wcag|a11y|accessib/i.test(title)) return "0 critical/serious violations";
  if (/csp|hsts|x-frame|header/i.test(title)) return "CSP, HSTS, XFO=DENY all present";
  if (/audit|signature|tamper/i.test(title)) return "audit row hashed + signed (prev_hash OK)";
  if (/redirect|/dashboard/i.test(title)) return "URL matches /dashboard";
  if (/200|ok/i.test(title)) return "response.status() === 200";
  // Fallback — quote the step itself
  return label.replace(/^(assert|verify|check)\s+/i, "✓ ");
}

function shortTitle(s: string) {
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
}

/* ---------------- Public API ---------------- */

export function planForTest(test: PwTest): VisualPlan {
  const scene = resolveScene(test);
  const actions: VisualAction[] = [{ kind: "navigate", url: scene.url }];
  const stepActionCounts: number[] = [];

  for (let i = 0; i < test.steps.length; i++) {
    const acts = actionsForStep(test.steps[i].label, {
      test,
      scene,
      stepIndex: i,
      totalSteps: test.steps.length,
    });
    actions.push(...acts);
    stepActionCounts.push(acts.length);
  }

  // Ensure final assertion exists, reflecting expected outcome
  const last = actions[actions.length - 1];
  if (!last || last.kind !== "assert") {
    const ok = test.expected === "pass" || test.expected === "flaky";
    actions.push({
      kind: "assert",
      targetId: assertTargetFor(scene.layout),
      ok,
      message:
        test.expected === "skipped"
          ? "Skipped (test.skip)"
          : test.expected === "flaky"
            ? "Passed on retry #2"
            : ok
              ? assertMessageFor(test, "Assert outcome", true)
              : `AssertionError: ${shortTitle(test.title)}`,
    });
    stepActionCounts[stepActionCounts.length - 1] += 1;
  }

  return { scene, actions, stepActionCounts };
}

// Backwards-compat helpers (legacy callers)
export type { PwCategory };
