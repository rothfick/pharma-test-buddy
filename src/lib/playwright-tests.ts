// Auto-generated Playwright test catalog (>= 222 tests).
// Each test has: id, category, title, tags, code, steps for the visual mock runner.

export type TestStatus = "pass" | "fail" | "flaky" | "skipped";

export interface PwStep {
  label: string;
  // Approximate duration in ms used by the mock runner
  ms: number;
}

export interface PwTest {
  id: string;
  category: PwCategory;
  title: string;
  tags: string[];
  // Deterministic expected outcome for the demo runner
  expected: TestStatus;
  code: string;
  steps: PwStep[];
}

export type PwCategory =
  | "Smoke"
  | "Auth & MFA"
  | "Regression"
  | "E2E Journeys"
  | "Accessibility"
  | "Visual"
  | "API"
  | "Performance"
  | "Security"
  | "Mobile"
  | "Compliance (21 CFR Part 11)"
  | "Chaos / Resilience";

const CATEGORIES: { name: PwCategory; count: number; prefix: string; tags: string[] }[] = [
  { name: "Smoke", count: 20, prefix: "smoke", tags: ["@smoke", "@critical"] },
  { name: "Auth & MFA", count: 22, prefix: "auth", tags: ["@auth", "@security"] },
  { name: "Regression", count: 24, prefix: "reg", tags: ["@regression"] },
  { name: "E2E Journeys", count: 18, prefix: "e2e", tags: ["@e2e"] },
  { name: "Accessibility", count: 20, prefix: "a11y", tags: ["@a11y", "@wcag"] },
  { name: "Visual", count: 18, prefix: "visual", tags: ["@visual"] },
  { name: "API", count: 22, prefix: "api", tags: ["@api"] },
  { name: "Performance", count: 16, prefix: "perf", tags: ["@perf"] },
  { name: "Security", count: 18, prefix: "sec", tags: ["@security", "@owasp"] },
  { name: "Mobile", count: 14, prefix: "mob", tags: ["@mobile"] },
  { name: "Compliance (21 CFR Part 11)", count: 18, prefix: "gxp", tags: ["@gxp", "@compliance"] },
  { name: "Chaos / Resilience", count: 14, prefix: "chaos", tags: ["@chaos"] },
];

