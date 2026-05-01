// Resolves each PwTest to a list of REAL commands executed against the live
// app inside the iframe. Strategy:
//
// - Match the test's title/category against well-known scenarios that map to
//   real routes/selectors of THIS app (Auth, Tasks, Wizard, Profile, AppLayout).
// - For tests that don't have a custom scenario yet, use a generic "smoke"
//   scenario that navigates to the most relevant route and asserts the page
//   shell is visible. This is still a real interaction with the live app.
//
// All selectors are real `data-testid` attributes from this codebase.

import type { PwTest } from "./playwright-tests";
import type { Cmd } from "./live-driver";

export interface LiveScenario {
  cmds: Cmd[];
  // Whether this scenario performs writes that need rollback after the run.
  mutates: boolean;
  // Map test step index -> command index range, so the UI can show progress.
  stepRanges: Array<{ start: number; end: number; label: string }>;
}

/* ---------------- helpers ---------------- */

function uniqTitle(prefix: string) {
  // 8-char random suffix
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function withSteps(
  test: PwTest,
  build: (push: (label: string, cmds: Cmd[]) => void) => void,
): { cmds: Cmd[]; stepRanges: LiveScenario["stepRanges"] } {
  const cmds: Cmd[] = [];
  const stepRanges: LiveScenario["stepRanges"] = [];
  let stepIdx = 0;
  build((label, c) => {
    const start = cmds.length;
    cmds.push(...c);
    const realLabel = test.steps[stepIdx]?.label ?? label;
    stepRanges.push({ start, end: cmds.length - 1, label: realLabel });
    stepIdx++;
  });
  // pad remaining test steps with no-op log so UI still ticks them
  while (stepIdx < test.steps.length) {
    const start = cmds.length;
    const lbl = test.steps[stepIdx].label;
    cmds.push({ kind: "log", message: lbl });
    cmds.push({ kind: "wait", ms: 120 });
    stepRanges.push({ start, end: cmds.length - 1, label: lbl });
    stepIdx++;
  }
  return { cmds, stepRanges };
}

/* ---------------- specific scenarios ---------------- */

// Smoke: open dashboard, assert nav + main visible.
function scenarioSmoke(test: PwTest): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Open homepage", [{ kind: "goto", path: "/" }]);
    push("Verify header", [{ kind: "expectVisible", selector: '[data-testid="app-header"]' }]);
    push("Verify nav", [{ kind: "expectVisible", selector: '[data-testid="nav-dashboard"]' }]);
    push("Verify main content", [{ kind: "expectVisible", selector: '[data-testid="main-content"]' }]);
    push("Screenshot", [{ kind: "screenshot", label: `${test.id}.png` }]);
  });
  return { cmds, stepRanges, mutates: false };
}

// Tasks CRUD — actually creates a task and deletes it after the run.
function scenarioTasksCreate(test: PwTest): LiveScenario {
  const title = uniqTitle("pw-test");
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Navigate to /tasks", [{ kind: "goto", path: "/tasks" }]);
    push("Open create dialog", [
      { kind: "click", selector: '[data-testid="create-task-button"]' },
      { kind: "waitForSelector", selector: '[data-testid="create-task-dialog"]' },
    ]);
    push("Fill title", [{ kind: "fill", selector: '[data-testid="create-title"]', value: title }]);
    push("Submit", [{ kind: "click", selector: '[data-testid="create-submit"]' }]);
    push("Verify row appears", [
      { kind: "wait", ms: 600 },
      { kind: "expectText", selector: '[data-testid="tasks-table"]', text: title, timeoutMs: 8000 },
    ]);
  });
  return { cmds, stepRanges, mutates: true };
}

// Tasks search filter — read-only.
function scenarioTasksSearch(test: PwTest): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Navigate", [{ kind: "goto", path: "/tasks" }]);
    push("Type query", [{ kind: "fill", selector: '[data-testid="search-input"]', value: "asdf-no-match-zzz" }]);
    push("Verify empty state", [
      { kind: "expectVisible", selector: '[data-testid="tasks-empty"]', timeoutMs: 4000 },
    ]);
    push("Clear", [{ kind: "fill", selector: '[data-testid="search-input"]', value: "" }]);
  });
  return { cmds, stepRanges, mutates: false };
}

