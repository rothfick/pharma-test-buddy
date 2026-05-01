// Long, scripted "demo tour" of the QA Playground — clicks through every
// nested option on every Playground subpage so a viewer can watch the whole
// app being exercised in the live preview iframe. Kept entirely local: each
// step uses the LiveDriver (same-origin DOM control). Mutating actions are
// minimal and the global runner snapshots/restores tasks regardless.

import type { Cmd } from "./live-driver";
import { CHALLENGES, type Challenge, CATEGORY_LABELS } from "./playground-challenges";

export interface TourStep {
  /** Title shown in the live log. */
  label: string;
  /** Sub-page (route) the step belongs to — used for grouping in the UI. */
  page: string;
  cmds: Cmd[];
}

const W = (ms: number): Cmd => ({ kind: "wait", ms });
const GOTO = (path: string): Cmd => ({ kind: "goto", path, timeoutMs: 12000 });
const CLICK = (selector: string, timeoutMs = 6000): Cmd => ({ kind: "click", selector, timeoutMs });
const FILL = (selector: string, value: string): Cmd => ({ kind: "fill", selector, value });
const SEE = (selector: string, timeoutMs = 6000): Cmd => ({ kind: "expectVisible", selector, timeoutMs });
const SCROLL = (selector: string): Cmd => ({ kind: "scrollIntoView", selector });
const SHOT = (label: string): Cmd => ({ kind: "screenshot", label });

// ---------- demo credentials (used by the login phase) ----------
export const TOUR_DEMO_EMAIL = "tour-demo@example.com";
export const TOUR_DEMO_PASSWORD = "Passw0rd!";

// ---------- per-page sequences ----------

const loginSteps: TourStep[] = [
  {
    page: "/auth",
    label: "Open sign-in screen",
    cmds: [
      GOTO("/auth"),
      W(500),
      SEE('[data-testid="auth-card"]', 8000),
      SHOT("auth-screen"),
      W(400),
    ],
  },
  {
    page: "/auth",
    label: "Fill credentials",
    cmds: [
      SCROLL('[data-testid="signin-form"]'),
      FILL('[data-testid="signin-email"]', TOUR_DEMO_EMAIL),
      W(250),
      FILL('[data-testid="signin-password"]', TOUR_DEMO_PASSWORD),
      W(300),
      SHOT("auth-filled"),
    ],
  },
  {
    page: "/auth",
    label: "Submit sign-in",
    cmds: [
      CLICK('[data-testid="signin-submit"]'),
      W(1800),
    ],
  },
  {
    page: "/playground",
    label: "Navigate to Playground",
    cmds: [GOTO("/playground"), W(700)],
  },
];

const overviewSteps: TourStep[] = [
  {
    page: "/playground",
    label: "Open Playground overview",
    cmds: [
      GOTO("/playground"),
      W(400),
      SEE('[data-testid="playground-overview"], main', 8000),
      SHOT("playground-overview"),
      W(500),
    ],
  },
];

const interactionsSteps: TourStep[] = [
  {
    page: "/playground/interactions",
    label: "UI interactions: open page",
    cmds: [GOTO("/playground/interactions"), W(400), SEE('[data-testid="interactions-page"]'), SHOT("interactions")],
  },
  {
    page: "/playground/interactions",
    label: "Hover card: trigger preview",
    cmds: [
      SCROLL('[data-testid="hover-card"]'),
      W(200),
      CLICK('[data-testid="hover-trigger"]'),
      W(600),
    ],
  },
  {
    page: "/playground/interactions",
    label: "Context menu: copy",
    cmds: [SCROLL('[data-testid="contextmenu-card"]'), W(200), CLICK('[data-testid="ctx-copy"]'), W(400)],
  },
  {
    page: "/playground/interactions",
    label: "Context menu: rename",
    cmds: [CLICK('[data-testid="ctx-rename"]'), W(400)],
  },
  {
    page: "/playground/interactions",
    label: "Canvas: clear strokes",
    cmds: [SCROLL('[data-testid="canvas-card"]'), W(200), CLICK('[data-testid="draw-clear"]'), W(400)],
  },
  {
    page: "/playground/interactions",
    label: "Slider: scroll into view",
    cmds: [SCROLL('[data-testid="slider-card"]'), W(700)],
  },
];

