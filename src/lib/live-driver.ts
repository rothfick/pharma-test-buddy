// Real in-browser test driver. Drives the live application loaded inside an
// <iframe> using same-origin DOM access. Supports navigation, querying, click,
// fill, assertions and screenshots (visual highlights). Reports a stream of
// events the UI can render in real time.

export type CmdKind =
  | "goto"
  | "wait"
  | "waitForSelector"
  | "click"
  | "fill"
  | "press"
  | "select"
  | "expectVisible"
  | "expectText"
  | "expectUrl"
  | "expectCount"
  | "evaluate"
  | "screenshot"
  | "scrollIntoView"
  | "log";

export type Cmd =
  | { kind: "goto"; path: string; timeoutMs?: number }
  | { kind: "wait"; ms: number }
  | { kind: "waitForSelector"; selector: string; timeoutMs?: number }
  | { kind: "click"; selector: string; timeoutMs?: number }
  | { kind: "fill"; selector: string; value: string; timeoutMs?: number }
  | { kind: "press"; selector: string; key: string }
  | { kind: "select"; selector: string; value: string }
  | { kind: "expectVisible"; selector: string; timeoutMs?: number }
  | { kind: "expectText"; selector: string; text: string; timeoutMs?: number }
  | { kind: "expectUrl"; pattern: string | RegExp; timeoutMs?: number }
  | { kind: "expectCount"; selector: string; min?: number; max?: number }
  | { kind: "evaluate"; fn: (win: Window) => unknown | Promise<unknown> }
  | { kind: "screenshot"; label: string }
  | { kind: "scrollIntoView"; selector: string }
  | { kind: "log"; message: string };

export interface DriverEvent {
  type: "step-start" | "step-end" | "log" | "highlight" | "cursor" | "screenshot" | "url";
  cmd?: Cmd;
  ok?: boolean;
  error?: string;
  message?: string;
  rect?: { x: number; y: number; w: number; h: number }; // % of iframe viewport
  url?: string;
  label?: string;
  durationMs?: number;
}

export interface DriverOptions {
  iframe: HTMLIFrameElement;
  origin: string; // window.location.origin
  onEvent?: (e: DriverEvent) => void;
  defaultTimeoutMs?: number;
  cancelRef?: { current: boolean };
}

export class LiveDriver {
  private iframe: HTMLIFrameElement;
  private origin: string;
  private onEvent: (e: DriverEvent) => void;
  private defaultTimeoutMs: number;
  private cancelRef: { current: boolean };

  constructor(opts: DriverOptions) {
    this.iframe = opts.iframe;
    this.origin = opts.origin;
    this.onEvent = opts.onEvent ?? (() => {});
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 15000;
    this.cancelRef = opts.cancelRef ?? { current: false };
  }

  cancel() {
    this.cancelRef.current = true;
  }

  get win(): Window | null {
    return this.iframe.contentWindow;
  }
  get doc(): Document | null {
    try {
      return this.iframe.contentDocument;
    } catch {
      return null;
    }
  }

  async runAll(cmds: Cmd[]): Promise<{ ok: boolean; failedAt?: number; error?: string }> {
    for (let i = 0; i < cmds.length; i++) {
      if (this.cancelRef.current) return { ok: false, error: "Cancelled" };
      const cmd = cmds[i];
      const t0 = performance.now();
      this.onEvent({ type: "step-start", cmd });
      try {
        await this.runOne(cmd);
        this.onEvent({
          type: "step-end",
          cmd,
          ok: true,
          durationMs: Math.round(performance.now() - t0),
        });
      } catch (e) {
        const msg = (e as Error).message;
        this.onEvent({
          type: "step-end",
          cmd,
          ok: false,
          error: msg,
          durationMs: Math.round(performance.now() - t0),
        });
        return { ok: false, failedAt: i, error: msg };
      }
    }
    return { ok: true };
  }

