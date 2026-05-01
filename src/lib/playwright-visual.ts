// Maps execution steps -> visual "actions" that the BrowserPreview can render.
// Each test category gets a deterministic, hand-crafted scenario so the preview
// looks like a real Playwright run (cursor moves, types, clicks, asserts).

import type { PwCategory } from "./playwright-tests";

export type VisualAction =
  | { kind: "navigate"; url: string }
  | { kind: "move"; x: number; y: number } // % of viewport
  | { kind: "click"; x: number; y: number; targetId?: string }
  | { kind: "type"; targetId: string; text: string }
  | { kind: "assert"; targetId: string; ok: boolean; message: string }
  | { kind: "screenshot"; label: string }
  | { kind: "wait"; label: string };

export interface VisualScene {
  url: string;
  // Static layout shown inside the mock viewport
  layout: ViewportLayout;
}

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
  | "a11y";

export interface VisualPlan {
  scene: VisualScene;
  actions: VisualAction[]; // one or more visual actions per step
  stepActionCounts: number[]; // how many actions belong to each step (parallel array to test.steps)
}

const SCENES: Record<PwCategory, VisualScene> = {
  Smoke: { url: "https://app.qa-playground.dev/", layout: "dashboard" },
  "Auth & MFA": { url: "https://app.qa-playground.dev/auth", layout: "login" },
  Regression: { url: "https://app.qa-playground.dev/app", layout: "form" },
  "E2E Journeys": { url: "https://app.qa-playground.dev/onboarding", layout: "checkout" },
  Accessibility: { url: "https://app.qa-playground.dev/", layout: "a11y" },
  Visual: { url: "https://app.qa-playground.dev/", layout: "dashboard" },
  API: { url: "https://api.qa-playground.dev/v1", layout: "api" },
  Performance: { url: "https://app.qa-playground.dev/", layout: "perf" },
  Security: { url: "https://app.qa-playground.dev/", layout: "settings" },
  Mobile: { url: "https://m.qa-playground.dev/", layout: "mobile" },
  "Compliance (21 CFR Part 11)": {
    url: "https://app.qa-playground.dev/records/42",
    layout: "audit",
  },
  "Chaos / Resilience": { url: "https://app.qa-playground.dev/", layout: "chaos" },
};

// Return a default plan based on category. Steps usually map ~1:1 to a scripted
// visual move + click / type / assert sequence.
export function planForTest(
  category: PwCategory,
  stepCount: number,
  expected: "pass" | "fail" | "flaky" | "skipped",
): VisualPlan {
  const scene = SCENES[category];
  const seq = SCENARIOS[category];
  const actions: VisualAction[] = [{ kind: "navigate", url: scene.url }];
  const stepActionCounts: number[] = [];

  for (let i = 0; i < stepCount; i++) {
    const acts = seq[i % seq.length];
    actions.push(...acts);
    stepActionCounts.push(acts.length);
  }

  // Final assertion reflects expected outcome
  const okMsg =
    expected === "pass"
      ? "Assertion passed"
      : expected === "flaky"
        ? "Passed on retry #2"
        : expected === "skipped"
          ? "Skipped"
          : "AssertionError: element not visible";
  const finalAssert: VisualAction = {
    kind: "assert",
    targetId: "final",
    ok: expected === "pass" || expected === "flaky",
    message: okMsg,
  };
  actions.push(finalAssert);
  // attach to last step
  stepActionCounts[stepActionCounts.length - 1] += 1;

  return { scene, actions, stepActionCounts };
}