const asyncSteps: TourStep[] = [
  {
    page: "/playground/async",
    label: "Async & race: open page",
    cmds: [GOTO("/playground/async"), W(400), SEE('[data-testid="async-page"]'), SHOT("async")],
  },
  {
    page: "/playground/async",
    label: "Auto-save: type into textarea",
    cmds: [SCROLL('[data-testid="autosave-card"]'), FILL('[data-testid="autosave-input"]', "Hello tour 👋"), W(900)],
  },
  {
    page: "/playground/async",
    label: "Optimistic: like (success)",
    cmds: [SCROLL('[data-testid="optimistic-card"]'), CLICK('[data-testid="like-success"]'), W(600)],
  },
  {
    page: "/playground/async",
    label: "Optimistic: like (rollback)",
    cmds: [CLICK('[data-testid="like-fail"]'), W(900)],
  },
  {
    page: "/playground/async",
    label: "Polling: start",
    cmds: [SCROLL('[data-testid="polling-card"]'), CLICK('[data-testid="polling-toggle"]'), W(1100)],
  },
  {
    page: "/playground/async",
    label: "Polling: stop",
    cmds: [CLICK('[data-testid="polling-toggle"]'), W(400)],
  },
  {
    page: "/playground/async",
    label: "Realtime: type message",
    cmds: [
      SCROLL('[data-testid="realtime-card"]'),
      FILL('[data-testid="realtime-input"]', "ping from tour"),
      CLICK('[data-testid="realtime-send"]'),
      W(700),
    ],
  },
];

const filesSteps: TourStep[] = [
  {
    page: "/playground/files",
    label: "Files & media: open page",
    cmds: [GOTO("/playground/files"), W(400), SEE('[data-testid="files-page"]'), SHOT("files")],
  },
  {
    page: "/playground/files",
    label: "Download: CSV",
    cmds: [SCROLL('[data-testid="download-card"]'), CLICK('[data-testid="dl-csv"]'), W(500)],
  },
  {
    page: "/playground/files",
    label: "Download: TXT",
    cmds: [CLICK('[data-testid="dl-txt"]'), W(500)],
  },
  {
    page: "/playground/files",
    label: "Download: direct",
    cmds: [CLICK('[data-testid="dl-direct"]'), W(500)],
  },
  {
    page: "/playground/files",
    label: "Preview & clipboard: scroll",
    cmds: [SCROLL('[data-testid="preview-card"]'), W(600), SCROLL('[data-testid="clipboard-card"]'), W(600)],
  },
];

const securitySteps: TourStep[] = [
  {
    page: "/playground/security",
    label: "Auth & security: open page",
    cmds: [GOTO("/playground/security"), W(400), SEE('[data-testid="security-page"]'), SHOT("security")],
  },
  {
    page: "/playground/security",
    label: "Session: refresh",
    cmds: [SCROLL('[data-testid="session-card"]'), CLICK('[data-testid="session-refresh"]'), W(700)],
  },
  {
    page: "/playground/security",
    label: "OTP: fill 6 digits",
    cmds: [
      SCROLL('[data-testid="otp-card"]'),
      FILL('[data-testid="otp-0"]', "1"),
      FILL('[data-testid="otp-1"]', "2"),
      FILL('[data-testid="otp-2"]', "3"),
      FILL('[data-testid="otp-3"]', "4"),
      FILL('[data-testid="otp-4"]', "5"),
      FILL('[data-testid="otp-5"]', "6"),
      W(300),
      CLICK('[data-testid="otp-verify"]'),
      W(800),
    ],
  },
  {
    page: "/playground/security",
    label: "Captcha: type wrong then reset",
    cmds: [
      SCROLL('[data-testid="captcha-card"]'),
      FILL('[data-testid="captcha-input"]', "0"),
      CLICK('[data-testid="captcha-submit"]'),
      W(500),
      CLICK('[data-testid="captcha-reset"]'),
      W(400),
    ],
  },
  {
    page: "/playground/security",
    label: "Rate limit: tap button",
    cmds: [
      SCROLL('[data-testid="ratelimit-card"]'),
      CLICK('[data-testid="ratelimit-btn"]'),
      W(150),
      CLICK('[data-testid="ratelimit-btn"]'),
      W(150),
      CLICK('[data-testid="ratelimit-btn"]'),
      W(400),
    ],
  },
];