// Title templates per category — variations create realistic-looking suite
const TEMPLATES: Record<PwCategory, string[]> = {
  Smoke: [
    "Homepage loads under 2s",
    "Primary navigation renders",
    "Login form is reachable",
    "Sign-up CTA visible above the fold",
    "Footer links resolve to 200",
    "Search bar accepts input",
    "Logo links back to root",
    "Cookie banner can be dismissed",
    "Theme toggle persists choice",
    "Language switcher updates copy",
    "Error 404 page renders friendly message",
    "Health endpoint returns ok",
    "Dashboard skeleton renders without auth flicker",
    "Mobile menu opens and closes",
    "Critical assets load over HTTPS",
    "Service worker registers without errors",
    "Favicons exist for all sizes",
    "Sitemap.xml is reachable",
    "Robots.txt allows expected paths",
    "Preview env shows banner",
  ],
  "Auth & MFA": [
    "User signs in with valid credentials",
    "User receives error on invalid password",
    "Account lockout after 5 failed attempts",
    "Password reset email is dispatched",
    "Password reset token expires after 1h",
    "Session persists after page reload",
    "Logout clears session and refresh tokens",
    "TOTP enrollment generates valid QR",
    "TOTP verification elevates session to AAL2",
    "MFA challenge required on sensitive route",
    "Backup codes can be regenerated",
    "OAuth Google sign-in completes",
    "Magic link sign-in flow works",
    "Email change requires re-authentication",
    "Concurrent sessions are listed",
    "Sign out everywhere revokes tokens",
    "JWT contains expected AMR claims",
    "Brute-force protection rate-limits IP",
    "Email verification gate blocks unverified users",
    "Role assignment enforces UI gating",
    "Password policy rejects weak inputs",
    "Long-lived session refresh succeeds",
  ],
  Regression: [
    "Form validation messages stay localized",
    "Pagination preserves filters across pages",
    "Date picker handles DST boundaries",
    "Currency formatting respects locale",
    "Soft-deleted items are hidden from lists",
    "Bulk actions apply to selection only",
    "Drag-and-drop reorder persists",
    "Search debouncing does not drop characters",
    "Empty states render correct illustrations",
    "Toast messages auto-dismiss after 5s",
    "Modal trap focus inside dialog",
    "Escape key closes opened popovers",
    "Long content does not break layouts",
    "Right-to-left layout mirrors correctly",
    "Decimal inputs accept both . and ,",
    "Copy-to-clipboard shows confirmation",
    "Optimistic updates roll back on failure",
    "Stale cache invalidates after mutation",
    "Form autosave restores after refresh",
    "Tab order matches visual order",
    "Numeric sort handles mixed values",
    "Filter chips can be cleared individually",
    "Settings persist per user, not per device",
    "Breadcrumbs reflect deep routes",
  ],
  "E2E Journeys": [
    "New user signs up, verifies, completes onboarding",
    "User adds task, edits, marks complete",
    "User uploads avatar and sees it on profile",
    "User invites teammate via email",
    "Admin promotes member to moderator",
    "User exports data as CSV",
    "User deletes account and data is purged",
    "User subscribes to premium plan",
    "User cancels subscription before renewal",
    "User restores from soft-delete trash",
    "User shares document via public link",
    "User revokes shared link and access ends",
    "User merges two duplicate records",
    "User schedules and reschedules a meeting",
    "User completes multi-step wizard",
    "User restores previous version of a file",
    "User configures webhook and receives event",
    "User onboards via SSO and lands on dashboard",
  ],
  Accessibility: [
    "No axe violations on landing page",
    "No axe violations on dashboard",
    "Color contrast meets WCAG AA",
    "All form fields have labels",
    "Buttons expose accessible names",
    "Images have alt text or role=presentation",
    "Headings follow logical h1-h6 order",
    "Skip-to-content link is reachable",
    "Modal returns focus on close",
    "ARIA live region announces toasts",
    "Keyboard-only flow completes checkout",
    "Focus ring visible on all interactives",
    "Tables expose row/column headers",
    "Tabs use proper ARIA roles",
    "Combobox supports type-ahead",
    "Tooltips are reachable via keyboard",
    "Reduced-motion preference is respected",
    "Screen-reader announces page title change",
    "Form errors linked via aria-describedby",
    "Lang attribute matches user locale",
  ],
  Visual: [
    "Landing hero matches baseline",
    "Pricing table matches baseline",
    "Dashboard chart matches baseline",
    "Empty state illustration stable",
    "Dark mode primary surfaces stable",
    "High-density desktop snapshot stable",
    "iPhone 14 viewport snapshot stable",
    "Android Pixel 7 viewport snapshot stable",
    "Print stylesheet snapshot stable",
    "Email template render stable",
    "Onboarding step 1 stable",
    "Onboarding step 2 stable",
    "Settings/profile pane stable",
    "Modal: confirm delete stable",
    "Toast variants snapshot stable",
    "Data table loading state stable",
    "Charts tooltip rendering stable",
    "Avatar fallback initials stable",
  ],
  API: [
    "GET /health returns 200",
    "GET /me returns current user",
    "POST /tasks creates a task",
    "PATCH /tasks/:id updates fields",
    "DELETE /tasks/:id soft-deletes",
    "GET /tasks paginates with cursor",
    "POST /tasks rejects oversized payload",
    "PUT /profile validates email format",
    "GET protected route returns 401 without token",
    "GET protected route returns 403 without role",
    "Rate limit returns 429 with Retry-After",
    "ETag caching returns 304 on revalidation",
    "Idempotency-Key prevents duplicates",
    "Webhook retries with exponential backoff",
    "Pagination links follow RFC 5988",
    "Bulk endpoint partial-success reports per item",
    "OpenAPI schema matches live responses",
    "Error response shape matches RFC 7807",
    "Cursor pagination is stable across writes",
    "Patch with empty body returns 400",
    "Filtering supports multiple values",
    "Sorting supports multiple fields",
  ],
  Performance: [
    "TTFB under 200ms on landing",
    "LCP under 2.5s on landing",
    "CLS under 0.1 on landing",
    "INP under 200ms on dashboard",
    "JS bundle under 250KB gzipped",
    "Image LCP uses responsive sizes",
    "API p95 under 500ms under 50 VUs",
    "API p99 under 1s under 200 VUs",
    "Error rate under 1% during stress",
    "No memory leak after 1000 navigations",
    "Hydration completes under 1s",
    "Route prefetch reduces navigation time",
    "Long task < 50ms on initial paint",
    "Service worker reduces repeat-visit LCP",
    "Critical CSS inlined for above-the-fold",
    "Server-Timing headers present",
  ],
  Security: [
    "CSP header is restrictive",
    "X-Frame-Options denies framing",
    "Strict-Transport-Security max-age >= 1y",
    "No mixed content on any page",
    "Reflected XSS payload is escaped",
    "Stored XSS payload is escaped",
    "SQL injection in search returns no leak",
    "CSRF token rotates on login",
    "Cookies use Secure + HttpOnly + SameSite",
    "Login does not leak user existence",
    "JWT alg=none is rejected",
    "Open redirect parameter is blocked",
    "Path traversal in download is blocked",
    "Server hides framework version headers",
    "Login form rate-limited per IP",
    "Insecure direct object reference blocked",
    "Subresource Integrity present on external JS",
    "GraphQL introspection disabled in prod",
  ],
  Mobile: [
    "iPhone 14 — login flow completes",
    "iPhone SE — login flow completes",
    "Pixel 7 — dashboard renders",
    "Galaxy S22 — checkout completes",
    "iPad — split view renders",
    "Mobile menu — open/close gesture",
    "Pull-to-refresh updates list",
    "Touch targets >= 44×44 CSS px",
    "Viewport meta prevents zoom-on-focus",
    "Form keyboard does not cover input",
    "Offline banner appears without network",
    "Camera permission prompt is graceful",
    "Geolocation prompt is graceful",
    "Deep link opens correct route",
  ],
  "Compliance (21 CFR Part 11)": [
    "Audit log records user, action, before/after",
    "Audit log entries are tamper-evident (hash chain)",
    "E-signature requires re-authentication",
    "E-signature captures meaning of signing",
    "E-signature timestamp uses trusted time",
    "Records cannot be deleted, only superseded",
    "Roles enforce least privilege",
    "Password expiry is configurable per tenant",
    "Idle session timeout enforced",
    "System validation report is generated",
    "Backups are encrypted at rest",
    "Restore from backup is testable",
    "PII export honors data minimization",
    "Data integrity checksum verified on read",
    "Approval workflow requires distinct reviewer",
    "Change control links to ticket id",
    "User training acknowledgement recorded",
    "Periodic review schedule is enforced",
  ],
  "Chaos / Resilience": [
    "App degrades gracefully under 500ms latency",
    "App degrades gracefully under 2s latency",
    "Retry succeeds on transient 503",
    "Circuit breaker opens after threshold",
    "Circuit breaker half-opens and recovers",
    "Bulkhead isolates failing dependency",
    "Dependency outage shows fallback UI",
    "Cache stampede prevented by single-flight",
    "Pod restart does not lose in-flight requests",
    "Database failover completes under 30s",
    "Read-only mode banner during incident",
    "Background jobs resume after crash",
    "Idempotent writes survive retries",
    "Backpressure rejects with 429 not 500",
  ],
};

