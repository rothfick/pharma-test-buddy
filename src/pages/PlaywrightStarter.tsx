import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, FileCode, Sparkles, Zap, Shield, Activity, Workflow, TestTube, Eye, Layers } from "lucide-react";
import { toast } from "sonner";

export default function PlaywrightStarter() {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/playwright-starter`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "qa-playwright-starter.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success("Downloaded — extract and run npm install");
    } catch (e) {
      toast.error(`Download failed: ${(e as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="playwright-starter-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Playwright Starter Kit</h1>
        <p className="text-muted-foreground">
          Production-grade TypeScript framework — POM, self-healing locators, AI test generation, accessibility, visual & performance testing. One ZIP, zero setup.
        </p>
      </div>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                qa-playwright-starter.zip
              </CardTitle>
              <CardDescription>
                ~30 files · TypeScript 5 · Playwright 1.48 · Multi-browser · GitHub Actions + Azure DevOps included
              </CardDescription>
            </div>
            <Button size="lg" onClick={download} disabled={downloading} data-testid="download-zip">
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download ZIP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">@playwright/test ^1.48</Badge>
            <Badge variant="secondary">@axe-core/playwright</Badge>
            <Badge variant="secondary">k6 perf scripts</Badge>
            <Badge variant="secondary">5 browsers (incl. mobile)</Badge>
            <Badge variant="secondary">Sharding (4 parallel)</Badge>
            <Badge variant="secondary">JUnit + HTML + JSON reporters</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Layers}
          title="Page Object Model"
          desc="Clean POM in src/pages/ — BasePage abstraction, LoginPage, DashboardPage examples. Path aliases via tsconfig."
        />
        <FeatureCard
          icon={Shield}
          title="Self-healing locators"
          desc="smartLocator() tries multiple strategies (testId → role → text → CSS) with observability logging."
        />
        <FeatureCard
          icon={Sparkles}
          title="AI test generator"
          desc='npm run ai:gen "User checks out" → generates a complete .spec.ts via Lovable AI Gateway.'
        />
        <FeatureCard
          icon={Eye}
          title="Accessibility (axe-core)"
          desc="WCAG 2.1 AA assertions baked in. Tag with @a11y, run nightly."
        />
        <FeatureCard
          icon={TestTube}
          title="Visual regression"
          desc="Pixel-diff screenshots per browser with maxDiffPixelRatio threshold."
        />
        <FeatureCard
          icon={Activity}
          title="k6 performance scripts"
          desc="Load + stress profiles with thresholds (p95<500ms, error_rate<1%)."
        />
        <FeatureCard
          icon={Workflow}
          title="CI/CD pipelines"
          desc="GitHub Actions with sharding (4×) + Azure DevOps multi-browser matrix. Artifacts uploaded automatically."
        />
        <FeatureCard
          icon={Zap}
          title="Smart fixtures"
          desc="Custom auth.fixture.ts — pre-authenticated page per role via storageState. Typed API client with Zod."
        />
        <FeatureCard
          icon={FileCode}
          title="Tags & test groups"
          desc="@smoke (PR gate, ~2 min), @regression (nightly), @flaky (quarantine), @a11y, @visual."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project structure</CardTitle>
          <CardDescription>What's inside the ZIP</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-4 text-xs leading-relaxed">{`qa-playwright-starter/
├── package.json              # scripts: test, test:smoke, test:a11y, ai:gen, ...
├── playwright.config.ts      # 5 browsers, sharding, retries, reporters
├── tsconfig.json             # path aliases @pages, @fixtures
├── .env.example              # BASE_URL, credentials, AI key
├── README.md                 # full documentation
├── src/
│   ├── pages/
│   │   ├── BasePage.ts       # abstract base with goto/expectVisible/waitForToast
│   │   ├── LoginPage.ts      # uses smartLocator strategies
│   │   └── DashboardPage.ts
│   ├── fixtures/
│   │   └── auth.fixture.ts   # loginPage, dashboardPage, authenticatedPage
│   ├── helpers/
│   │   ├── smart-locator.ts  # self-healing locator engine
│   │   ├── retry.ts          # exponential backoff
│   │   └── data-builder.ts   # aUser(), anAdmin() builders
│   └── api/
│       └── ApiClient.ts      # Zod-validated typed REST client
├── tests/
│   ├── smoke/login.spec.ts
│   ├── regression/dashboard.spec.ts
│   ├── e2e/user-journey.spec.ts
│   ├── accessibility/a11y.spec.ts
│   └── visual/visual.spec.ts
├── scripts/
│   └── ai-generate.ts        # AI-powered test scaffolding
├── perf/
│   ├── load.js               # k6 load test (50 VUs)
│   └── stress.js             # k6 stress to breaking point
├── .github/workflows/playwright.yml   # 4-shard CI matrix
└── azure-pipelines.yml                # multi-browser pipeline
`}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick start</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded bg-muted p-4 text-xs leading-relaxed">{`# 1. Extract ZIP and install
unzip qa-playwright-starter.zip && cd qa-playwright-starter
npm install
npx playwright install --with-deps

# 2. Configure
cp .env.example .env   # set BASE_URL + credentials

# 3. Run
npm run test:smoke      # ~2 min critical path
npm test                # full suite
npm run report          # open HTML report

# 4. Generate a new test with AI
LOVABLE_API_KEY=... npm run ai:gen "User adds task and marks it done"`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof Sparkles; title: string; desc: string }) {
  return (
    <Card data-testid={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