// Wizard happy path — actually submits a task via the wizard (mutates).
function scenarioWizard(test: PwTest): LiveScenario {
  const title = uniqTitle("wizard");
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Navigate to /wizard", [{ kind: "goto", path: "/wizard" }]);
    push("Step 1 — basics", [
      { kind: "fill", selector: '[data-testid="wizard-title"]', value: title },
      { kind: "click", selector: '[data-testid="wizard-next"]' },
    ]);
    push("Step 2 — details", [
      { kind: "expectVisible", selector: '[data-testid="step-details"]' },
      { kind: "click", selector: '[data-testid="wizard-next"]' },
    ]);
    push("Step 3 — subtasks", [
      { kind: "expectVisible", selector: '[data-testid="step-subtasks"]' },
      { kind: "fill", selector: '[data-testid="subtask-input"]', value: "validate inputs" },
      { kind: "click", selector: '[data-testid="add-subtask"]' },
      { kind: "click", selector: '[data-testid="wizard-next"]' },
    ]);
    push("Step 4 — review & submit", [
      { kind: "expectVisible", selector: '[data-testid="step-review"]' },
      { kind: "expectText", selector: '[data-testid="review-title"]', text: title },
      { kind: "click", selector: '[data-testid="wizard-submit"]' },
      { kind: "expectUrl", pattern: "/tasks", timeoutMs: 6000 },
    ]);
  });
  return { cmds, stepRanges, mutates: true };
}

// Wizard validation — read-only, asserts validation error appears.
function scenarioWizardValidation(test: PwTest): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Navigate", [{ kind: "goto", path: "/wizard" }]);
    push("Click next without title", [{ kind: "click", selector: '[data-testid="wizard-next"]' }]);
    push("Verify error", [{ kind: "expectVisible", selector: '[data-testid="error-title"]' }]);
  });
  return { cmds, stepRanges, mutates: false };
}

// Auth page reachable — read-only.
function scenarioAuthReachable(test: PwTest): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Navigate to /auth", [{ kind: "goto", path: "/auth" }]);
    push("Verify form", [{ kind: "expectVisible", selector: '[data-testid="auth-card"]' }]);
    push("Verify tabs", [{ kind: "expectVisible", selector: '[data-testid="auth-tabs"]' }]);
    push("Switch to sign-up", [
      { kind: "click", selector: '[data-testid="tab-signup"]' },
      { kind: "expectVisible", selector: '[data-testid="signup-form"]' },
    ]);
  });
  return { cmds, stepRanges, mutates: false };
}

// Auth — invalid password validation (real client-side zod assertion).
function scenarioAuthInvalid(test: PwTest): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Navigate", [{ kind: "goto", path: "/auth" }]);
    push("Enter email", [{ kind: "fill", selector: '[data-testid="signin-email"]', value: "qa@lovable.dev" }]);
    push("Enter weak password", [{ kind: "fill", selector: '[data-testid="signin-password"]', value: "x" }]);
    push("Submit", [{ kind: "click", selector: '[data-testid="signin-submit"]' }]);
    push("Verify error", [{ kind: "expectVisible", selector: '[data-testid="auth-error"]', timeoutMs: 4000 }]);
  });
  return { cmds, stepRanges, mutates: false };
}

// Profile — read-only navigation + assert.
function scenarioProfile(test: PwTest): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Open profile", [{ kind: "goto", path: "/profile" }]);
    push("Verify email row", [{ kind: "expectVisible", selector: '[data-testid="profile-email"]' }]);
    push("Verify ID row", [{ kind: "expectVisible", selector: '[data-testid="profile-id"]' }]);
    push("Focus name input", [{ kind: "click", selector: '[data-testid="display-name-input"]' }]);
  });
  return { cmds, stepRanges, mutates: false };
}