const a11ySteps: TourStep[] = [
  {
    page: "/playground/a11y",
    label: "A11y & i18n: open page",
    cmds: [GOTO("/playground/a11y"), W(400), SEE('[data-testid="a11y-page"]'), SHOT("a11y")],
  },
  {
    page: "/playground/a11y",
    label: "Switch language → English",
    cmds: [SCROLL('[data-testid="i18n-card"]'), CLICK('[data-testid="lang-select"]'), W(300), CLICK('[data-testid="lang-en"]'), W(500)],
  },
  {
    page: "/playground/a11y",
    label: "Switch language → Arabic (RTL)",
    cmds: [CLICK('[data-testid="lang-select"]'), W(300), CLICK('[data-testid="lang-ar"]'), W(700)],
  },
  {
    page: "/playground/a11y",
    label: "Switch back → Polski",
    cmds: [CLICK('[data-testid="lang-select"]'), W(300), CLICK('[data-testid="lang-pl"]'), W(500)],
  },
  {
    page: "/playground/a11y",
    label: "A11y form: fill fields",
    cmds: [
      SCROLL('[data-testid="a11y-form-card"]'),
      FILL('[data-testid="a11y-name"]', "Tour Bot"),
      FILL('[data-testid="a11y-email"]', "tour@example.com"),
      W(300),
      CLICK('[data-testid="a11y-submit"]'),
      W(700),
    ],
  },
];

const legacySteps: TourStep[] = [
  {
    page: "/playground/legacy",
    label: "Legacy targets: open page",
    cmds: [GOTO("/playground/legacy"), W(400), SEE('[data-testid="legacy-page"]'), SHOT("legacy")],
  },
  {
    page: "/playground/legacy",
    label: "API tester: call endpoint",
    cmds: [
      SCROLL('[data-testid="api-tester"]'),
      FILL('[data-testid="api-delay"]', "300"),
      FILL('[data-testid="api-fail"]', "0"),
      CLICK('[data-testid="api-call"]'),
      W(900),
    ],
  },
  {
    page: "/playground/legacy",
    label: "Flaky component: trigger",
    cmds: [SCROLL('[data-testid="flaky-component"]'), CLICK('[data-testid="flaky-trigger"]'), W(800)],
  },
  {
    page: "/playground/legacy",
    label: "Infinite scroll: scroll into view",
    cmds: [SCROLL('[data-testid="infinite-scroll"]'), W(900)],
  },
  {
    page: "/playground/legacy",
    label: "Shadow DOM + iframe: scroll",
    cmds: [SCROLL('[data-testid="shadow-dom"]'), W(700), SCROLL('[data-testid="iframe-card"]'), W(700)],
  },
];

// ---------- Compliance Hub (GxP / 21 CFR Part 11) ----------
const complianceSteps: TourStep[] = [
  {
    page: "/compliance",
    label: "Compliance: open Overview",
    cmds: [GOTO("/compliance"), W(500), SEE('[data-testid="compliance-layout"]', 8000), SHOT("compliance-overview")],
  },
  {
    page: "/compliance/audit-trail",
    label: "Audit Trail: open page",
    cmds: [
      CLICK('[data-testid="comp-audit"]'),
      W(600),
      SEE('[data-testid="audit-trail"]', 8000),
      SHOT("audit-trail"),
    ],
  },
  {
    page: "/compliance/audit-trail",
    label: "Audit Trail: write demo entry",
    cmds: [SCROLL('[data-testid="audit-write-demo"]'), CLICK('[data-testid="audit-write-demo"]'), W(900)],
  },
  {
    page: "/compliance/audit-trail",
    label: "Audit Trail: verify chain integrity",
    cmds: [CLICK('[data-testid="audit-verify"]'), W(900), SEE('[data-testid="chain-status"]')],
  },
  {
    page: "/compliance/audit-trail",
    label: "Audit Trail: filter + reload",
    cmds: [
      FILL('[data-testid="audit-filter"]', "demo"),
      W(400),
      CLICK('[data-testid="audit-reload"]'),
      W(700),
    ],
  },
  {
    page: "/compliance/audit-trail",
    label: "Audit Trail: export CSV",
    cmds: [CLICK('[data-testid="audit-export"]'), W(700)],
  },
  {
    page: "/compliance/e-signatures",
    label: "E-Signatures: open page",
    cmds: [
      CLICK('[data-testid="comp-esig"]'),
      W(600),
      SEE('[data-testid="esig-page"]', 8000),
      SHOT("e-signatures"),
    ],
  },
  {
    page: "/compliance/e-signatures",
    label: "E-Signatures: fill form (no submit)",
    cmds: [
      FILL('[data-testid="esig-entity-type"]', "tour-demo"),
      FILL('[data-testid="esig-entity-id"]', "00000000-0000-0000-0000-000000000000"),
      FILL('[data-testid="esig-action"]', "approve"),
      FILL('[data-testid="esig-reason"]', "Tour walkthrough — no real signature submitted."),
      FILL('[data-testid="esig-witness"]', "witness@example.com"),
      W(400),
      CLICK('[data-testid="esig-confirmation"]'),
      W(300),
      SHOT("esig-filled"),
    ],
  },
  {
    page: "/compliance/data-integrity",
    label: "Data Integrity (ALCOA+): open page",
    cmds: [
      CLICK('[data-testid="comp-alcoa"]'),
      W(600),
      SEE('[data-testid="alcoa-page"]', 8000),
      SEE('[data-testid="alcoa-score"]'),
      SHOT("alcoa"),
    ],
  },
  {
    page: "/compliance/validation",
    label: "Validation IQ/OQ/PQ: open page",
    cmds: [
      CLICK('[data-testid="comp-val"]'),
      W(600),
      SEE('[data-testid="validation-page"]', 8000),
      SHOT("validation"),
    ],
  },
];

