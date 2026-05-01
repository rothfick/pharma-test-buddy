// Long, scripted "demo tour" of the QA Playground — clicks through every
// nested option on every Playground subpage so a viewer can watch the whole
// app being exercised in the live preview iframe. Kept entirely local: each
// step uses the LiveDriver (same-origin DOM control). Mutating actions are
// minimal and the global runner snapshots/restores tasks regardless.

import type { Cmd } from "./live-driver";

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

// ---------- per-page sequences ----------

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

// Final flourish: walk back to overview.
const finaleSteps: TourStep[] = [
  {
    page: "/playground",
    label: "Tour complete — return to overview",
    cmds: [GOTO("/playground"), W(500), SHOT("done")],
  },
];

export const PLAYGROUND_TOUR: TourStep[] = [
  ...overviewSteps,
  ...interactionsSteps,
  ...asyncSteps,
  ...filesSteps,
  ...securitySteps,
  ...a11ySteps,
  ...legacySteps,
  ...finaleSteps,
];

export const TOUR_TOTAL_STEPS = PLAYGROUND_TOUR.length;
export const TOUR_TOTAL_CMDS = PLAYGROUND_TOUR.reduce((n, s) => n + s.cmds.length, 0);