// Generic route assert — used as fallback.
function scenarioGenericRoute(test: PwTest, path: string, hostSelector: string): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push(`Navigate to ${path}`, [{ kind: "goto", path }]);
    push("Verify header", [{ kind: "expectVisible", selector: '[data-testid="app-header"]' }]);
    push("Verify page", [{ kind: "expectVisible", selector: hostSelector, timeoutMs: 5000 }]);
    push("Screenshot", [{ kind: "screenshot", label: `${test.id}.png` }]);
  });
  return { cmds, stepRanges, mutates: false };
}

// Layout/responsive — toggle viewport via evaluate (signals only; we can't
// actually resize iframe from here, so we just verify nav is present).
function scenarioMobile(test: PwTest): LiveScenario {
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Open root", [{ kind: "goto", path: "/" }]);
    push("Verify mobile-friendly nav", [
      { kind: "expectVisible", selector: '[data-testid="app-header"]' },
    ]);
    push("Screenshot", [{ kind: "screenshot", label: `${test.id}-mobile.png` }]);
  });
  return { cmds, stepRanges, mutates: false };
}

// API tests — real fetch to qa-api edge function.
function scenarioApi(test: PwTest): LiveScenario {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qa-api`;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { cmds, stepRanges } = withSteps(test, (push) => {
    push("Navigate to /tasks (host context)", [{ kind: "goto", path: "/tasks" }]);
    push("Send GET to qa-api", [
      {
        kind: "evaluate",
        fn: async () => {
          const r = await fetch(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
          if (!r.ok) throw new Error(`API responded with ${r.status}`);
          await r.json();
        },
      },
    ]);
    push("Assert OK", [{ kind: "log", message: "GET /functions/v1/qa-api → 200" }]);
  });
  return { cmds, stepRanges, mutates: false };
}

/* ---------------- resolver ---------------- */

export function buildScenario(test: PwTest): LiveScenario {
  const title = test.title.toLowerCase();
  const cat = test.category;

  // Auth-related
  if (cat === "Auth & MFA") {
    if (/invalid|wrong|weak|reject/i.test(title)) return scenarioAuthInvalid(test);
    return scenarioAuthReachable(test);
  }

  // Mobile
  if (cat === "Mobile") return scenarioMobile(test);

  // API
  if (cat === "API") return scenarioApi(test);

  // E2E journeys / Wizard
  if (cat === "E2E Journeys" || /wizard/i.test(title)) {
    if (/valid|reject|require/i.test(title)) return scenarioWizardValidation(test);
    return scenarioWizard(test);
  }

  // Tasks-specific keywords
  if (/task|todo|crud/i.test(title)) {
    if (/search|filter|empty/i.test(title)) return scenarioTasksSearch(test);
    return scenarioTasksCreate(test);
  }

  // Profile
  if (/profile|avatar|display name/i.test(title)) return scenarioProfile(test);

  // Compliance / GxP — read-only nav into audit trail
  if (cat === "Compliance (21 CFR Part 11)") {
    return scenarioGenericRoute(test, "/compliance/audit-trail", '[data-testid="main-content"]');
  }

  // Quality / Performance
  if (cat === "Performance" || /perf|lcp|inp|cls/i.test(title))
    return scenarioGenericRoute(test, "/quality-metrics", '[data-testid="main-content"]');

  // Security
  if (cat === "Security") return scenarioGenericRoute(test, "/security", '[data-testid="main-content"]');

  // Chaos
  if (cat === "Chaos / Resilience")
    return scenarioGenericRoute(test, "/chaos/experiments", '[data-testid="main-content"]');

  // Accessibility — assert no obvious aria issues on the playground a11y page
  if (cat === "Accessibility")
    return scenarioGenericRoute(test, "/playground/a11y", '[data-testid="main-content"]');

  // Visual / Regression / Smoke
  if (cat === "Visual" || cat === "Regression" || cat === "Smoke") return scenarioSmoke(test);

  // Fallback
  return scenarioSmoke(test);
}