  async runOne(cmd: Cmd): Promise<void> {
    switch (cmd.kind) {
      case "goto":
        return this.goto(cmd.path, cmd.timeoutMs);
      case "wait":
        return this.sleep(cmd.ms);
      case "waitForSelector":
        await this.waitForSelector(cmd.selector, cmd.timeoutMs);
        return;
      case "click": {
        const el = await this.waitForSelector(cmd.selector, cmd.timeoutMs);
        await this.scrollIntoViewEl(el);
        await this.emitRect(el);
        await this.sleep(140);
        (el as HTMLElement).click();
        return;
      }
      case "fill": {
        const el = (await this.waitForSelector(cmd.selector, cmd.timeoutMs)) as HTMLInputElement;
        await this.scrollIntoViewEl(el);
        await this.emitRect(el);
        el.focus();
        await this.typeIntoInput(el, cmd.value);
        return;
      }
      case "press": {
        const el = (await this.waitForSelector(cmd.selector)) as HTMLElement;
        el.focus();
        const ev = new KeyboardEvent("keydown", { key: cmd.key, bubbles: true });
        el.dispatchEvent(ev);
        return;
      }
      case "select": {
        const el = (await this.waitForSelector(cmd.selector)) as HTMLSelectElement;
        el.value = cmd.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
      case "expectVisible": {
        const el = await this.waitForSelector(cmd.selector, cmd.timeoutMs);
        if (!this.isVisible(el)) throw new Error(`Element not visible: ${cmd.selector}`);
        await this.emitRect(el);
        return;
      }
      case "expectText": {
        const el = await this.waitForSelector(cmd.selector, cmd.timeoutMs);
        const txt = (el.textContent ?? "").trim();
        if (!txt.toLowerCase().includes(cmd.text.toLowerCase()))
          throw new Error(`Text "${cmd.text}" not found in ${cmd.selector}. Got: "${txt.slice(0, 80)}"`);
        await this.emitRect(el);
        return;
      }
      case "expectUrl": {
        const ok = await this.pollUntil(() => {
          const u = this.win?.location.pathname ?? "";
          return typeof cmd.pattern === "string" ? u.includes(cmd.pattern) : cmd.pattern.test(u);
        }, cmd.timeoutMs);
        if (!ok) throw new Error(`URL did not match ${cmd.pattern}. Current: ${this.win?.location.pathname}`);
        return;
      }
      case "expectCount": {
        const doc = this.requireDoc();
        const n = doc.querySelectorAll(cmd.selector).length;
        if (cmd.min !== undefined && n < cmd.min) throw new Error(`Expected >= ${cmd.min} of ${cmd.selector}, got ${n}`);
        if (cmd.max !== undefined && n > cmd.max) throw new Error(`Expected <= ${cmd.max} of ${cmd.selector}, got ${n}`);
        return;
      }
      case "evaluate": {
        if (!this.win) throw new Error("iframe window not available");
        const r = cmd.fn(this.win);
        if (r instanceof Promise) await r;
        return;
      }
      case "screenshot": {
        this.onEvent({ type: "screenshot", label: cmd.label });
        return;
      }
      case "scrollIntoView": {
        const el = await this.waitForSelector(cmd.selector);
        await this.scrollIntoViewEl(el);
        return;
      }
      case "log": {
        this.onEvent({ type: "log", message: cmd.message });
        return;
      }
    }
  }

  /* ---------------- internals ---------------- */

  private requireDoc(): Document {
    const d = this.doc;
    if (!d) throw new Error("iframe document not accessible");
    return d;
  }

  async goto(path: string, timeoutMs = this.defaultTimeoutMs) {
    const url = path.startsWith("http") ? path : `${this.origin}${path}`;
    return new Promise<void>((resolve, reject) => {
      const onLoad = async () => {
        this.iframe.removeEventListener("load", onLoad);
        clearTimeout(timer);
        this.onEvent({ type: "url", url: this.win?.location.pathname ?? path });
        // Wait for the auth loader to disappear (ProtectedRoute hydration).
        await this.pollUntil(() => {
          const d = this.doc;
          if (!d) return false;
          return !d.querySelector('[data-testid="auth-loading"]');
        }, 8000);
        setTimeout(resolve, 200);
      };
      const timer = setTimeout(() => {
        this.iframe.removeEventListener("load", onLoad);
        reject(new Error(`Navigation timeout after ${timeoutMs}ms (${path})`));
      }, timeoutMs);
      this.iframe.addEventListener("load", onLoad);
      try {
        this.iframe.src = url;
      } catch (e) {
        clearTimeout(timer);
        reject(e as Error);
      }
    });
  }

  async waitForSelector(selector: string, timeoutMs = this.defaultTimeoutMs): Promise<Element> {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (this.cancelRef.current) throw new Error("Cancelled");
      const doc = this.doc;
      if (doc) {
        const el = doc.querySelector(selector);
        if (el) return el;
      }
      await this.sleep(80);
    }
    throw new Error(`Selector not found: ${selector}`);
  }

  private async pollUntil(fn: () => boolean, timeoutMs = this.defaultTimeoutMs): Promise<boolean> {
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      if (this.cancelRef.current) return false;
      try {
        if (fn()) return true;
      } catch {
        /* ignore */
      }
      await this.sleep(80);
    }
    return false;
  }

  private async typeIntoInput(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
    // React controlled inputs: use the native setter so React picks it up.
    const proto =
      el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    for (let i = 0; i <= text.length; i++) {
      if (this.cancelRef.current) return;
      const partial = text.slice(0, i);
      setter?.call(el, partial);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await this.sleep(35);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  private isVisible(el: Element): boolean {
    const r = (el as HTMLElement).getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const win = this.win!;
    const style = win.getComputedStyle(el as HTMLElement);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  private async scrollIntoViewEl(el: Element) {
    try {
      (el as HTMLElement).scrollIntoView({ block: "center", inline: "center", behavior: "instant" as ScrollBehavior });
    } catch {
      (el as HTMLElement).scrollIntoView();
    }
    await this.sleep(80);
  }

  private async emitRect(el: Element) {
    const win = this.win;
    if (!win) return;
    const r = (el as HTMLElement).getBoundingClientRect();
    const vw = win.innerWidth || 1;
    const vh = win.innerHeight || 1;
    this.onEvent({
      type: "highlight",
      rect: {
        x: (r.left / vw) * 100,
        y: (r.top / vh) * 100,
        w: (r.width / vw) * 100,
        h: (r.height / vh) * 100,
      },
    });
    this.onEvent({
      type: "cursor",
      rect: {
        x: ((r.left + r.width / 2) / vw) * 100,
        y: ((r.top + r.height / 2) / vh) * 100,
        w: 0,
        h: 0,
      },
    });
  }

  sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }
}
