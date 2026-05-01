// Registry of 111 Playground "challenges" (mini test targets). Each entry is a
// purely declarative description; the rendering is handled by generic
// challenge components, and the Playground Tour iterates this list to
// auto-generate one tour step per challenge.

export type ChallengeCategory =
  | "interactions"
  | "async"
  | "files"
  | "security"
  | "a11y"
  | "legacy"
  | "misc";

export type ChallengeKind =
  | "click-counter"        // button that increments a counter
  | "toggle"               // switch on/off
  | "checkbox"             // single checkbox
  | "radio-group"          // pick one of N
  | "text-input"           // type text and assert
  | "number-input"         // increment/decrement
  | "select"               // shadcn select
  | "tabs"                 // tabs within the card
  | "accordion"            // collapsible
  | "dialog"               // open + close modal
  | "popover"              // open popover
  | "tooltip-hover"        // tooltip on hover
  | "color-picker"         // pick a colour swatch
  | "rating"               // 1..5 stars
  | "copy-button"          // copy text to clipboard
  | "delayed-button"       // becomes enabled after N ms
  | "confirm-button"       // double-click to confirm
  | "long-press"           // hold for 800ms
  | "scroll-into-view"     // off-screen target
  | "lazy-image"           // image that appears after delay
  | "stepper-form"         // 3-step form
  | "filter-list";         // filter + assert items count

export interface Challenge {
  /** 1-based index. */
  id: number;
  category: ChallengeCategory;
  kind: ChallengeKind;
  /** Human label shown on the card. */
  label: string;
  /** Optional helper hint. */
  hint?: string;
  /** Stable test id for the root card. */
  testId: string;
}

const CATEGORY_QUOTAS: Record<ChallengeCategory, number> = {
  interactions: 24,
  async: 16,
  files: 14,
  security: 16,
  a11y: 14,
  legacy: 17,
  misc: 10, // "All Challenges" exclusive bonuses
};

// Round-robin pick from a kind pool per category so the cards stay varied.
const KIND_POOLS: Record<ChallengeCategory, ChallengeKind[]> = {
  interactions: [
    "click-counter", "toggle", "checkbox", "radio-group", "select",
    "tabs", "accordion", "dialog", "popover", "tooltip-hover",
    "color-picker", "rating", "long-press", "confirm-button",
  ],
  async: [
    "delayed-button", "lazy-image", "stepper-form", "filter-list",
    "click-counter", "toggle",
  ],
  files: [
    "copy-button", "lazy-image", "click-counter", "text-input",
  ],
  security: [
    "confirm-button", "delayed-button", "text-input", "checkbox",
    "click-counter", "long-press",
  ],
  a11y: [
    "radio-group", "checkbox", "text-input", "select", "tabs",
  ],
  legacy: [
    "scroll-into-view", "lazy-image", "filter-list", "click-counter",
    "stepper-form", "accordion", "popover",
  ],
  misc: [
    "rating", "color-picker", "stepper-form", "filter-list",
    "tooltip-hover", "popover",
  ],
};

function buildLabel(kind: ChallengeKind, n: number): string {
  switch (kind) {
    case "click-counter": return `Click counter #${n}`;
    case "toggle": return `Toggle switch #${n}`;
    case "checkbox": return `Checkbox #${n}`;
    case "radio-group": return `Radio group #${n}`;
    case "text-input": return `Text input #${n}`;
    case "number-input": return `Number stepper #${n}`;
    case "select": return `Select dropdown #${n}`;
    case "tabs": return `Tabs widget #${n}`;
    case "accordion": return `Accordion #${n}`;
    case "dialog": return `Dialog #${n}`;
    case "popover": return `Popover #${n}`;
    case "tooltip-hover": return `Tooltip on hover #${n}`;
    case "color-picker": return `Color picker #${n}`;
    case "rating": return `Star rating #${n}`;
    case "copy-button": return `Copy to clipboard #${n}`;
    case "delayed-button": return `Delayed-enable button #${n}`;
    case "confirm-button": return `Double-click confirm #${n}`;
    case "long-press": return `Long-press button #${n}`;
    case "scroll-into-view": return `Scroll-into-view target #${n}`;
    case "lazy-image": return `Lazy image #${n}`;
    case "stepper-form": return `Multi-step form #${n}`;
    case "filter-list": return `Filterable list #${n}`;
  }
}

function buildHint(kind: ChallengeKind): string {
  switch (kind) {
    case "click-counter": return "Click 3× — assert counter equals 3.";
    case "toggle": return "Toggle on/off — assert aria-checked.";
    case "checkbox": return "Tick — assert checked.";
    case "radio-group": return "Pick option B — assert value.";
    case "text-input": return "Type 'qa' — assert value.";
    case "number-input": return "Increment to 5.";
    case "select": return "Pick last option.";
    case "tabs": return "Switch to tab 2.";
    case "accordion": return "Expand panel — text becomes visible.";
    case "dialog": return "Open dialog, close with Cancel.";
    case "popover": return "Open popover.";
    case "tooltip-hover": return "Hover to reveal tooltip.";
    case "color-picker": return "Pick the green swatch.";
    case "rating": return "Click the 4th star.";
    case "copy-button": return "Click — toast confirms copy.";
    case "delayed-button": return "Wait 600ms — button enables.";
    case "confirm-button": return "Click twice within 1s.";
    case "long-press": return "Hold 800ms.";
    case "scroll-into-view": return "Off-screen until scrolled.";
    case "lazy-image": return "Renders after 500ms.";
    case "stepper-form": return "Walk through 3 steps.";
    case "filter-list": return "Type 'apple' — list filters.";
  }
}

function makeRegistry(): Challenge[] {
  const out: Challenge[] = [];
  let id = 1;
  (Object.keys(CATEGORY_QUOTAS) as ChallengeCategory[]).forEach((cat) => {
    const quota = CATEGORY_QUOTAS[cat];
    const pool = KIND_POOLS[cat];
    for (let i = 0; i < quota; i++) {
      const kind = pool[i % pool.length];
      const n = i + 1;
      out.push({
        id,
        category: cat,
        kind,
        label: buildLabel(kind, n),
        hint: buildHint(kind),
        testId: `chal-${id}`,
      });
      id++;
    }
  });
  return out;
}

export const CHALLENGES: Challenge[] = makeRegistry();
export const CHALLENGES_TOTAL = CHALLENGES.length; // 111

if (CHALLENGES_TOTAL !== 111) {
  // Hard guard so future edits keep the count exact.
  // eslint-disable-next-line no-console
  console.warn(`[playground-challenges] expected 111, got ${CHALLENGES_TOTAL}`);
}

export function challengesByCategory(cat: ChallengeCategory): Challenge[] {
  return CHALLENGES.filter((c) => c.category === cat);
}

export const CATEGORY_LABELS: Record<ChallengeCategory, string> = {
  interactions: "UI interactions",
  async: "Async & race",
  files: "Files & media",
  security: "Auth & security",
  a11y: "A11y & i18n",
  legacy: "Legacy targets",
  misc: "Bonus / Misc",
};
