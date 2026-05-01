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

// Title-aware step builder: returns a unique step list per test by inspecting
// the title for keywords (LCP/CLS/INP, login/MFA/OAuth, axe/contrast, etc.).
// Falls back to a category-default trio when no keyword matches.
function buildSteps(category: PwCategory, title: string): PwStep[] {
  const t = title.toLowerCase();
  const s = (label: string, ms: number): PwStep => ({ label, ms });

  switch (category) {
    case "Smoke": {
      if (t.includes("homepage") || t.includes("under 2s"))
        return [s("goto('/')", 180), s("waitForLoadState('networkidle')", 360), s("expect(loadTime).toBeLessThan(2000)", 90)];
      if (t.includes("navigation"))
        return [s("goto('/')", 180), s("locate('nav a').count()", 110), s("expect(links).toBeGreaterThan(3)", 70)];
      if (t.includes("login form"))
        return [s("goto('/auth')", 200), s("expect(getByLabel('Email')).toBeVisible()", 90), s("expect(getByRole('button', /sign in/)).toBeEnabled()", 90)];
      if (t.includes("sign-up cta"))
        return [s("goto('/')", 180), s("scrollIntoView fold", 60), s("expect(getByRole('link', /sign up/)).toBeVisible()", 90)];
      if (t.includes("footer"))
        return [s("goto('/')", 180), s("collect footer hrefs", 80), s("Promise.all(request.head)", 320), s("expect(every).toBe(200)", 60)];
      if (t.includes("search bar"))
        return [s("goto('/')", 180), s("fill('[role=searchbox]', 'qa')", 140), s("expect(input).toHaveValue('qa')", 60)];
      if (t.includes("logo"))
        return [s("goto('/pricing')", 180), s("click('header a[aria-label=Home]')", 120), s("expect(url).toBe(baseUrl)", 70)];
      if (t.includes("cookie banner"))
        return [s("goto('/')", 180), s("click('button[aria-label=Accept]')", 110), s("expect(banner).toBeHidden()", 70)];
      if (t.includes("theme toggle"))
        return [s("click('[data-testid=theme]')", 120), s("reload()", 220), s("expect(html).toHaveClass(/dark/)", 80)];
      if (t.includes("language"))
        return [s("selectOption('lang', 'pl')", 130), s("expect(h1).toContainText('Witaj')", 90)];
      if (t.includes("404"))
        return [s("goto('/no-such-page')", 180), s("expect(status).toBe(404)", 60), s("expect(getByText(/not found/)).toBeVisible()", 80)];
      if (t.includes("health"))
        return [s("request.get('/health')", 140), s("expect(status).toBe(200)", 50), s("expect(body.status).toBe('ok')", 50)];
      if (t.includes("dashboard skeleton"))
        return [s("goto('/dashboard')", 220), s("expect(skeleton).toBeVisible()", 60), s("expect(no auth flicker)", 90)];
      if (t.includes("mobile menu"))
        return [s("setViewportSize(375x667)", 60), s("tap('[aria-label=Menu]')", 120), s("expect(nav).toBeVisible()", 70), s("tap('[aria-label=Close]')", 110)];
      if (t.includes("https"))
        return [s("intercept network", 80), s("goto('/')", 220), s("expect(every url).toMatch(/^https:/)", 90)];
      if (t.includes("service worker"))
        return [s("goto('/')", 200), s("evaluate(navigator.serviceWorker.ready)", 280), s("expect(registration).toBeTruthy()", 60)];
      if (t.includes("favicon"))
        return [s("request.head('/favicon-32.png')", 120), s("request.head('/favicon-180.png')", 120), s("expect(all).toBe(200)", 50)];
      if (t.includes("sitemap"))
        return [s("request.get('/sitemap.xml')", 130), s("expect(contentType).toMatch(/xml/)", 60)];
      if (t.includes("robots"))
        return [s("request.get('/robots.txt')", 110), s("expect(body).toMatch(/Allow:/)", 60)];
      if (t.includes("preview env"))
        return [s("goto('/')", 200), s("expect(getByText(/preview/i)).toBeVisible()", 80)];
      return [s("goto('/')", 200), s("waitForLoadState('domcontentloaded')", 240), s("expect(main).toBeVisible()", 80)];
    }

    case "Auth & MFA": {
      if (t.includes("invalid password"))
        return [s("goto('/auth')", 180), s("fill credentials (bad pass)", 160), s("click submit", 120), s("expect(error).toContainText(/invalid/)", 90)];
      if (t.includes("lockout"))
        return [s("loop x5 bad attempts", 520), s("expect(status).toBe(423)", 70), s("expect(error).toContainText(/locked/)", 80)];
      if (t.includes("reset email"))
        return [s("goto('/auth/forgot')", 180), s("fill email", 110), s("submit", 140), s("poll mailbox API", 320), s("expect(received).toBe(true)", 60)];
      if (t.includes("token expires"))
        return [s("request reset link", 200), s("advance clock 1h", 80), s("open link", 220), s("expect(error).toMatch(/expired/)", 80)];
      if (t.includes("session persists"))
        return [s("sign in", 320), s("reload()", 220), s("expect(getByText(/welcome/)).toBeVisible()", 90)];
      if (t.includes("logout"))
        return [s("click('button:has-text(Sign out)')", 140), s("expect(localStorage.token).toBeNull()", 70), s("expect(url).toMatch(/auth/)", 70)];
      if (t.includes("totp enrollment"))
        return [s("goto('/security/mfa')", 200), s("click 'Enable TOTP'", 120), s("expect(qrCode).toBeVisible()", 100)];
      if (t.includes("totp verification") || t.includes("aal2"))
        return [s("enter TOTP from secret", 240), s("submit", 140), s("expect(jwt.aal).toBe('aal2')", 90)];
      if (t.includes("mfa challenge"))
        return [s("goto('/admin')", 200), s("expect(redirect).toMatch(/mfa/)", 90), s("complete challenge", 320)];
      if (t.includes("backup codes"))
        return [s("goto('/security/mfa')", 200), s("click 'Regenerate codes'", 140), s("expect(codes.length).toBe(10)", 70)];
      if (t.includes("oauth google"))
        return [s("click 'Continue with Google'", 140), s("mock OAuth callback", 280), s("expect(url).toMatch(/dashboard/)", 90)];
      if (t.includes("magic link"))
        return [s("submit email", 160), s("fetch magic link", 220), s("open link", 240), s("expect(authed).toBe(true)", 80)];
      if (t.includes("email change"))
        return [s("goto('/profile')", 180), s("fill new email", 130), s("expect(prompt /reauth/)", 90)];
      if (t.includes("concurrent sessions"))
        return [s("goto('/security/sessions')", 200), s("expect(rows.length).toBeGreaterThan(1)", 80)];
      if (t.includes("sign out everywhere"))
        return [s("click 'Sign out everywhere'", 140), s("expect(refreshTokens).toHaveLength(0)", 90)];
      if (t.includes("amr"))
        return [s("decode JWT", 80), s("expect(amr).toContain('mfa')", 60)];
      if (t.includes("brute-force") || t.includes("rate-limit"))
        return [s("burst 50 reqs/s", 420), s("expect(status).toBe(429)", 70), s("expect(headers['retry-after']).toBeTruthy()", 70)];
      if (t.includes("verification gate"))
        return [s("sign in unverified", 320), s("expect(redirect).toMatch(/verify/)", 80)];
      if (t.includes("role assignment"))
        return [s("seed user as 'viewer'", 140), s("goto('/admin')", 180), s("expect(getByText(/forbidden/)).toBeVisible()", 80)];
      if (t.includes("password policy") || t.includes("weak"))
        return [s("fill password '123'", 110), s("expect(error /min length/)", 80)];
      if (t.includes("long-lived") || t.includes("refresh"))
        return [s("advance clock 50min", 80), s("trigger refresh", 220), s("expect(newToken).toBeTruthy()", 70)];
      // valid sign-in default
      return [s("goto('/auth')", 200), s("fill credentials", 160), s("click submit", 130), s("expect(url).toMatch(/dashboard/)", 110)];
    }

    case "Regression": {
      if (t.includes("pagination"))
        return [s("goto('/items?status=open')", 200), s("click next page", 140), s("expect(url).toContain('status=open')", 70)];
      if (t.includes("date picker") || t.includes("dst"))
        return [s("open date picker", 140), s("pick 2025-03-30", 160), s("expect(value.tz).toBe('Europe/Warsaw')", 80)];
      if (t.includes("currency"))
        return [s("set locale=pl-PL", 80), s("expect(price).toMatch(/1 234,56 zł/)", 90)];
      if (t.includes("soft-deleted"))
        return [s("seed deleted_at row", 140), s("goto('/items')", 180), s("expect(rows).not.toContain('Ghost')", 90)];
      if (t.includes("bulk actions"))
        return [s("select 3 of 10 rows", 180), s("click 'Archive'", 120), s("expect(archived).toBe(3)", 70)];
      if (t.includes("drag-and-drop"))
        return [s("dragTo row[2] -> row[0]", 280), s("reload()", 220), s("expect(order[0]).toBe('row-3')", 80)];
      if (t.includes("debouncing"))
        return [s("type('search', 'qa')", 140), s("expect(requests).toHaveLength(1)", 80)];
      if (t.includes("empty state"))
        return [s("goto('/items?empty=1')", 200), s("expect(getByAltText(/empty/)).toBeVisible()", 80)];
      if (t.includes("toast"))
        return [s("triggerToast()", 100), s("waitForTimeout(5100)", 5100), s("expect(toast).toBeHidden()", 60)];
      if (t.includes("trap focus"))
        return [s("openModal()", 140), s("press Tab x10", 220), s("expect(activeElement).toBeWithin(modal)", 80)];
      if (t.includes("escape"))
        return [s("openPopover()", 120), s("press Escape", 60), s("expect(popover).toBeHidden()", 60)];
      if (t.includes("rtl"))
        return [s("set dir=rtl", 80), s("goto('/')", 200), s("expect(layout).toMatchSnapshot('rtl')", 220)];
      if (t.includes("clipboard"))
        return [s("click 'Copy'", 100), s("expect(toast /copied/)", 80)];
      if (t.includes("optimistic"))
        return [s("intercept POST -> 500", 80), s("submit", 140), s("expect(item).toBeRolledBack()", 100)];
      if (t.includes("autosave"))
        return [s("type 200 chars", 240), s("reload()", 220), s("expect(textarea).toHaveValue(/.+/)", 80)];
      if (t.includes("breadcrumb"))
        return [s("goto('/a/b/c/d')", 200), s("expect(crumbs).toHaveCount(4)", 80)];
      return [s("seed fixture", 140), s("perform user action", 220), s("expect(state).toMatchSnapshot()", 110)];
    }

    case "E2E Journeys": {
      if (t.includes("sign up") || t.includes("onboarding"))
        return [s("goto('/auth?mode=signup')", 200), s("complete signup", 380), s("verify email link", 280), s("walk onboarding wizard", 540), s("expect(url).toMatch(/dashboard/)", 100)];
      if (t.includes("adds task"))
        return [s("goto('/tasks')", 200), s("click 'New task'", 120), s("fill & save", 240), s("toggle complete", 140), s("expect(row).toHaveAttribute('data-done')", 70)];
      if (t.includes("avatar"))
        return [s("goto('/profile')", 200), s("setInputFiles avatar.png", 220), s("expect(img.src).toMatch(/avatar/)", 80)];
      if (t.includes("invites"))
        return [s("goto('/team')", 200), s("fill teammate email", 140), s("send invite", 180), s("expect(toast /sent/)", 70)];
      if (t.includes("promotes"))
        return [s("open member menu", 120), s("select 'Make moderator'", 140), s("expect(badge).toContainText('moderator')", 80)];
      if (t.includes("exports"))
        return [s("click 'Export CSV'", 160), s("waitForEvent('download')", 320), s("expect(file.size).toBeGreaterThan(0)", 60)];
      if (t.includes("deletes account"))
        return [s("goto('/settings/danger')", 200), s("type DELETE", 140), s("confirm", 180), s("expect(api /me).toBe(404)", 110)];
      if (t.includes("subscribes"))
        return [s("click 'Upgrade'", 130), s("fill test card 4242…", 240), s("submit", 200), s("expect(plan).toBe('premium')", 80)];
      if (t.includes("cancels subscription"))
        return [s("goto('/billing')", 200), s("click 'Cancel'", 140), s("confirm", 130), s("expect(status).toBe('canceled')", 70)];
      if (t.includes("trash") || t.includes("restore"))
        return [s("open trash", 160), s("click 'Restore'", 130), s("expect(item).toBeVisibleInList()", 80)];
      if (t.includes("public link"))
        return [s("click 'Share'", 130), s("toggle 'Anyone with link'", 120), s("copy URL", 80), s("incognito.goto(url)", 240), s("expect(doc).toBeVisible()", 80)];
      if (t.includes("revokes"))
        return [s("toggle off public link", 120), s("incognito.goto(url)", 240), s("expect(status).toBe(403)", 70)];
      if (t.includes("merges"))
        return [s("select 2 duplicates", 180), s("click 'Merge'", 130), s("expect(rows).toHaveCount(1)", 80)];
      if (t.includes("schedules"))
        return [s("create meeting", 220), s("reschedule +1d", 200), s("expect(start).toBe(tomorrow)", 80)];
      if (t.includes("multi-step wizard"))
        return [s("goto('/wizard')", 200), s("complete 4 steps", 620), s("submit", 200), s("expect(success).toBeVisible()", 90)];
      if (t.includes("previous version"))
        return [s("open history", 160), s("restore v1", 180), s("expect(content).toBe('v1')", 70)];
      if (t.includes("webhook"))
        return [s("create webhook -> mock URL", 200), s("trigger event", 180), s("expect(mock).toHaveBeenCalled()", 90)];
      if (t.includes("sso"))
        return [s("click 'Continue with SSO'", 140), s("complete SAML round-trip", 420), s("expect(url).toMatch(/dashboard/)", 90)];
      return [s("sign in via storageState", 140), s("walk through journey", 620), s("assert end-to-end outcome", 180), s("verify backend via API", 210)];
    }

    case "Accessibility": {
      if (t.includes("landing"))
        return [s("goto('/')", 200), s("AxeBuilder.analyze()", 320), s("expect(violations).toEqual([])", 80)];
      if (t.includes("dashboard"))
        return [s("goto('/dashboard')", 220), s("AxeBuilder.analyze()", 340), s("expect(violations).toEqual([])", 80)];
      if (t.includes("contrast"))
        return [s("AxeBuilder.withRules(['color-contrast'])", 90), s("analyze()", 320), s("expect(0).toBe(violations.length)", 70)];
      if (t.includes("form fields"))
        return [s("locate all <input>", 110), s("expect(every).toHaveLabel()", 90)];
      if (t.includes("buttons"))
        return [s("locate('button')", 90), s("expect(every).toHaveAccessibleName()", 100)];
      if (t.includes("alt text"))
        return [s("locate('img')", 90), s("expect(every).toHaveAttribute('alt')", 90)];
      if (t.includes("heading"))
        return [s("collect h1-h6", 100), s("expect(order).toBeMonotonic()", 80)];
      if (t.includes("skip-to-content"))
        return [s("press Tab once", 60), s("expect(activeElement).toMatch(/skip/)", 70)];
      if (t.includes("modal returns focus"))
        return [s("openModal & close", 240), s("expect(activeElement).toBe(trigger)", 80)];
      if (t.includes("live region"))
        return [s("trigger toast", 100), s("expect(role=status).toContainText(/saved/)", 80)];
      if (t.includes("keyboard-only"))
        return [s("disable mouse", 40), s("press Tab/Enter through checkout", 540), s("expect(orderId).toBeTruthy()", 80)];
      if (t.includes("focus ring"))
        return [s("Tab through interactives", 320), s("screenshot focus rings", 220), s("expect(visible).toBe(true)", 60)];
      if (t.includes("table"))
        return [s("locate('table')", 90), s("expect(thead th).toHaveAttribute('scope')", 80)];
      if (t.includes("tabs"))
        return [s("locate('[role=tablist]')", 90), s("expect(roles).toMatch(/tab/)", 70)];
      if (t.includes("combobox"))
        return [s("type 'qu' into combobox", 130), s("expect(option /quick/).toBeVisible()", 90)];
      if (t.includes("tooltip"))
        return [s("focus button", 80), s("expect(tooltip).toBeVisible()", 80)];
      if (t.includes("reduced-motion"))
        return [s("emulateMedia({ reducedMotion: 'reduce' })", 60), s("expect(animations).toBeNone()", 110)];
      if (t.includes("page title"))
        return [s("goto('/about')", 200), s("expect(document.title).toContain('About')", 70)];
      if (t.includes("aria-describedby"))
        return [s("submit empty form", 140), s("expect(input).toHaveAttribute('aria-describedby')", 90)];
      if (t.includes("lang attribute"))
        return [s("expect(html.lang).toBe('en')", 60)];
      return [s("inject axe", 90), s("analyze()", 320), s("expect(0 serious violations)", 80)];
    }

    case "Visual": {
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (t.includes("hero"))
        return [s("goto('/')", 200), s("waitForFonts", 180), s("toHaveScreenshot('hero.png')", 260)];
      if (t.includes("pricing"))
        return [s("goto('/pricing')", 200), s("toHaveScreenshot('pricing.png')", 260)];
      if (t.includes("chart"))
        return [s("goto('/dashboard')", 220), s("mask volatile data", 60), s("toHaveScreenshot('chart.png')", 280)];
      if (t.includes("dark mode"))
        return [s("emulateMedia({ colorScheme: 'dark' })", 60), s("toHaveScreenshot('dark.png')", 260)];
      if (t.includes("iphone"))
        return [s("use(devices['iPhone 14'])", 70), s("goto('/')", 220), s("toHaveScreenshot('iphone-14.png')", 260)];
      if (t.includes("pixel"))
        return [s("use(devices['Pixel 7'])", 70), s("goto('/')", 220), s("toHaveScreenshot('pixel-7.png')", 260)];
      if (t.includes("print"))
        return [s("emulateMedia({ media: 'print' })", 60), s("toHaveScreenshot('print.png')", 240)];
      if (t.includes("email template"))
        return [s("goto('/internal/email-preview')", 220), s("toHaveScreenshot('email.png')", 260)];
      if (t.includes("modal"))
        return [s("openConfirmDelete()", 180), s("toHaveScreenshot('modal.png')", 240)];
      if (t.includes("toast"))
        return [s("trigger 4 toast variants", 200), s("toHaveScreenshot('toasts.png')", 240)];
      if (t.includes("loading state"))
        return [s("intercept slow API", 80), s("goto('/items')", 200), s("toHaveScreenshot('table-loading.png')", 240)];
      if (t.includes("avatar"))
        return [s("render avatar without src", 100), s("toHaveScreenshot('avatar-fallback.png')", 220)];
      return [s("waitForFonts ready", 180), s("mask volatile regions", 60), s(`toHaveScreenshot('${id}.png')`, 240)];
    }

    case "API": {
      if (t.includes("/health"))
        return [s("request.get('/api/health')", 140), s("expect(status).toBe(200)", 50), s("expect(body.status).toBe('ok')", 50)];
      if (t.includes("/me"))
        return [s("request.get('/api/me', { authed })", 160), s("Schema.parse(body)", 90)];
      if (t.includes("post /tasks") || (t.includes("creates a task")))
        return [s("request.post('/api/tasks', payload)", 180), s("expect(status).toBe(201)", 50), s("expect(body.id).toMatch(uuid)", 70)];
      if (t.includes("patch /tasks"))
        return [s("create fixture", 140), s("request.patch('/api/tasks/:id')", 160), s("expect(updated.title).toBe('new')", 70)];
      if (t.includes("delete /tasks"))
        return [s("request.delete('/api/tasks/:id')", 160), s("expect(getById).toBe(null)", 70)];
      if (t.includes("paginates with cursor") || t.includes("cursor pagination"))
        return [s("request.get('/api/tasks?limit=10')", 160), s("follow next cursor x3", 320), s("expect(unique ids)", 70)];
      if (t.includes("oversized"))
        return [s("post 11MB payload", 220), s("expect(status).toBe(413)", 60)];
      if (t.includes("email format"))
        return [s("put profile { email: 'oops' }", 160), s("expect(status).toBe(400)", 60)];
      if (t.includes("401"))
        return [s("request.get('/api/private')", 140), s("expect(status).toBe(401)", 60)];
      if (t.includes("403"))
        return [s("request.get('/api/admin', { authed: viewer })", 160), s("expect(status).toBe(403)", 60)];
      if (t.includes("rate limit") || t.includes("429"))
        return [s("burst 100 reqs", 420), s("expect(status).toBe(429)", 50), s("expect(headers['retry-after']).toBeTruthy()", 60)];
      if (t.includes("etag"))
        return [s("first GET -> grab ETag", 140), s("second GET with If-None-Match", 130), s("expect(status).toBe(304)", 50)];
      if (t.includes("idempotency"))
        return [s("post twice with same key", 280), s("expect(rows).toHaveCount(1)", 70)];
      if (t.includes("webhook retries"))
        return [s("inject 503 x3", 80), s("trigger event", 180), s("expect(attempts).toBe(4)", 70)];
      if (t.includes("rfc 5988"))
        return [s("GET first page", 140), s("expect(headers.link).toMatch(/rel=\"next\"/)", 80)];
      if (t.includes("bulk endpoint"))
        return [s("post 5 items (1 invalid)", 220), s("expect(report.success).toBe(4)", 70)];
      if (t.includes("openapi"))
        return [s("fetch openapi.json", 160), s("compare 20 sample responses", 360), s("expect(diffs).toEqual([])", 70)];
      if (t.includes("rfc 7807"))
        return [s("trigger 400", 140), s("expect(body).toMatchObject({ type, title, status })", 90)];
      if (t.includes("empty body"))
        return [s("request.patch('/api/tasks/:id', { data: {} })", 160), s("expect(status).toBe(400)", 60)];
      if (t.includes("filtering"))
        return [s("get(?status=open&status=blocked)", 160), s("expect(every).toMatchOneOf(...)", 80)];
      if (t.includes("sorting"))
        return [s("get(?sort=-createdAt,title)", 160), s("expect(order).toMatchExpected()", 80)];
      return [s("build typed request", 40), s("send via APIRequestContext", 180), s("validate response with Zod", 90)];
    }

    case "Performance": {
      if (t.includes("ttfb"))
        return [s("request.get('/')", 130), s("read Server-Timing", 60), s("expect(ttfb).toBeLessThan(200)", 60)];
      if (t.includes("lcp"))
        return [s("goto('/')", 200), s("PerformanceObserver(LCP)", 360), s("expect(lcp).toBeLessThan(2500)", 70)];
      if (t.includes("cls"))
        return [s("goto('/')", 200), s("scroll & measure layout-shift", 380), s("expect(cls).toBeLessThan(0.1)", 70)];
      if (t.includes("inp"))
        return [s("goto('/dashboard')", 220), s("simulate 20 interactions", 420), s("expect(inp).toBeLessThan(200)", 70)];
      if (t.includes("bundle"))
        return [s("collect main.js size", 100), s("expect(gzipped).toBeLessThan(250 * 1024)", 60)];
      if (t.includes("responsive sizes"))
        return [s("locate('img.lcp')", 90), s("expect(srcset).toMatch(/\\dx/)", 60)];
      if (t.includes("p95"))
        return [s("k6 run 50 VUs / 30s", 540), s("expect(p95).toBeLessThan(500)", 70)];
      if (t.includes("p99"))
        return [s("k6 run 200 VUs / 60s", 600), s("expect(p99).toBeLessThan(1000)", 70)];
      if (t.includes("error rate"))
        return [s("stress 500 VUs", 580), s("expect(errorRate).toBeLessThan(0.01)", 70)];
      if (t.includes("memory leak"))
        return [s("loop navigate x1000", 920), s("expect(heapDelta).toBeLessThan(20MB)", 80)];
      if (t.includes("hydration"))
        return [s("goto('/')", 200), s("await hydration mark", 320), s("expect(hydrationMs).toBeLessThan(1000)", 70)];
      if (t.includes("prefetch"))
        return [s("hover next link", 100), s("click after 300ms", 320), s("expect(navMs).toBeLessThan(150)", 70)];
      if (t.includes("long task"))
        return [s("PerformanceObserver(longtask)", 90), s("goto('/')", 220), s("expect(every duration).toBeLessThan(50)", 70)];
      if (t.includes("service worker"))
        return [s("warm SW cache", 200), s("hard reload", 240), s("expect(repeatLcp).toBeLessThan(1500)", 70)];
      if (t.includes("critical css"))
        return [s("fetch raw HTML", 130), s("expect(<style>).toContain(above-fold)", 70)];
      if (t.includes("server-timing"))
        return [s("request.get('/')", 130), s("expect(headers['server-timing']).toBeTruthy()", 60)];
      return [s("startTracing()", 60), s("drive scenario", 540), s("assert Web Vitals thresholds", 120)];
    }

    case "Security": {
      if (t.includes("csp"))
        return [s("request.get('/')", 130), s("expect(csp).toMatch(/default-src 'self'/)", 80)];
      if (t.includes("x-frame"))
        return [s("request.get('/')", 130), s("expect(headers['x-frame-options']).toBe('DENY')", 70)];
      if (t.includes("strict-transport") || t.includes("hsts"))
        return [s("request.get('/')", 130), s("expect(hsts).toMatch(/max-age=\\d{7,}/)", 70)];
      if (t.includes("mixed content"))
        return [s("collect all asset URLs", 140), s("expect(every).toMatch(/^https:/)", 70)];
      if (t.includes("reflected xss"))
        return [s("goto('/?q=<script>x</script>')", 200), s("expect(html).not.toContain('<script>x')", 80)];
      if (t.includes("stored xss"))
        return [s("submit comment with <script>", 220), s("reload()", 220), s("expect(html).not.toContain('<script>')", 80)];
      if (t.includes("sql injection"))
        return [s("search ' OR 1=1 --", 160), s("expect(rows).toHaveLength(0)", 70)];
      if (t.includes("csrf"))
        return [s("login twice", 320), s("expect(csrf1).not.toBe(csrf2)", 70)];
      if (t.includes("cookies"))
        return [s("login", 240), s("expect(cookie).toMatchObject({ secure, httpOnly, sameSite })", 100)];
      if (t.includes("user existence"))
        return [s("login known vs unknown email", 280), s("expect(latency.diff).toBeLessThan(50ms)", 80), s("expect(message).toBeIdentical()", 60)];
      if (t.includes("alg=none"))
        return [s("forge JWT { alg: none }", 100), s("request.get('/api/me', token)", 160), s("expect(status).toBe(401)", 60)];
      if (t.includes("open redirect"))
        return [s("goto('/login?next=//evil.com')", 200), s("login", 280), s("expect(url.host).toBe(baseHost)", 70)];
      if (t.includes("path traversal"))
        return [s("get('/files/../../etc/passwd')", 160), s("expect(status).toBe(400)", 60)];
      if (t.includes("framework version") || t.includes("hides"))
        return [s("request.get('/')", 130), s("expect(headers['x-powered-by']).toBeUndefined()", 70)];
      if (t.includes("idor") || t.includes("insecure direct"))
        return [s("get /api/users/1/private as user 2", 180), s("expect(status).toBe(403)", 60)];
      if (t.includes("subresource integrity") || t.includes("sri"))
        return [s("locate('script[src^=http]')", 110), s("expect(every).toHaveAttribute('integrity')", 80)];
      if (t.includes("graphql"))
        return [s("post '{ __schema { types { name } } }'", 200), s("expect(errors[0]).toMatch(/disabled/)", 70)];
      return [s("send crafted request", 160), s("assert headers / response", 90)];
    }

    case "Mobile": {
      if (t.includes("iphone se"))
        return [s("use(devices['iPhone SE'])", 70), s("goto('/auth')", 200), s("complete login", 360), s("expect(url).toMatch(/dashboard/)", 80)];
      if (t.includes("iphone 14"))
        return [s("use(devices['iPhone 14'])", 70), s("goto('/auth')", 200), s("complete login", 360), s("expect(url).toMatch(/dashboard/)", 80)];
      if (t.includes("pixel"))
        return [s("use(devices['Pixel 7'])", 70), s("goto('/dashboard')", 220), s("expect(getByRole('main')).toBeVisible()", 80)];
      if (t.includes("galaxy"))
        return [s("use(devices['Galaxy S22'])", 70), s("complete checkout", 480), s("expect(orderId).toBeTruthy()", 80)];
      if (t.includes("ipad"))
        return [s("use(devices['iPad Pro 11'])", 70), s("goto('/')", 220), s("expect(splitView).toBeVisible()", 80)];
      if (t.includes("mobile menu"))
        return [s("setViewportSize(375x667)", 60), s("tap menu", 110), s("expect(nav).toBeVisible()", 70), s("tap close", 100)];
      if (t.includes("pull-to-refresh"))
        return [s("dispatch touchstart/move", 220), s("expect(list).toHaveBeenRefetched()", 100)];
      if (t.includes("touch targets"))
        return [s("locate interactive elements", 140), s("expect(every).toHaveSize({ w: >=44, h: >=44 })", 100)];
      if (t.includes("zoom-on-focus"))
        return [s("inspect <meta viewport>", 80), s("expect(content).toContain('user-scalable')", 60)];
      if (t.includes("keyboard"))
        return [s("focus input near bottom", 120), s("expect(input).toBeInViewport()", 80)];
      if (t.includes("offline"))
        return [s("setOffline(true)", 60), s("expect(getByText(/offline/)).toBeVisible()", 80)];
      if (t.includes("camera"))
        return [s("trigger getUserMedia", 100), s("expect(prompt).toBeVisible()", 80)];
      if (t.includes("geolocation"))
        return [s("trigger geolocation.getCurrentPosition", 100), s("expect(prompt).toBeVisible()", 80)];
      if (t.includes("deep link"))
        return [s("goto('app://item/42')", 200), s("expect(url.pathname).toBe('/items/42')", 70)];
      return [s("use device descriptor", 120), s("run flow", 480), s("assert layout & a11y", 110)];
    }

    case "Compliance (21 CFR Part 11)": {
      if (t.includes("user, action") || t.includes("audit log records"))
        return [s("approve record", 220), s("query audit_log", 140), s("expect(entry).toMatchObject({ user, action, before, after })", 110)];
      if (t.includes("hash chain") || t.includes("tamper-evident"))
        return [s("fetch last 100 audit rows", 200), s("recompute hash chain", 240), s("expect(chain).toBeIntact()", 80)];
      if (t.includes("re-authentication"))
        return [s("click 'Sign'", 120), s("expect(prompt /password/)", 80)];
      if (t.includes("meaning"))
        return [s("sign with meaning='approval'", 220), s("expect(audit.meaning).toBe('approval')", 70)];
      if (t.includes("trusted time"))
        return [s("sign record", 200), s("compare against NTP time", 160), s("expect(skew).toBeLessThan(2s)", 70)];
      if (t.includes("superseded") || t.includes("cannot be deleted"))
        return [s("attempt DELETE /records/:id", 140), s("expect(status).toBe(405)", 60)];
      if (t.includes("least privilege"))
        return [s("call admin endpoint as viewer", 160), s("expect(status).toBe(403)", 60)];
      if (t.includes("password expiry"))
        return [s("set tenant.password_max_age=30d", 140), s("advance clock 31d", 80), s("expect(forced rotation)", 80)];
      if (t.includes("idle session"))
        return [s("authenticate", 240), s("idle 16min", 100), s("perform action", 140), s("expect(status).toBe(401)", 60)];
      if (t.includes("validation report"))
        return [s("trigger /reports/validation", 200), s("expect(pdf.size).toBeGreaterThan(10kb)", 80)];
      if (t.includes("encrypted at rest"))
        return [s("describe backup KMS key", 140), s("expect(algorithm).toBe('AES256')", 70)];
      if (t.includes("restore from backup"))
        return [s("trigger restore drill", 320), s("expect(rowCount).toMatchProd(±1%)", 90)];
      if (t.includes("pii export"))
        return [s("export user payload", 220), s("expect(payload).not.toContain('ssn')", 80)];
      if (t.includes("checksum"))
        return [s("read record + checksum", 160), s("expect(sha256(body)).toBe(stored)", 80)];
      if (t.includes("approval workflow"))
        return [s("submit as user A", 160), s("approve as same user A", 140), s("expect(error /distinct reviewer/)", 80)];
      if (t.includes("change control"))
        return [s("save change without ticket", 140), s("expect(error /ticket required/)", 70)];
      if (t.includes("training"))
        return [s("query training_log for user", 160), s("expect(latest).toBeWithin('1y')", 70)];
      if (t.includes("periodic review"))
        return [s("query review_schedule", 140), s("expect(nextDue).toBeAfter(now)", 60)];
      return [s("perform audited action", 220), s("query audit_log", 140), s("assert immutability + signature", 120)];
    }

    case "Chaos / Resilience": {
      if (t.includes("500ms latency"))
        return [s("inject latency=500ms", 240), s("goto('/')", 320), s("expect(skeleton).toBeVisible()", 80), s("expect(main).toBeVisible(t<3s)", 200)];
      if (t.includes("2s latency"))
        return [s("inject latency=2000ms", 240), s("goto('/')", 320), s("expect(loading state)", 100), s("expect(main).toBeVisible(t<6s)", 240)];
      if (t.includes("transient 503") || t.includes("retry succeeds"))
        return [s("inject 503 first 2 of N", 80), s("trigger request", 180), s("expect(finalStatus).toBe(200)", 60)];
      if (t.includes("circuit breaker opens"))
        return [s("inject 100% errors", 80), s("burst 20 requests", 280), s("expect(state).toBe('open')", 70)];
      if (t.includes("half-opens"))
        return [s("wait cooldown", 320), s("send probe request", 160), s("expect(state).toBe('closed')", 70)];
      if (t.includes("bulkhead"))
        return [s("saturate dep A pool", 320), s("call dep B", 180), s("expect(B.latency).toBeNormal()", 80)];
      if (t.includes("fallback ui"))
        return [s("kill upstream", 80), s("goto('/widget')", 240), s("expect(getByText(/temporarily unavailable/)).toBeVisible()", 90)];
      if (t.includes("cache stampede"))
        return [s("flush cache key", 80), s("burst 50 concurrent reads", 360), s("expect(originHits).toBe(1)", 70)];
      if (t.includes("pod restart"))
        return [s("send 100 in-flight reqs", 320), s("kill -SIGTERM api pod", 200), s("expect(no 5xx)", 90)];
      if (t.includes("failover"))
        return [s("promote replica", 380), s("send writes", 240), s("expect(all 200 within 30s)", 90)];
      if (t.includes("read-only"))
        return [s("toggle read_only=true", 100), s("goto('/')", 200), s("expect(banner).toBeVisible()", 80)];
      if (t.includes("background jobs"))
        return [s("enqueue 50 jobs", 220), s("kill worker", 100), s("restart worker", 220), s("expect(processed).toBe(50)", 80)];
      if (t.includes("idempotent writes"))
        return [s("post with idempotency key x3", 280), s("expect(rows).toHaveCount(1)", 70)];
      if (t.includes("backpressure"))
        return [s("burst 1000 req/s", 540), s("expect(every fail).toBe(429)", 80)];
      return [s("inject fault via /chaos-experiment", 240), s("drive user flow", 360), s("assert graceful degradation", 140), s("restore baseline", 80)];
    }
  }
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

function pad(n: number, width = 3): string {
  return String(n).padStart(width, "0");
}

// Deterministic expected-status distribution per category index so the suite
// looks realistic (mostly pass, a few flaky/fail/skipped) without randomness.
function pickExpected(catIndex: number, i: number): TestStatus {
  const seed = (catIndex * 31 + i * 7) % 100;
  if (seed < 86) return "pass";
  if (seed < 94) return "flaky";
  if (seed < 98) return "fail";
  return "skipped";
}

function generate(): PwTest[] {
  const out: PwTest[] = [];
  CATEGORIES.forEach((catDef, catIndex) => {
    const titles = TEMPLATES[catDef.name];
    for (let i = 0; i < catDef.count; i++) {
      // If we have more slots than unique titles, append a numbered suffix
      // (variant) so every test stays uniquely identifiable.
      const baseTitle = titles[i % titles.length];
      const variant = Math.floor(i / titles.length);
      const title = variant === 0 ? baseTitle : `${baseTitle} (variant ${variant + 1})`;
      const id = `${catDef.prefix}-${pad(i + 1)}`;
      const t: PwTest = {
        id,
        category: catDef.name,
        title,
        tags: catDef.tags,
        expected: pickExpected(catIndex, i),
        steps: buildSteps(catDef.name, title),
        code: "",
      };
      t.code = buildCode(t);
      out.push(t);
    }
  });
  return out;
}

export const PLAYWRIGHT_TESTS: PwTest[] = generate();

export const PLAYWRIGHT_CATEGORIES: { name: PwCategory; count: number }[] =
  CATEGORIES.map((c) => ({ name: c.name, count: c.count }));

export const TOTAL_TESTS = PLAYWRIGHT_TESTS.length;