// ---------- 111 challenges (auto-generated tour steps) ----------

// Map every challenge category to the route where its bonus section lives.
const CHALLENGE_ROUTE: Record<Challenge["category"], string> = {
  interactions: "/playground/interactions",
  async: "/playground/async",
  files: "/playground/files",
  security: "/playground/security",
  a11y: "/playground/a11y",
  legacy: "/playground/legacy",
  misc: "/playground/all", // bonuses live in the All Challenges page
};

function interactionForChallenge(c: Challenge): Cmd[] {
  const t = c.testId;
  switch (c.kind) {
    case "click-counter":
      return [CLICK(`[data-testid="${t}-btn"]`), W(120), CLICK(`[data-testid="${t}-btn"]`), W(120)];
    case "toggle":
      return [CLICK(`[data-testid="${t}-switch"]`), W(150)];
    case "checkbox":
      return [CLICK(`[data-testid="${t}-cb"]`), W(150)];
    case "radio-group":
      return [CLICK(`[data-testid="${t}-opt-b"]`), W(150)];
    case "text-input":
      return [FILL(`[data-testid="${t}-input"]`, "qa"), W(150)];
    case "number-input":
      return [CLICK(`[data-testid="${t}-inc"]`), W(80), CLICK(`[data-testid="${t}-inc"]`), W(80)];
    case "select":
      return [CLICK(`[data-testid="${t}-trigger"]`), W(250), CLICK(`[data-testid="${t}-item-gamma"]`), W(150)];
    case "tabs":
      return [CLICK(`[data-testid="${t}-tab-2"]`), W(150)];
    case "accordion":
      return [CLICK(`[data-testid="${t}-trigger"]`), W(200)];
    case "dialog":
      return [CLICK(`[data-testid="${t}-open"]`), W(300), CLICK(`[data-testid="${t}-cancel"]`), W(200)];
    case "popover":
      return [CLICK(`[data-testid="${t}-trigger"]`), W(250)];
    case "tooltip-hover":
      return [SCROLL(`[data-testid="${t}-trigger"]`), W(250)];
    case "color-picker":
      return [CLICK(`[data-testid="${t}-swatch-1"]`), W(150)];
    case "rating":
      return [CLICK(`[data-testid="${t}-star-4"]`), W(150)];
    case "copy-button":
      return [CLICK(`[data-testid="${t}-copy"]`), W(200)];
    case "delayed-button":
      return [W(700), CLICK(`[data-testid="${t}-btn"]`), W(150)];
    case "confirm-button":
      return [CLICK(`[data-testid="${t}-btn"]`), W(200), CLICK(`[data-testid="${t}-btn"]`), W(200)];
    case "long-press":
      // The driver lacks a real long-press primitive, so we just highlight.
      return [SCROLL(`[data-testid="${t}-btn"]`), W(300)];
    case "scroll-into-view":
      return [SCROLL(`[data-testid="${t}-target"]`), W(200)];
    case "lazy-image":
      return [W(600), SEE(`[data-testid="${t}-img"]`, 4000)];
    case "stepper-form":
      return [CLICK(`[data-testid="${t}-next"]`), W(120), CLICK(`[data-testid="${t}-next"]`), W(120)];
    case "filter-list":
      return [FILL(`[data-testid="${t}-input"]`, "apple"), W(200)];
  }
}

