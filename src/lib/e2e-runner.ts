// Browser-side runner for the E2E suite shown on /playwright-starter.
// Re-implements the same scenarios as the Vitest files in src/test/, but runs
// them live in the user's browser so the page can stream pass/fail status and
// logs without needing a CI shell.

import { LiveDriver } from "./live-driver";
import { buildScenario } from "./live-scenarios";
import { PLAYWRIGHT_TESTS } from "./playwright-tests";

export type E2EStatus = "idle" | "running" | "pass" | "fail" | "skipped";

export interface E2ECase {
  id: string;
  file: string;
  name: string;
  intent: string;
  run: (log: (line: string) => void) => Promise<void>;
}

export interface E2EEvent {
  type: "case-start" | "case-end" | "log";
  caseId: string;
  status?: E2EStatus;
  message?: string;
  durationMs?: number;
  error?: string;
}

// ---------- helpers ----------

function makeIframe(html: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><body>${html}</body></html>`);
  doc.close();
  return iframe;
}

function cleanup(...iframes: HTMLIFrameElement[]) {
  for (const f of iframes) f.parentElement?.removeChild(f);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function expectThrows(fn: () => Promise<unknown>, msg = "expected to throw") {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(msg);
}

// Wait for React commits to flush.
async function tick(ms = 50): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// Mount <PlaywrightStarter/> in a detached container with the providers it
// needs (router + react-query). Returns the container and an unmount fn.
async function mountPlaywrightStarter(): Promise<{
  container: HTMLDivElement;
  unmount: () => void;
}> {
  const [{ createRoot }, React, { MemoryRouter }, { QueryClient, QueryClientProvider }, { default: PlaywrightStarter }] =
    await Promise.all([
      import("react-dom/client"),
      import("react"),
      import("react-router-dom"),
      import("@tanstack/react-query"),
      import("@/pages/PlaywrightStarter"),
    ]);

  const container = document.createElement("div");
  container.setAttribute("data-e2e-mount", "playwright-starter");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = "1280px";
  container.style.height = "800px";
  document.body.appendChild(container);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const root = createRoot(container);
  root.render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/playwright-starter"] },
        React.createElement(PlaywrightStarter),
      ),
    ),
  );
  // Let initial render commit.
  await tick(120);
  return {
    container,
    unmount: () => {
      root.unmount();
      container.parentElement?.removeChild(container);
    },
  };
}

// Switch to the "Test Catalog" tab and select the first test so the
// RunWithPreview stage mounts in the DOM.
async function openFirstTestDetail(
  container: HTMLDivElement,
  log: (line: string) => void,
): Promise<void> {
  // Tabs use role=tab; pick the catalog tab via its stable test-id.
  const catalogTab =
    container.querySelector<HTMLElement>('[data-testid="tab-catalog"]') ??
    Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).find((t) =>
      /test catalog/i.test(t.textContent ?? ""),
    );
  if (catalogTab) {
    catalogTab.click();
    await tick(80);
    log("switched to Test Catalog tab");
  }
  // The detail card auto-selects the first test. Just wait for the stage.
  for (let i = 0; i < 30; i++) {
    if (container.querySelector('[data-testid^="run-manually-"]')) return;
    await tick(50);
  }
}

// ---------- cases ----------

const CASES: E2ECase[] = [
  // ===== live-driver.test.ts =====
  {
    id: "drv-click",
    file: "live-driver.test.ts",
    name: "waits for selector and clicks it",
    intent: "Czeka aż element pojawi się w DOM iframe i wykonuje na nim kliknięcie.",
    run: async (log) => {
      const iframe = makeIframe(
        `<button data-testid="go" id="b">Go</button><span data-testid="out"></span>`,
      );
      try {
        const win = iframe.contentWindow!;
        win.document.getElementById("b")!.addEventListener("click", () => {
          win.document.querySelector('[data-testid="out"]')!.textContent = "clicked";
        });
        const events: string[] = [];
        const driver = new LiveDriver({
          iframe,
          origin: location.origin,
          onEvent: (e) => events.push(e.type),
        });
        await driver.runOne({ kind: "click", selector: '[data-testid="go"]' });
        log("clicked button, output text =");
        log(`  "${win.document.querySelector('[data-testid="out"]')!.textContent}"`);
        assert(
          win.document.querySelector('[data-testid="out"]')!.textContent === "clicked",
          "click did not toggle output",
        );
        assert(events.includes("highlight"), "no highlight event emitted");
      } finally {
        cleanup(iframe);
      }
    },
  },
  {
    id: "drv-fill",
    file: "live-driver.test.ts",
    name: "fills an input via the React-compatible setter",
    intent: "Wpisuje wartość do <input> przez natywny setter, aby React/Zod ją zauważyły.",
    run: async (log) => {
      const iframe = makeIframe(`<input data-testid="email" />`);
      try {
        const driver = new LiveDriver({ iframe, origin: location.origin });
        await driver.runOne({ kind: "fill", selector: '[data-testid="email"]', value: "x@y.z" });
        const input = iframe.contentDocument!.querySelector<HTMLInputElement>(
          '[data-testid="email"]',
        )!;
        log(`input.value = "${input.value}"`);
        assert(input.value === "x@y.z", "fill did not set value");
      } finally {
        cleanup(iframe);
      }
    },
  },
  {
    id: "drv-expect-visible-throws",
    file: "live-driver.test.ts",
    name: "expectVisible throws on missing element",
    intent: "Asercja widoczności rzuca błąd, gdy elementu nie ma.",
    run: async (log) => {
      const iframe = makeIframe(`<span></span>`);
      try {
        const driver = new LiveDriver({
          iframe,
          origin: location.origin,
          defaultTimeoutMs: 200,
        });
        log("expecting [data-testid=nope] (should fail)");
        await expectThrows(() =>
          driver.runOne({
            kind: "expectVisible",
            selector: '[data-testid="nope"]',
            timeoutMs: 200,
          }),
        );
      } finally {
        cleanup(iframe);
      }
    },
  },
  {
    id: "drv-expect-text",
    file: "live-driver.test.ts",
    name: "expectText matches case-insensitively",
    intent: "Asercja tekstu działa niezależnie od wielkości liter.",
    run: async (log) => {
      const iframe = makeIframe(`<div data-testid="msg">HELLO World</div>`);
      try {
        const driver = new LiveDriver({ iframe, origin: location.origin });
        log("matching 'hello' against 'HELLO World'");
        await driver.runOne({
          kind: "expectText",
          selector: '[data-testid="msg"]',
          text: "hello",
        });
      } finally {
        cleanup(iframe);
      }
    },
  },
  {
    id: "drv-stop-on-fail",
    file: "live-driver.test.ts",
    name: "runAll stops at the first failure",
    intent: "Sekwencja komend zatrzymuje się przy pierwszym niepowodzeniu.",
    run: async (log) => {
      const iframe = makeIframe(`<button data-testid="ok"></button>`);
      try {
        const events: { type: string; message?: string }[] = [];
        const driver = new LiveDriver({
          iframe,
          origin: location.origin,
          onEvent: (e) => events.push({ type: e.type, message: e.message }),
          defaultTimeoutMs: 200,
        });
        const r = await driver.runAll([
          { kind: "click", selector: '[data-testid="ok"]' },
          { kind: "expectVisible", selector: '[data-testid="missing"]', timeoutMs: 200 },
          { kind: "log", message: "should-not-run" },
        ]);
        log(`ok=${r.ok} failedAt=${r.failedAt}`);
        assert(r.ok === false, "expected runAll to fail");
        assert(r.failedAt === 1, `failedAt should be 1, got ${r.failedAt}`);
        assert(
          events.filter((e) => e.type === "log" && e.message === "should-not-run").length === 0,
          "third command was not skipped",
        );
      } finally {
        cleanup(iframe);
      }
    },
  },
  {
    id: "drv-cancel",
    file: "live-driver.test.ts",
    name: "cancel() short-circuits the run",
    intent: "Wywołanie cancel() natychmiast przerywa bieżący run.",
    run: async (log) => {
      const iframe = makeIframe(`<button data-testid="ok"></button>`);
      try {
        const driver = new LiveDriver({ iframe, origin: location.origin });
        driver.cancel();
        const r = await driver.runAll([{ kind: "click", selector: '[data-testid="ok"]' }]);
        log(`ok=${r.ok} error=${r.error}`);
        assert(r.ok === false, "expected cancelled run to fail");
        assert(r.error === "Cancelled", "expected error 'Cancelled'");
      } finally {
        cleanup(iframe);
      }
    },
  },
  {
    id: "drv-screenshot",
    file: "live-driver.test.ts",
    name: "emits screenshot events",
    intent: "Driver emituje zdarzenia screenshot dla podglądu w UI.",
    run: async (log) => {
      const iframe = makeIframe(``);
      try {
        const events: { type: string; label?: string }[] = [];
        const driver = new LiveDriver({
          iframe,
          origin: location.origin,
          onEvent: (e) => events.push({ type: e.type, label: e.label }),
        });
        await driver.runOne({ kind: "screenshot", label: "shot.png" });
        const found = events.find((e) => e.type === "screenshot");
        log(`screenshot label = ${found?.label}`);
        assert(found?.label === "shot.png", "screenshot event missing");
      } finally {
        cleanup(iframe);
      }
    },
  },

  // ===== live-scenarios.test.ts =====
  {
    id: "scn-all-mapped",
    file: "live-scenarios.test.ts",
    name: "returns a scenario for every catalog test",
    intent: "Każdy z 224 testów ma niepustą sekwencję komend i poprawne zakresy kroków.",
    run: async (log) => {
      let count = 0;
      for (const t of PLAYWRIGHT_TESTS) {
        const s = buildScenario(t);
        assert(s.cmds.length > 0, `${t.id}: empty scenario`);
        assert(
          s.stepRanges.length >= t.steps.length,
          `${t.id}: missing stepRanges`,
        );
        let prevEnd = -1;
        for (const r of s.stepRanges) {
          assert(r.start >= 0, `${t.id}: bad start`);
          assert(r.end < s.cmds.length, `${t.id}: bad end`);
          assert(r.start >= prevEnd, `${t.id}: ranges out of order`);
          prevEnd = r.end;
        }
        count++;
      }
      log(`validated ${count} catalog tests`);
    },
  },
  {
    id: "scn-auth-invalid",
    file: "live-scenarios.test.ts",
    name: "Auth invalid scenario uses /auth and submits",
    intent: "Scenariusz logowania wchodzi na /auth i klika przycisk submit.",
    run: async (log) => {
      const t = PLAYWRIGHT_TESTS.find(
        (x) => x.category === "Auth & MFA" && /invalid|wrong|weak|reject/i.test(x.title),
      );
      if (!t) {
        log("no matching catalog test (skipped)");
        return;
      }
      const s = buildScenario(t);
      const goto = s.cmds.find((c) => c.kind === "goto") as { kind: "goto"; path: string };
      log(`goto.path = ${goto?.path}`);
      assert(goto?.path === "/auth", "scenario must navigate to /auth");
      assert(
        s.cmds.some(
          (c) => c.kind === "click" && (c as { selector: string }).selector.includes("signin-submit"),
        ),
        "scenario must click signin-submit",
      );
    },
  },
  {
    id: "scn-wizard-mutates",
    file: "live-scenarios.test.ts",
    name: "flags wizard happy path as mutating",
    intent: "Happy-path kreatora jest oznaczony jako mutujący dane (wymaga rollbacku).",
    run: async (log) => {
      const t = PLAYWRIGHT_TESTS.find(
        (x) => /wizard/i.test(x.title) && !/valid|reject|require/i.test(x.title),
      );
      if (!t) {
        log("no matching wizard test (skipped)");
        return;
      }
      const s = buildScenario(t);
      log(`mutates = ${s.mutates}`);
      assert(s.mutates === true, "wizard happy path should mutate");
    },
  },
  {
    id: "scn-smoke-readonly",
    file: "live-scenarios.test.ts",
    name: "flags read-only Smoke/Visual scenarios as non-mutating",
    intent: "Scenariusze Smoke są tylko-do-odczytu i nie wymagają rollbacku.",
    run: async (log) => {
      const t = PLAYWRIGHT_TESTS.find((x) => x.category === "Smoke");
      if (!t) {
        log("no Smoke test (skipped)");
        return;
      }
      const s = buildScenario(t);
      log(`mutates = ${s.mutates}`);
      assert(s.mutates === false, "Smoke test should not mutate");
    },
  },

  // ===== playwright-starter-preview.test.tsx =====
  // Real DOM tests: mount <PlaywrightStarter/> in a detached container with
  // MemoryRouter + QueryClient and assert the new "Run manually" UX wired
  // into the Test source section.
  {
    id: "ui-render-stage",
    file: "playwright-starter-preview.test.tsx",
    name: "renders the catalog with a Run manually button per test",
    intent: "Mountuje stronę i sprawdza, że pierwszy test ma przycisk Run manually.",
    run: async (log) => {
      const m = await mountPlaywrightStarter();
      try {
        await openFirstTestDetail(m.container, log);
        const btn = m.container.querySelector('[data-testid^="run-manually-"]');
        assert(btn, "expected a [data-testid^=run-manually-] button");
        log(`found ${btn.getAttribute("data-testid")}`);
      } finally {
        m.unmount();
      }
    },
  },
  {
    id: "ui-expand",
    file: "playwright-starter-preview.test.tsx",
    name: "clicking Run manually opens the live preview dialog",
    intent: "Klika Run manually i weryfikuje, że dialog z LiveBrowser się otwiera.",
    run: async (log) => {
      const m = await mountPlaywrightStarter();
      try {
        await openFirstTestDetail(m.container, log);
        const btn = m.container.querySelector<HTMLButtonElement>(
          '[data-testid^="run-manually-"]',
        );
        assert(btn, "Run manually button not found");
        btn.click();
        await tick(120);
        const dialog = document.querySelector('[role="dialog"]');
        assert(dialog, "dialog did not open");
        const iframe = dialog.querySelector("iframe");
        assert(iframe, "live preview iframe missing in dialog");
        log("dialog opened with iframe");
        // close to leave clean state — try ESC
        const ev = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
        dialog.dispatchEvent(ev);
        await tick(60);
      } finally {
        m.unmount();
      }
    },
  },
  {
    id: "ui-close",
    file: "playwright-starter-preview.test.tsx",
    name: "Close button dismisses the manual run dialog",
    intent: "Otwiera dialog i zamyka go przyciskiem Close.",
    run: async (log) => {
      const m = await mountPlaywrightStarter();
      try {
        await openFirstTestDetail(m.container, log);
        const btn = m.container.querySelector<HTMLButtonElement>(
          '[data-testid^="run-manually-"]',
        );
        assert(btn, "Run manually button not found");
        btn.click();
        await tick(120);
        let dialog = document.querySelector('[role="dialog"]');
        assert(dialog, "dialog did not open");
        // Find a button labelled "Close" inside the dialog
        const closeBtn = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(
          (b) => /^\s*close\s*$/i.test(b.textContent ?? ""),
        );
        assert(closeBtn, "Close button not found");
        closeBtn.click();
        await tick(120);
        dialog = document.querySelector('[role="dialog"]');
        assert(!dialog, "dialog still present after Close");
        log("dialog closed via Close button");
      } finally {
        m.unmount();
      }
    },
  },
  {
    id: "ui-backdrop",
    file: "playwright-starter-preview.test.tsx",
    name: "Escape key dismisses the manual run dialog",
    intent: "Otwiera dialog i zamyka go klawiszem Escape (Radix overlay).",
    run: async (log) => {
      const m = await mountPlaywrightStarter();
      try {
        await openFirstTestDetail(m.container, log);
        const btn = m.container.querySelector<HTMLButtonElement>(
          '[data-testid^="run-manually-"]',
        );
        assert(btn, "Run manually button not found");
        btn.click();
        await tick(120);
        let dialog = document.querySelector('[role="dialog"]');
        assert(dialog, "dialog did not open");
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        await tick(150);
        dialog = document.querySelector('[role="dialog"]');
        assert(!dialog, "dialog still present after Escape");
        log("dialog dismissed via Escape");
      } finally {
        m.unmount();
      }
    },
  },
];

export const E2E_CASES = CASES;
export const E2E_TOTAL = CASES.length;

export interface RunHandle {
  cancel: () => void;
  done: Promise<void>;
}

export function runE2E(opts: {
  cases?: E2ECase[];
  onEvent: (e: E2EEvent) => void;
}): RunHandle {
  const list = opts.cases ?? CASES;
  let cancelled = false;
  const done = (async () => {
    for (const c of list) {
      if (cancelled) break;
      const start = performance.now();
      opts.onEvent({ type: "case-start", caseId: c.id, status: "running" });
      try {
        await c.run((line) => opts.onEvent({ type: "log", caseId: c.id, message: line }));
        opts.onEvent({
          type: "case-end",
          caseId: c.id,
          status: "pass",
          durationMs: Math.round(performance.now() - start),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isSkip = msg === "__skip__";
        opts.onEvent({
          type: "case-end",
          caseId: c.id,
          status: isSkip ? "skipped" : "fail",
          durationMs: Math.round(performance.now() - start),
          error: isSkip ? undefined : msg,
        });
      }
      // Yield so React can paint between cases.
      await new Promise((r) => setTimeout(r, 8));
    }
  })();
  return {
    cancel: () => {
      cancelled = true;
    },
    done,
  };
}