function buildSteps(category: PwCategory): PwStep[] {
  const base: Record<PwCategory, PwStep[]> = {
    Smoke: [
      { label: "Navigate to baseUrl", ms: 220 },
      { label: "Wait for networkidle", ms: 380 },
      { label: "Assert critical element visible", ms: 90 },
    ],
    "Auth & MFA": [
      { label: "Open /auth", ms: 200 },
      { label: "Fill credentials", ms: 140 },
      { label: "Submit & wait for redirect", ms: 410 },
      { label: "Assert authenticated state", ms: 120 },
    ],
    Regression: [
      { label: "Seed fixture data", ms: 160 },
      { label: "Perform user action", ms: 220 },
      { label: "Assert UI state", ms: 110 },
    ],
    "E2E Journeys": [
      { label: "Sign in via storageState", ms: 140 },
      { label: "Walk through wizard", ms: 620 },
      { label: "Assert end-to-end outcome", ms: 180 },
      { label: "Verify backend state via API", ms: 210 },
    ],
    Accessibility: [
      { label: "Inject axe", ms: 90 },
      { label: "Run analysis", ms: 320 },
      { label: "Assert 0 violations of impact >= serious", ms: 80 },
    ],
    Visual: [
      { label: "Wait for fonts ready", ms: 180 },
      { label: "Mask volatile regions", ms: 60 },
      { label: "Compare to baseline (maxDiffPixelRatio: 0.01)", ms: 240 },
    ],
    API: [
      { label: "Build typed request", ms: 30 },
      { label: "Send via APIRequestContext", ms: 180 },
      { label: "Validate response with Zod", ms: 90 },
    ],
    Performance: [
      { label: "Start tracing", ms: 60 },
      { label: "Drive scenario", ms: 540 },
      { label: "Assert Web Vitals thresholds", ms: 120 },
    ],
    Security: [
      { label: "Send crafted request", ms: 160 },
      { label: "Assert headers / response", ms: 90 },
    ],
    Mobile: [
      { label: "Use device descriptor", ms: 120 },
      { label: "Run flow", ms: 480 },
      { label: "Assert layout & a11y", ms: 110 },
    ],
    "Compliance (21 CFR Part 11)": [
      { label: "Perform audited action", ms: 220 },
      { label: "Query audit_log", ms: 140 },
      { label: "Assert immutability + signature", ms: 120 },
    ],
    "Chaos / Resilience": [
      { label: "Inject fault via /chaos-experiment", ms: 240 },
      { label: "Drive user flow", ms: 360 },
      { label: "Assert graceful degradation", ms: 140 },
      { label: "Restore baseline", ms: 80 },
    ],
  };
  return base[category];
}

