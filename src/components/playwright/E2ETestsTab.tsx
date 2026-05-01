import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileCode2, FlaskConical } from "lucide-react";

type E2ETest = {
  name: string;
  intent: string;
};

type E2EFile = {
  file: string;
  path: string;
  scope: string;
  description: string;
  tests: E2ETest[];
};

const E2E_FILES: E2EFile[] = [
  {
    file: "live-driver.test.ts",
    path: "src/test/live-driver.test.ts",
    scope: "LiveDriver (in-browser DOM driver)",
    description:
      "Testuje silnik sterujący iframem: wyszukiwanie selektorów, klikanie, wypełnianie pól, asercje, przerywanie i screenshoty.",
    tests: [
      { name: "waits for selector and clicks it", intent: "Czeka aż element pojawi się w DOM iframe i wykonuje na nim kliknięcie." },
      { name: "fills an input via the React-compatible setter", intent: "Wpisuje wartość do <input> przez natywny setter, aby React/Zod ją zauważyły." },
      { name: "expectVisible throws on missing element", intent: "Asercja widoczności rzuca błąd, gdy elementu nie ma." },
      { name: "expectText matches case-insensitively", intent: "Asercja tekstu działa niezależnie od wielkości liter." },
      { name: "runAll stops at the first failure", intent: "Sekwencja komend zatrzymuje się przy pierwszym niepowodzeniu." },
      { name: "cancel() short-circuits the run", intent: "Wywołanie cancel() natychmiast przerywa bieżący run." },
      { name: "emits screenshot events", intent: "Driver emituje zdarzenia screenshot dla podglądu w UI." },
    ],
  },
  {
    file: "live-scenarios.test.ts",
    path: "src/test/live-scenarios.test.ts",
    scope: "Mapowanie 224 testów → realne komendy DOM",
    description:
      "Sprawdza, że każdy test z katalogu zostaje przetłumaczony na poprawną sekwencję komend uruchamianych na żywej aplikacji.",
    tests: [
      { name: "returns a scenario for every catalog test", intent: "Każdy z 224 testów ma niepustą sekwencję komend i poprawne zakresy kroków." },
      { name: "Auth invalid scenario uses /auth and submits", intent: "Scenariusz logowania wchodzi na /auth i klika przycisk submit." },
      { name: "flags wizard happy path as mutating", intent: "Happy-path kreatora jest oznaczony jako mutujący dane (wymaga rollbacku)." },
      { name: "flags read-only Smoke/Visual scenarios as non-mutating", intent: "Scenariusze Smoke są tylko-do-odczytu i nie wymagają rollbacku." },
    ],
  },
  {
    file: "playwright-starter-preview.test.tsx",
    path: "src/test/playwright-starter-preview.test.tsx",
    scope: "Modal Live Preview (75% overlay)",
    description:
      "Testy interfejsu strony /playwright-starter — rozwijanie podglądu do trybu modal, zamykanie i zachowanie backdropu.",
    tests: [
      { name: "renders the catalog tab with the live preview stage", intent: "Domyślnie renderuje katalog wraz ze sceną podglądu i przyciskiem Maximize." },
      { name: "toggling Maximize expands the preview to a 75% overlay", intent: "Maximize ustawia fixed/75vw/75vh/z-101 i pokazuje backdrop z z-100." },
      { name: "Close button collapses the preview back to inline", intent: "Przycisk Close zwija modal i usuwa backdrop." },
      { name: "clicking the backdrop dismisses the modal when not running", intent: "Klik w backdrop zamyka modal, gdy żaden test nie jest aktywny." },
    ],
  },
];

const TOTAL_TESTS = E2E_FILES.reduce((n, f) => n + f.tests.length, 0);

export function E2ETestsTab() {
  return (
    <div className="space-y-4" data-testid="e2e-tests-tab">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                End-to-End Tests
              </CardTitle>
              <CardDescription>
                {TOTAL_TESTS} testów Vitest pokrywających live driver, mapowanie scenariuszy i UI modala podglądu.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {E2E_FILES.length} pliki
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Uruchamiane przez <code className="rounded bg-muted px-1 py-0.5">bunx vitest run</code> w pipeline. Pliki znajdziesz w
          <code className="ml-1 rounded bg-muted px-1 py-0.5">src/test/</code>.
        </CardContent>
      </Card>

      {E2E_FILES.map((f) => (
        <Card key={f.file}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileCode2 className="h-4 w-4 text-primary" />
                  {f.file}
                </CardTitle>
                <CardDescription>{f.scope}</CardDescription>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                <code className="text-xs text-muted-foreground">{f.path}</code>
              </div>
              <Badge variant="outline">{f.tests.length} tests</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {f.tests.map((t) => (
                <li
                  key={t.name}
                  className="flex items-start gap-3 rounded-md border bg-card p-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.intent}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export const E2E_TOTAL_TESTS = TOTAL_TESTS;