function buildChallengeSteps(): TourStep[] {
  const steps: TourStep[] = [];
  let currentRoute: string | null = null;
  for (const c of CHALLENGES) {
    const route = CHALLENGE_ROUTE[c.category];
    const cmds: Cmd[] = [];
    if (route !== currentRoute) {
      cmds.push(GOTO(route), W(500));
      currentRoute = route;
    }
    cmds.push(SCROLL(`[data-testid="${c.testId}"]`), W(150));
    cmds.push(...interactionForChallenge(c));
    steps.push({
      page: route,
      label: `Challenge ${c.id}/111 · ${CATEGORY_LABELS[c.category]} · ${c.label}`,
      cmds,
    });
  }
  return steps;
}

const challengeSteps: TourStep[] = buildChallengeSteps();

// Final flourish: walk back to overview.
const finaleSteps: TourStep[] = [
  {
    page: "/playground",
    label: "Tour complete — return to overview",
    cmds: [GOTO("/playground"), W(500), SHOT("done")],
  },
];

export const PLAYGROUND_TOUR: TourStep[] = [
  ...loginSteps,
  ...overviewSteps,
  ...interactionsSteps,
  ...asyncSteps,
  ...filesSteps,
  ...securitySteps,
  ...a11ySteps,
  ...legacySteps,
  ...complianceSteps,
  ...challengeSteps,
  ...finaleSteps,
];

export const TOUR_TOTAL_STEPS = PLAYGROUND_TOUR.length;
export const TOUR_TOTAL_CMDS = PLAYGROUND_TOUR.reduce((n, s) => n + s.cmds.length, 0);

// ────────────────────────────────────────────────────────────────────────────
// Catalog suite — wraps every PwTest from playwright-tests.ts as a TourStep
// using buildScenario(). This lets the global runner execute all 224 catalog
// tests live in the iframe right after the playground tour, in one run.
// ────────────────────────────────────────────────────────────────────────────
import { PLAYWRIGHT_TESTS, type PwTest } from "./playwright-tests";
import { buildScenario } from "./live-scenarios";

const CATEGORY_ROUTE: Record<string, string> = {
  Smoke: "/dashboard",
  "Auth & MFA": "/auth",
  Regression: "/dashboard",
  "E2E Journeys": "/tasks",
  Accessibility: "/playground/a11y",
  Visual: "/dashboard",
  API: "/tasks",
  Performance: "/quality-metrics",
  Security: "/security",
  Mobile: "/dashboard",
  "Compliance (21 CFR Part 11)": "/compliance/audit-trail",
  "Chaos / Resilience": "/chaos/experiments",
};

function buildCatalogSteps(): TourStep[] {
  const steps: TourStep[] = [];
  for (const test of PLAYWRIGHT_TESTS as PwTest[]) {
    const route = CATEGORY_ROUTE[test.category] ?? "/dashboard";
    let cmds: Cmd[];
    try {
      const scenario = buildScenario(test);
      cmds = scenario.cmds.length > 0
        ? scenario.cmds
        : [GOTO(route), W(200)];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      cmds = [{ kind: "log", message: `scenario error: ${msg}` }, GOTO(route), W(200)];
    }
    steps.push({
      page: route,
      label: `Catalog · ${test.id} · ${test.title}`,
      cmds: [{ kind: "log", message: `▶ ${test.id} — ${test.title}` }, ...cmds],
    });
  }
  return steps;
}

export const CATALOG_SUITE_STEPS: TourStep[] = buildCatalogSteps();
export const CATALOG_SUITE_TOTAL = CATALOG_SUITE_STEPS.length;

// Combined super-suite the global runner walks through.
export const FULL_SUITE_STEPS: TourStep[] = [
  ...PLAYGROUND_TOUR,
  ...CATALOG_SUITE_STEPS,
];
export const FULL_SUITE_TOTAL_STEPS = FULL_SUITE_STEPS.length;
export const FULL_SUITE_TOTAL_CMDS = FULL_SUITE_STEPS.reduce(
  (n, s) => n + s.cmds.length,
  0,
);
