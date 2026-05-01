import { describe, it, expect, beforeEach } from "vitest";
import { LiveDriver, type DriverEvent } from "@/lib/live-driver";

// Build a fake same-origin iframe driven by a hand-rolled Document.
function makeIframe(html: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><body>${html}</body></html>`);
  doc.close();
  // jsdom doesn't implement scrollIntoView in the iframe realm either.
  const win = iframe.contentWindow as unknown as { Element: { prototype: { scrollIntoView?: () => void } } };
  if (win?.Element && !win.Element.prototype.scrollIntoView) {
    win.Element.prototype.scrollIntoView = function () {};
  }
  return iframe;
}

describe("LiveDriver", () => {
  let events: DriverEvent[];
  beforeEach(() => {
    events = [];
    document.body.innerHTML = "";
  });

  it("waits for selector and clicks it", async () => {
    const iframe = makeIframe(
      `<button data-testid="go" id="b">Go</button><span data-testid="out"></span>`,
    );
    const win = iframe.contentWindow!;
    win.document.getElementById("b")!.addEventListener("click", () => {
      win.document.querySelector('[data-testid="out"]')!.textContent = "clicked";
    });
    const driver = new LiveDriver({
      iframe,
      origin: "http://localhost",
      onEvent: (e) => events.push(e),
    });
    await driver.runOne({ kind: "click", selector: '[data-testid="go"]' });
    expect(win.document.querySelector('[data-testid="out"]')!.textContent).toBe("clicked");
    expect(events.some((e) => e.type === "highlight")).toBe(true);
  });

  it("fills an input via the React-compatible setter", async () => {
    const iframe = makeIframe(`<input data-testid="email" />`);
    const driver = new LiveDriver({ iframe, origin: "http://localhost" });
    await driver.runOne({ kind: "fill", selector: '[data-testid="email"]', value: "x@y.z" });
    const input = iframe.contentDocument!.querySelector<HTMLInputElement>('[data-testid="email"]')!;
    expect(input.value).toBe("x@y.z");
  });

  it("expectVisible throws on missing element", async () => {
    const iframe = makeIframe(`<span></span>`);
    const driver = new LiveDriver({ iframe, origin: "http://localhost", defaultTimeoutMs: 200 });
    await expect(
      driver.runOne({ kind: "expectVisible", selector: '[data-testid="nope"]', timeoutMs: 200 }),
    ).rejects.toThrow();
  });

  it("expectText matches case-insensitively", async () => {
    const iframe = makeIframe(`<div data-testid="msg">HELLO World</div>`);
    const driver = new LiveDriver({ iframe, origin: "http://localhost" });
    await driver.runOne({
      kind: "expectText",
      selector: '[data-testid="msg"]',
      text: "hello",
    });
  });

  it("runAll stops at the first failure", async () => {
    const iframe = makeIframe(`<button data-testid="ok"></button>`);
    const driver = new LiveDriver({
      iframe,
      origin: "http://localhost",
      onEvent: (e) => events.push(e),
      defaultTimeoutMs: 200,
    });
    const r = await driver.runAll([
      { kind: "click", selector: '[data-testid="ok"]' },
      { kind: "expectVisible", selector: '[data-testid="missing"]', timeoutMs: 200 },
      { kind: "log", message: "should-not-run" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.failedAt).toBe(1);
    expect(events.filter((e) => e.type === "log" && e.message === "should-not-run")).toHaveLength(0);
  });

  it("cancel() short-circuits the run", async () => {
    const iframe = makeIframe(`<button data-testid="ok"></button>`);
    const driver = new LiveDriver({ iframe, origin: "http://localhost" });
    driver.cancel();
    const r = await driver.runAll([{ kind: "click", selector: '[data-testid="ok"]' }]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("Cancelled");
  });

  it("emits screenshot events", async () => {
    const iframe = makeIframe(``);
    const driver = new LiveDriver({
      iframe,
      origin: "http://localhost",
      onEvent: (e) => events.push(e),
    });
    await driver.runOne({ kind: "screenshot", label: "shot.png" });
    expect(events.find((e) => e.type === "screenshot")?.label).toBe("shot.png");
  });
});