function buildCode(t: { id: string; title: string; category: PwCategory; tags: string[] }): string {
  const tagStr = t.tags.join(" ");
  switch (t.category) {
    case "Smoke":
      return `import { test, expect } from '@playwright/test';

test('${t.title} ${tagStr}', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.getByRole('main')).toBeVisible();
});
`;
    case "Auth & MFA":
      return `import { test, expect } from '@fixtures/auth.fixture';

test('${t.title} ${tagStr}', async ({ page }) => {
  await page.goto('/auth');
  await page.getByLabel('Email').fill(process.env.QA_USER!);
  await page.getByLabel('Password').fill(process.env.QA_PASS!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
});
`;
    case "Regression":
      return `import { test, expect } from '@playwright/test';

test('${t.title} ${tagStr}', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: /apply/i }).click();
  await expect(page.getByRole('status')).toContainText(/saved/i);
});
`;
    case "E2E Journeys":
      return `import { test, expect } from '@fixtures/auth.fixture';

test('${t.title} ${tagStr}', async ({ authenticatedPage: page, request }) => {
  await page.goto('/onboarding');
  for (const step of ['profile', 'team', 'billing', 'review']) {
    await page.getByTestId(\`step-\${step}\`).click();
    await page.getByRole('button', { name: /continue/i }).click();
  }
  await expect(page).toHaveURL(/dashboard/);
  const me = await request.get('/api/me');
  expect(me.ok()).toBeTruthy();
});
`;
    case "Accessibility":
      return `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('${t.title} ${tagStr}', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
});
`;
    case "Visual":
      return `import { test, expect } from '@playwright/test';

test('${t.title} ${tagStr}', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('${t.id}.png', {
    maxDiffPixelRatio: 0.01,
    mask: [page.locator('[data-volatile]')],
  });
});
`;
    case "API":
      return `import { test, expect } from '@playwright/test';
import { z } from 'zod';

const Schema = z.object({ id: z.string(), createdAt: z.string() });

test('${t.title} ${tagStr}', async ({ request }) => {
  const res = await request.get('/api/resource');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(() => Schema.parse(body)).not.toThrow();
});
`;
    case "Performance":
      return `import { test, expect } from '@playwright/test';

test('${t.title} ${tagStr}', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const lcp = await page.evaluate(() => new Promise<number>(r => {
    new PerformanceObserver(list => {
      const entries = list.getEntries();
      r(entries[entries.length - 1].startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }));
  expect(lcp).toBeLessThan(2500);
});
`;
    case "Security":
      return `import { test, expect } from '@playwright/test';

test('${t.title} ${tagStr}', async ({ request }) => {
  const res = await request.get('/');
  const headers = res.headers();
  expect(headers['content-security-policy']).toBeTruthy();
  expect(headers['strict-transport-security']).toMatch(/max-age=\\d{7,}/);
  expect(headers['x-frame-options']?.toLowerCase()).toBe('deny');
});
`;
    case "Mobile":
      return `import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 14'] });

test('${t.title} ${tagStr}', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /menu/i }).tap();
  await expect(page.getByRole('navigation')).toBeVisible();
});
`;
    case "Compliance (21 CFR Part 11)":
      return `import { test, expect } from '@fixtures/auth.fixture';

test('${t.title} ${tagStr}', async ({ authenticatedPage: page, request }) => {
  await page.goto('/records/42');
  await page.getByRole('button', { name: /approve/i }).click();
  await page.getByLabel('Password').fill(process.env.QA_PASS!);
  await page.getByLabel('Meaning').selectOption('approval');
  await page.getByRole('button', { name: /sign/i }).click();
  const audit = await request.get('/api/audit?record=42');
  const log = await audit.json();
  expect(log[0]).toMatchObject({ action: 'approve', meaning: 'approval' });
  expect(log[0].prev_hash).toBeTruthy();
});
`;
    case "Chaos / Resilience":
      return `import { test, expect, request as pwRequest } from '@playwright/test';

test('${t.title} ${tagStr}', async ({ page }) => {
  const ctx = await pwRequest.newContext();
  await ctx.post('/functions/v1/chaos-experiment', {
    data: { fault: 'latency', latencyMs: 1500, durationS: 30 },
  });
  await page.goto('/');
  await expect(page.getByText(/loading|please wait/i)).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
});
`;
  }
}

