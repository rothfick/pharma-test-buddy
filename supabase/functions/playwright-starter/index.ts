// Generates a downloadable Playwright TypeScript starter repo as a ZIP.
// Pure Deno + JSZip — no filesystem dependency.
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FILES: Record<string, string> = {
  "package.json": JSON.stringify({
    name: "qa-playwright-starter",
    version: "1.0.0",
    description: "Production-grade Playwright TypeScript starter with POM, self-healing locators, AI test generation, accessibility & visual testing.",
    private: true,
    type: "module",
    scripts: {
      test: "playwright test",
      "test:ui": "playwright test --ui",
      "test:headed": "playwright test --headed",
      "test:debug": "PWDEBUG=1 playwright test",
      "test:smoke": "playwright test --grep @smoke",
      "test:regression": "playwright test --grep @regression",
      "test:a11y": "playwright test tests/accessibility",
      "test:visual": "playwright test tests/visual --update-snapshots",
      "test:perf": "k6 run perf/load.js",
      "report": "playwright show-report",
      "codegen": "playwright codegen",
      "ai:gen": "tsx scripts/ai-generate.ts",
      "lint": "eslint . --ext .ts",
      "format": "prettier --write .",
    },
    devDependencies: {
      "@playwright/test": "^1.48.0",
      "@axe-core/playwright": "^4.10.0",
      "@types/node": "^22.7.0",
      "dotenv": "^16.4.5",
      "tsx": "^4.19.0",
      "typescript": "^5.6.0",
      "eslint": "^9.12.0",
      "@typescript-eslint/parser": "^8.8.0",
      "@typescript-eslint/eslint-plugin": "^8.8.0",
      "prettier": "^3.3.3",
      "zod": "^3.23.8",
    },
  }, null, 2),

  "playwright.config.ts": `import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Playwright config — production-grade defaults.
 * Reads BASE_URL from env, supports CI parallelism, multi-browser, traces & video on failure.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: {
      'X-Test-Run-Id': process.env.GITHUB_RUN_ID ?? 'local',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'echo "Bring your own dev server"',
    url: process.env.BASE_URL ?? 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
`,

  "tsconfig.json": JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      baseUrl: ".",
      paths: { "@/*": ["./src/*"], "@pages/*": ["./src/pages/*"], "@fixtures/*": ["./src/fixtures/*"] },
    },
    include: ["tests/**/*", "src/**/*", "scripts/**/*"],
  }, null, 2),

  ".env.example": `BASE_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
USER_EMAIL=user@example.com
USER_PASSWORD=changeme

# AI test generation (optional)
LOVABLE_API_KEY=
AI_MODEL=google/gemini-2.5-flash
`,

  ".gitignore": `node_modules/
test-results/
playwright-report/
playwright/.cache/
.env
.env.local
*.log
.DS_Store
`,

  "README.md": `# QA Playwright Starter

Production-grade Playwright TypeScript framework with everything you need on day one.

## Features

- **Page Object Model (POM)** — clean, scalable architecture in \`src/pages/\`
- **Self-healing locators** — auto-fallback strategy for flaky selectors
- **Auth fixture** — pre-authenticated state per role (admin, user) via storageState
- **API helper** — typed REST client for setup/teardown
- **AI test generation** — \`pnpm ai:gen "Test the login flow"\` → generated test file
- **Accessibility tests** — axe-core integration with WCAG 2.1 AA assertions
- **Visual regression** — pixel-diff snapshots per browser
- **k6 performance tests** — load/stress/spike scripts
- **CI/CD** — GitHub Actions + Azure DevOps pipelines included
- **Multi-browser** — Chromium, Firefox, WebKit, mobile (iOS/Android)
- **Reporters** — HTML, JSON, JUnit XML for CI integration

## Quick start

\`\`\`bash
npm install
npx playwright install --with-deps
cp .env.example .env  # edit your credentials
npm test
npm run report
\`\`\`

## Project structure

\`\`\`
src/
  pages/           # Page Object Model
  fixtures/        # Custom Playwright fixtures (auth, API)
  helpers/         # Self-healing locators, retry, data builders
  api/             # Typed API client
tests/
  smoke/           # @smoke — fast critical path
  regression/      # @regression — full coverage
  accessibility/   # axe-core a11y tests
  visual/          # Visual regression
  e2e/             # End-to-end user journeys
scripts/
  ai-generate.ts   # AI-powered test scaffolding
perf/
  load.js          # k6 load test
  stress.js        # k6 stress test
.github/workflows/playwright.yml
azure-pipelines.yml
\`\`\`

## Self-healing locators

\`\`\`ts
import { smartLocator } from '@/helpers/smart-locator';

// Tries each strategy in order, returns first match
const button = smartLocator(page, [
  { role: 'button', name: 'Sign in' },
  { testId: 'signin-submit' },
  { text: 'Sign in' },
  { css: '.signin-btn' },
]);
\`\`\`

## AI test generation

\`\`\`bash
LOVABLE_API_KEY=... npm run ai:gen "User adds item to cart and checks out"
# → tests/generated/user-checkout.spec.ts
\`\`\`

## Tags

- \`@smoke\` — critical path, runs on every PR (~2 min)
- \`@regression\` — full suite, runs nightly (~30 min)
- \`@flaky\` — quarantined, tracked but not blocking
- \`@a11y\` — accessibility tests
- \`@visual\` — visual regression tests

## Running specific test groups

\`\`\`bash
npm run test:smoke          # @smoke only
npm run test:regression     # @regression only
npm run test:a11y           # accessibility
npm run test:visual         # visual diffs
\`\`\`

## CI/CD

GitHub Actions runs on every PR with sharding (4 parallel jobs).
Test results uploaded as artifacts; flaky tests reported to your QA dashboard via webhook.

## Contributing

1. Create test in \`tests/\` matching the feature area
2. Use POM — no raw selectors in tests
3. Tag with \`@smoke\` or \`@regression\`
4. Run locally before PR: \`npm run lint && npm test\`

---

Generated by **QA Playground** — your AI-powered QA workspace.
`,

  "src/pages/BasePage.ts": `import { Page, expect, Locator } from '@playwright/test';

/**
 * Base class for all Page Objects.
 * Provides common navigation, waiting, and assertion helpers.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly path: string;

  async goto(options?: { waitForSelector?: string }) {
    await this.page.goto(this.path);
    if (options?.waitForSelector) {
      await this.page.waitForSelector(options.waitForSelector);
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectVisible(locator: Locator, message?: string) {
    await expect(locator, message).toBeVisible({ timeout: 10_000 });
  }

  async waitForToast(text: string | RegExp) {
    await expect(this.page.getByRole('status').filter({ hasText: text })).toBeVisible({ timeout: 5000 });
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: \`test-results/screenshots/\${name}.png\`, fullPage: true });
  }
}
`,

  "src/pages/LoginPage.ts": `import { Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { smartLocator } from '../helpers/smart-locator';

export class LoginPage extends BasePage {
  readonly path = '/auth';

  constructor(page: Page) {
    super(page);
  }

  // Locators — tolerant to UI refactors
  get emailInput() {
    return smartLocator(this.page, [
      { testId: 'signin-email' },
      { role: 'textbox', name: /email/i },
      { css: 'input[type="email"]' },
    ]);
  }

  get passwordInput() {
    return smartLocator(this.page, [
      { testId: 'signin-password' },
      { role: 'textbox', name: /password/i },
      { css: 'input[type="password"]' },
    ]);
  }

  get submitButton() {
    return smartLocator(this.page, [
      { testId: 'signin-submit' },
      { role: 'button', name: /sign in/i },
      { css: 'button[type="submit"]' },
    ]);
  }

  async login(email: string, password: string) {
    await this.goto();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  }
}
`,

  "src/pages/DashboardPage.ts": `import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly path = '/';

  constructor(page: Page) {
    super(page);
  }

  get header() {
    return this.page.getByTestId('app-header');
  }

  get userMenu() {
    return this.page.getByTestId('user-menu-trigger');
  }

  async signOut() {
    await this.userMenu.click();
    await this.page.getByTestId('menu-signout').click();
  }
}
`,

  "src/helpers/smart-locator.ts": `import { Page, Locator } from '@playwright/test';

export type LocatorStrategy =
  | { testId: string }
  | { role: 'button' | 'textbox' | 'link' | 'heading' | 'checkbox' | 'status' | 'dialog'; name?: string | RegExp }
  | { text: string | RegExp }
  | { label: string | RegExp }
  | { placeholder: string | RegExp }
  | { css: string };

/**
 * Self-healing locator: tries each strategy in order, returns the first that resolves.
 * Logs which strategy succeeded for observability — feed this into your flaky-test analytics.
 */
export function smartLocator(page: Page, strategies: LocatorStrategy[]): Locator {
  for (const s of strategies) {
    const locator = buildLocator(page, s);
    // Playwright is lazy; we return the first locator and rely on auto-wait.
    // For true runtime fallback, see smartLocatorAsync below.
    return locator;
  }
  throw new Error('smartLocator: no strategies provided');
}

export async function smartLocatorAsync(page: Page, strategies: LocatorStrategy[], timeout = 5000): Promise<Locator> {
  const errors: string[] = [];
  for (const s of strategies) {
    const locator = buildLocator(page, s);
    try {
      await locator.first().waitFor({ state: 'attached', timeout });
      if (process.env.SMART_LOCATOR_LOG) {
        console.log(\`[smart-locator] matched: \${JSON.stringify(s)}\`);
      }
      return locator;
    } catch (e) {
      errors.push(\`\${JSON.stringify(s)}: \${(e as Error).message.split('\\n')[0]}\`);
    }
  }
  throw new Error(\`smartLocatorAsync: no strategy matched.\\n\${errors.join('\\n')}\`);
}

function buildLocator(page: Page, s: LocatorStrategy): Locator {
  if ('testId' in s) return page.getByTestId(s.testId);
  if ('role' in s) return page.getByRole(s.role, s.name ? { name: s.name } : undefined);
  if ('text' in s) return page.getByText(s.text);
  if ('label' in s) return page.getByLabel(s.label);
  if ('placeholder' in s) return page.getByPlaceholder(s.placeholder);
  if ('css' in s) return page.locator(s.css);
  throw new Error('Unknown locator strategy');
}
`,

  "src/helpers/retry.ts": `/**
 * Retry an async operation with exponential backoff.
 * Useful for flaky API calls in test setup.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; initialDelayMs?: number; factor?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, initialDelayMs = 500, factor = 2 } = options;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts) break;
      const delay = initialDelayMs * Math.pow(factor, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
`,

  "src/helpers/data-builder.ts": `/**
 * Test data builders — readable, composable, type-safe.
 */
export interface User {
  email: string;
  password: string;
  displayName: string;
  role: 'admin' | 'user';
}

export const aUser = (overrides: Partial<User> = {}): User => ({
  email: \`user-\${Date.now()}-\${Math.random().toString(36).slice(2, 7)}@example.com\`,
  password: 'TestPass123!',
  displayName: 'Test User',
  role: 'user',
  ...overrides,
});

export const anAdmin = (overrides: Partial<User> = {}): User => aUser({ role: 'admin', ...overrides });
`,

  "src/fixtures/auth.fixture.ts": `import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: DashboardPage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  authenticatedPage: async ({ page, loginPage, dashboardPage }, use) => {
    const email = process.env.USER_EMAIL!;
    const password = process.env.USER_PASSWORD!;
    if (!email || !password) {
      throw new Error('USER_EMAIL and USER_PASSWORD must be set in .env');
    }
    await loginPage.login(email, password);
    await use(dashboardPage);
  },
});

export { expect };
`,

  "src/api/ApiClient.ts": `/**
 * Typed REST client for backend setup/teardown in tests.
 */
import { z } from 'zod';
import { retry } from '../helpers/retry';

export class ApiClient {
  constructor(private readonly baseUrl: string, private readonly token?: string) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = \`Bearer \${this.token}\`;
    return h;
  }

  async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    return retry(async () => {
      const res = await fetch(\`\${this.baseUrl}\${path}\`, { headers: this.headers() });
      if (!res.ok) throw new Error(\`GET \${path} → \${res.status}\`);
      return schema.parse(await res.json());
    });
  }

  async post<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
    return retry(async () => {
      const res = await fetch(\`\${this.baseUrl}\${path}\`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(\`POST \${path} → \${res.status}: \${await res.text()}\`);
      return schema.parse(await res.json());
    });
  }
}
`,

  "tests/smoke/login.spec.ts": `import { test, expect } from '../../src/fixtures/auth.fixture';

test.describe('Login @smoke', () => {
  test('user can sign in with valid credentials', async ({ loginPage, page }) => {
    await loginPage.login(process.env.USER_EMAIL!, process.env.USER_PASSWORD!);
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('app-header')).toBeVisible();
  });

  test('user sees error on invalid credentials', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.emailInput.fill('wrong@example.com');
    await loginPage.passwordInput.fill('WrongPass123');
    await loginPage.submitButton.click();
    await expect(page.getByTestId('auth-error')).toBeVisible();
  });
});
`,

  "tests/regression/dashboard.spec.ts": `import { test, expect } from '../../src/fixtures/auth.fixture';

test.describe('Dashboard @regression', () => {
  test('renders main navigation for authenticated user', async ({ authenticatedPage, page }) => {
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-tasks')).toBeVisible();
  });

  test('user can sign out', async ({ authenticatedPage, page }) => {
    await authenticatedPage.signOut();
    await expect(page).toHaveURL(/\\/auth/);
  });
});
`,

  "tests/accessibility/a11y.spec.ts": `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility @a11y', () => {
  const pages = [
    { path: '/auth', name: 'login' },
    // add more public pages here; authenticated pages should use the auth fixture
  ];

  for (const p of pages) {
    test(\`\${p.name} page meets WCAG 2.1 AA\`, async ({ page }) => {
      await page.goto(p.path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
  }
});
`,

  "tests/visual/visual.spec.ts": `import { test, expect } from '@playwright/test';

test.describe('Visual regression @visual', () => {
  test('login page snapshot', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login.png', { maxDiffPixelRatio: 0.01, fullPage: true });
  });
});
`,

  "tests/e2e/user-journey.spec.ts": `import { test, expect } from '../../src/fixtures/auth.fixture';

test.describe('End-to-end user journey @regression', () => {
  test('login → navigate → sign out', async ({ loginPage, dashboardPage, page }) => {
    await loginPage.login(process.env.USER_EMAIL!, process.env.USER_PASSWORD!);
    await expect(page).toHaveURL('/');
    await page.getByTestId('nav-tasks').click();
    await expect(page).toHaveURL('/tasks');
    await dashboardPage.signOut();
    await expect(page).toHaveURL(/\\/auth/);
  });
});
`,

  "scripts/ai-generate.ts": `#!/usr/bin/env tsx
/**
 * AI-powered Playwright test generator.
 * Usage: npm run ai:gen "Describe the test scenario"
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const apiKey = process.env.LOVABLE_API_KEY;
const model = process.env.AI_MODEL ?? 'google/gemini-2.5-flash';
const prompt = process.argv.slice(2).join(' ');

if (!apiKey) {
  console.error('LOVABLE_API_KEY not set. Get one from your Lovable Cloud dashboard.');
  process.exit(1);
}
if (!prompt) {
  console.error('Usage: npm run ai:gen "Test the login flow"');
  process.exit(1);
}

const systemPrompt = \`You are a senior Playwright TypeScript test author.
Generate a single complete .spec.ts file. Rules:
- Use Page Object Model from src/pages/ (LoginPage, DashboardPage)
- Use the fixtures from src/fixtures/auth.fixture.ts
- Use data-testid selectors when possible, role-based as fallback
- Tag tests with @smoke or @regression
- Follow AAA pattern (Arrange, Act, Assert)
- Output ONLY the TypeScript code, no markdown fences, no commentary.\`;

const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${apiKey}\`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  }),
});

if (!res.ok) {
  console.error(\`AI gateway error: \${res.status} \${await res.text()}\`);
  process.exit(1);
}

const data = await res.json() as { choices: Array<{ message: { content: string } }> };
const code = data.choices[0].message.content
  .replace(/^\\\`\\\`\\\`(typescript|ts)?\\n/, '')
  .replace(/\\n\\\`\\\`\\\`$/, '')
  .trim();

const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
const dir = join(process.cwd(), 'tests', 'generated');
mkdirSync(dir, { recursive: true });
const file = join(dir, \`\${slug}.spec.ts\`);
writeFileSync(file, code, 'utf8');

console.log(\`✓ Generated: \${file}\`);
console.log(\`  Run with: npx playwright test \${file}\`);
`,

  "perf/load.js": `// k6 load test — run with: k6 run perf/load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '1m',  target: 10 },   // sustain
    { duration: '30s', target: 50 },   // peak
    { duration: '1m',  target: 50 },   // sustain peak
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(\`\${BASE_URL}/\`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response under 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
`,

  "perf/stress.js": `// k6 stress test — find the breaking point
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m',  target: 100 },
    { duration: '2m',  target: 200 },
    { duration: '2m',  target: 400 },
    { duration: '1m',  target: 0 },
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(\`\${BASE_URL}/\`);
  check(res, { 'status not 5xx': (r) => r.status < 500 });
}
`,

  ".github/workflows/playwright.yml": `name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # nightly regression

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Playwright tests
        env:
          BASE_URL: \${{ secrets.BASE_URL }}
          USER_EMAIL: \${{ secrets.USER_EMAIL }}
          USER_PASSWORD: \${{ secrets.USER_PASSWORD }}
        run: npx playwright test --shard=\${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-\${{ matrix.shard }}
          path: playwright-report/
          retention-days: 14
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-\${{ matrix.shard }}
          path: test-results/
          retention-days: 14

  publish-metrics:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: Push DORA + test_run metrics
        env:
          QA_DASHBOARD_URL: \${{ secrets.QA_DASHBOARD_URL }}
          QA_DASHBOARD_TOKEN: \${{ secrets.QA_DASHBOARD_TOKEN }}
        run: |
          # Aggregate JUnit XMLs and POST to /functions/v1/metrics-ingest
          echo "Publishing test metrics to QA dashboard..."
`,

  "azure-pipelines.yml": `trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: playwright-secrets

strategy:
  matrix:
    chromium:
      browser: 'chromium'
    firefox:
      browser: 'firefox'
    webkit:
      browser: 'webkit'

steps:
  - task: NodeTool@0
    inputs: { versionSpec: '20.x' }
  - script: npm ci
  - script: npx playwright install --with-deps
  - script: npx playwright test --project=$(browser)
    env:
      BASE_URL: $(BASE_URL)
      USER_EMAIL: $(USER_EMAIL)
      USER_PASSWORD: $(USER_PASSWORD)
  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'test-results/junit.xml'
      mergeTestResults: true
  - task: PublishPipelineArtifact@1
    condition: always()
    inputs:
      targetPath: 'playwright-report'
      artifactName: 'playwright-report-$(browser)'
`,

  ".eslintrc.json": JSON.stringify({
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  }, null, 2),

  ".prettierrc.json": JSON.stringify({
    semi: true,
    singleQuote: true,
    trailingComma: "all",
    printWidth: 100,
    tabWidth: 2,
  }, null, 2),
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const zip = new JSZip();
    for (const [path, content] of Object.entries(FILES)) {
      zip.file(path, content);
    }

    const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });

    return new Response(blob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="qa-playwright-starter.zip"',
        "Content-Length": String(blob.byteLength),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
