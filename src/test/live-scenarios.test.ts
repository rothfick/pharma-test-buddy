import { describe, it, expect } from "vitest";
import { buildScenario } from "@/lib/live-scenarios";
import { PLAYWRIGHT_TESTS } from "@/lib/playwright-tests";

describe("live-scenarios.buildScenario", () => {
  it("returns a scenario for every catalog test", () => {
    for (const t of PLAYWRIGHT_TESTS) {
      const s = buildScenario(t);
      expect(s.cmds.length).toBeGreaterThan(0);
      expect(s.stepRanges.length).toBeGreaterThanOrEqual(t.steps.length);
      // every range is in-bounds and ordered
      let prevEnd = -1;
      for (const r of s.stepRanges) {
        expect(r.start).toBeGreaterThanOrEqual(0);
        expect(r.end).toBeLessThan(s.cmds.length);
        expect(r.start).toBeGreaterThanOrEqual(prevEnd);
        prevEnd = r.end;
      }
    }
  });

  it("Auth invalid scenario uses /auth and submits", () => {
    const t = PLAYWRIGHT_TESTS.find((x) => x.category === "Auth & MFA" && /invalid|wrong|weak|reject/i.test(x.title));
    if (!t) return;
    const s = buildScenario(t);
    const goto = s.cmds.find((c) => c.kind === "goto") as { kind: "goto"; path: string };
    expect(goto.path).toBe("/auth");
    expect(s.cmds.some((c) => c.kind === "click" && c.selector.includes("signin-submit"))).toBe(true);
  });

  it("flags wizard happy path as mutating", () => {
    const t = PLAYWRIGHT_TESTS.find((x) => /wizard/i.test(x.title) && !/valid|reject|require/i.test(x.title));
    if (!t) return;
    const s = buildScenario(t);
    expect(s.mutates).toBe(true);
  });

  it("flags read-only Smoke/Visual scenarios as non-mutating", () => {
    const t = PLAYWRIGHT_TESTS.find((x) => x.category === "Smoke");
    if (!t) return;
    const s = buildScenario(t);
    expect(s.mutates).toBe(false);
  });
});