function pickExpected(idx: number): TestStatus {
  // Mostly pass, sprinkle a few flaky/fail/skip for realism
  const m = idx % 37;
  if (m === 0) return "fail";
  if (m === 11 || m === 23) return "flaky";
  if (m === 17) return "skipped";
  return "pass";
}

function pad(n: number, w = 3) {
  return n.toString().padStart(w, "0");
}

function generate(): PwTest[] {
  const out: PwTest[] = [];
  let global = 0;
  for (const cat of CATEGORIES) {
    const titles = TEMPLATES[cat.name];
    for (let i = 0; i < cat.count; i++) {
      const baseTitle = titles[i % titles.length];
      const variant = i >= titles.length ? ` (variant ${i - titles.length + 2})` : "";
      const title = `${baseTitle}${variant}`;
      global++;
      const id = `${cat.prefix}-${pad(i + 1)}`;
      const t = {
        id,
        category: cat.name,
        title,
        tags: cat.tags,
        expected: pickExpected(global),
        steps: buildSteps(cat.name),
        code: "",
      } as PwTest;
      t.code = buildCode(t);
      out.push(t);
    }
  }
  return out;
}

export const PLAYWRIGHT_TESTS: PwTest[] = generate();

export const PLAYWRIGHT_CATEGORIES: { name: PwCategory; count: number }[] = CATEGORIES.map((c) => ({
  name: c.name,
  count: c.count,
}));

export const TOTAL_TESTS = PLAYWRIGHT_TESTS.length;