// Per-category scripted visual sequences. Each entry corresponds to ONE step.
const SCENARIOS: Record<PwCategory, VisualAction[][]> = {
  Smoke: [
    [{ kind: "move", x: 50, y: 30 }, { kind: "wait", label: "networkidle" }],
    [{ kind: "move", x: 30, y: 50 }, { kind: "assert", targetId: "main", ok: true, message: "main visible" }],
    [{ kind: "screenshot", label: "viewport.png" }],
  ],
  "Auth & MFA": [
    [{ kind: "move", x: 50, y: 40 }, { kind: "click", x: 50, y: 40, targetId: "email" }, { kind: "type", targetId: "email", text: "qa@example.com" }],
    [{ kind: "move", x: 50, y: 52 }, { kind: "click", x: 50, y: 52, targetId: "password" }, { kind: "type", targetId: "password", text: "••••••••" }],
    [{ kind: "move", x: 50, y: 64 }, { kind: "click", x: 50, y: 64, targetId: "submit" }, { kind: "wait", label: "redirect" }],
    [{ kind: "assert", targetId: "dashboard", ok: true, message: "URL matches /dashboard" }],
  ],
  Regression: [
    [{ kind: "wait", label: "seed fixtures" }],
    [{ kind: "move", x: 70, y: 60 }, { kind: "click", x: 70, y: 60, targetId: "apply" }],
    [{ kind: "assert", targetId: "toast", ok: true, message: "toast: saved" }],
  ],
  "E2E Journeys": [
    [{ kind: "wait", label: "auth via storageState" }],
    [{ kind: "move", x: 25, y: 45 }, { kind: "click", x: 25, y: 45, targetId: "step-profile" }, { kind: "click", x: 75, y: 78, targetId: "continue" }],
    [{ kind: "move", x: 25, y: 45 }, { kind: "click", x: 25, y: 45, targetId: "step-team" }, { kind: "click", x: 75, y: 78, targetId: "continue" }],
    [{ kind: "assert", targetId: "dashboard", ok: true, message: "wizard complete" }],
  ],
  Accessibility: [
    [{ kind: "wait", label: "inject axe" }],
    [{ kind: "wait", label: "axe.run()" }],
    [{ kind: "assert", targetId: "a11y", ok: true, message: "0 critical violations" }],
  ],
  Visual: [
    [{ kind: "wait", label: "fonts ready" }],
    [{ kind: "screenshot", label: "mask volatile" }],
    [{ kind: "assert", targetId: "diff", ok: true, message: "diffPixels: 12 (< threshold)" }],
  ],
  API: [
    [{ kind: "wait", label: "build request" }],
    [{ kind: "wait", label: "GET /v1/resource → 200" }],
    [{ kind: "assert", targetId: "schema", ok: true, message: "Zod schema OK" }],
  ],
  Performance: [
    [{ kind: "wait", label: "start tracing" }],
    [{ kind: "move", x: 50, y: 50 }, { kind: "wait", label: "drive scenario" }],
    [{ kind: "assert", targetId: "vitals", ok: true, message: "LCP 1.84s < 2.5s" }],
  ],
  Security: [
    [{ kind: "wait", label: "send crafted request" }],
    [{ kind: "assert", targetId: "headers", ok: true, message: "CSP + HSTS present, XFO=DENY" }],
  ],
  Mobile: [
    [{ kind: "wait", label: "device: iPhone 14" }],
    [{ kind: "move", x: 80, y: 12 }, { kind: "click", x: 80, y: 12, targetId: "menu" }],
    [{ kind: "assert", targetId: "nav", ok: true, message: "navigation visible" }],
  ],
  "Compliance (21 CFR Part 11)": [
    [{ kind: "move", x: 70, y: 35 }, { kind: "click", x: 70, y: 35, targetId: "approve" }],
    [{ kind: "click", x: 50, y: 45, targetId: "password" }, { kind: "type", targetId: "password", text: "••••••••" }, { kind: "click", x: 50, y: 70, targetId: "sign" }],
    [{ kind: "assert", targetId: "audit", ok: true, message: "audit row hashed + signed" }],
  ],
  "Chaos / Resilience": [
    [{ kind: "wait", label: "inject 1500ms latency" }],
    [{ kind: "move", x: 50, y: 50 }, { kind: "wait", label: "drive flow" }],
    [{ kind: "assert", targetId: "graceful", ok: true, message: "fallback UI shown" }],
    [{ kind: "wait", label: "restore baseline" }],
  ],
};
