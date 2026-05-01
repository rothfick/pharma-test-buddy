
# Plan: wyniesienie aplikacji na top-tier pro level pod ofertę Senior QA Automation (Pharma)

Aplikacja ma już mocne pokrycie warsztatu QA + AI. Brakuje **twardych elementów z ogłoszenia**: pharma/GxP context, CI/CD telemetry, metryki jakości jako pierwszorzędna funkcjonalność, performance/load testing oraz repo Playwright + pipeline'y. Plan dzieli to na 5 stage'ów, które można realizować po kolei (każdy stage = jedna iteracja).

---

## Stage 1 — Pharma / GxP Compliance Module (krytyczne dla oferty)

Oferta wprost mówi "branża farmaceutyczna" i "systemy krytyczne". To największy brakujący element.

**Nowy moduł `/compliance`** z podstronami:
- **Audit Trail** — niezmienna tabela `audit_log` (każda akcja CRUD na tasks/wizard automatycznie loguje: kto, co, kiedy, stary→nowy stan, hash poprzedniego rekordu = chain integrity). UI: filtrowane przeszukiwanie + eksport CSV/PDF dla audytora.
- **Electronic Signatures (21 CFR Part 11)** — krytyczne akcje (np. zmiana statusu taska na "approved") wymagają re-autentykacji + powodu + drugiej osoby (dual-control). Tabela `e_signatures` z hashem.
- **Data Integrity (ALCOA+)** — dashboard pokazujący: Attributable, Legible, Contemporaneous, Original, Accurate + Complete, Consistent, Enduring, Available. Każda metryka wyliczana z audit_log.
- **Validation Status (IQ/OQ/PQ)** — strona z checklistą walidacji systemu (Installation/Operational/Performance Qualification). Świetny target do testów E2E.
- **GxP Sandbox** — wydzielone środowisko gdzie dane są oznaczone jako "validated" vs "draft".

**Tabele:** `audit_log`, `e_signatures`, `validation_runs` (wszystkie z RLS, audit_log INSERT-only).

---

## Stage 2 — Enterprise SSO (prawdziwe, nie tylko Google)

Oferta: "Doświadczenie w testach SSO". Trzeba pokazać więcej niż Google OAuth.

- **SAML 2.0 mock** — strona `/sso/saml` symulująca IdP corporate (formularz z przekierowaniem, `SAMLResponse` w POST, walidacja podpisu — wszystko mockowane edge functionem `sso-saml`).
- **OIDC flow** — drugi provider obok Google (Azure AD style) przez edge function `sso-oidc`.
- **Multi-tenant** — tabela `organizations` + `organization_members`, użytkownik wybiera tenanta po loginie, RLS po `org_id`.
- **MFA / TOTP** — drugie hasło jednorazowe (otplib w edge function), QR code do dodania w Google Authenticator.
- **Session management** — strona pokazująca aktywne sesje w różnych przeglądarkach + "wyloguj wszystkie".
- **Account lockout** po N nieudanych próbach (już w planie, dokończyć).

---

## Stage 3 — Performance & Load Testing Lab

Oferta: "testy wydajnościowe". Obecnie tylko endpoint z `?delay`.

Nowy moduł `/perf`:
- **Load Generator UI** — formularz: N concurrent users × M iterations → uderza w `qa-api` z parametrami → live wykres latencji (p50/p95/p99) + throughput RPS + error rate.
- **k6 / Artillery scripts** wygenerowane z UI (eksport `.js`/`.yml` do uruchomienia lokalnie).
- **Endpoint scenarios** — różne profile obciążenia: smoke, load, stress, spike, soak (edge function `perf-scenario`).
- **Realtime metryki** podczas testu (Supabase realtime + recharts).
- **Histogram latency** + heatmapa odpowiedzi.
- **API contract testing** — strona pokazująca walidację schema OpenAPI dla każdego endpointu (zod schemas).

Tabela: `perf_runs` (timestamp, scenario, p50/p95/p99, rps, errors, duration).

---

## Stage 4 — Quality Metrics Dashboard (DORA + QA)

Oferta: "praca z metrykami jakości", "continuous improvement". Trzeba mieć dedykowaną stronę poziomu staff/principal QA.

**Nowy moduł `/quality-metrics`**:
- **DORA Four Keys** — Deployment Frequency, Lead Time for Changes, Change Failure Rate, MTTR (mock data + endpoint do wgrania prawdziwych z GitHub Actions).
- **Test Pyramid** — wizualizacja unit/integration/E2E (% i liczby) z analizy plików testowych.
- **Flakiness Rate** — top 10 flaky testów, trend tygodniowy, root cause distribution.
- **Coverage trend** — line/branch/statement coverage w czasie.
- **Test Execution Time** — które suite'y zwalniają, gantt po shardach.
- **Defect Escape Rate** — bugi znalezione w produkcji vs w testach.
- **Endpoint `POST /metrics-ingest`** — przyjmuje JSON z CI/CD i zapisuje do tabel.

Tabele: `dora_metrics`, `test_runs`, `flaky_tests`, `coverage_snapshots`.

---

## Stage 5 — Repo Playwright + CI/CD (deliverable poza Lovable)

To trafia do Twojego lokalnego repo Git (Lovable nie uruchamia Playwrighta), ale wygenerujemy je tutaj jako downloadowalny ZIP w `/mnt/documents/`.

**Zawartość paczki `qa-playground-tests.zip`:**
- `playwright.config.ts` — projekty: chromium/firefox/webkit, mobile, sharded parallel, retries, HTML+JUnit+JSON reporters.
- `tests/` — pokrycie każdego modułu aplikacji (auth, SSO, SAML, MFA, tasks CRUD, wizard, API, RAG, workflow builder, compliance audit trail, e-signature, perf smoke).
- `pages/` — Page Object Model z `data-testid` selektorami.
- `fixtures/` — auth state, seed data, multi-tenant context, API client.
- **AI features:**
  - `tests/ai/test-generator.ts` — przykład użycia `@playwright/experimental-ct` + LLM do generacji testów ze specyfikacji.
  - `tests/ai/self-healing.ts` — fallback selectors + LLM rescue gdy selector zawiedzie.
  - `tests/ai/visual-regression.ts` — porównanie screenshotów + LLM diff explainer.
- `.github/workflows/playwright.yml` — matrix sharding 4×, artefakty (HTML report + traces + videos), komentarz na PR z wynikami, deploy reportu na GitHub Pages.
- `azure-pipelines.yml` — alternatywa Azure DevOps, publishTestResults task, JUnit.
- `gitlab-ci.yml` — bonus dla pełnego kompletu.
- `scripts/metrics-export.ts` — po każdym runie wysyła JSON do `/metrics-ingest` w aplikacji → dashboard ożywa danymi.
- `README.md` po polsku z instrukcją uruchomienia + opisem strategii testów.

---

## Sekcja techniczna

**Database (Stage 1-4):** ~10 nowych tabel, wszystkie z RLS (`has_role` + ownership), audit_log INSERT-only przez policy, e_signatures z immutability triggerem (UPDATE/DELETE blocked).

**Edge functions (nowe):** `audit-logger`, `e-sign`, `sso-saml`, `sso-oidc`, `mfa-verify`, `perf-scenario`, `metrics-ingest`. Wszystkie z walidacją zod, CORS, rate limiting.

**Realtime:** kanały dla `perf_runs` (live load test), `audit_log` (live audit feed).

**Routing:** rozbudowa `App.tsx` o `/compliance/*`, `/sso/*`, `/perf`, `/quality-metrics`. Nawigacja w `AppLayout` dostaje nowe sekcje grupowane (QA Core / AI Lab / Compliance / Performance / Metrics).

**Bezpieczeństwo:** e-signature wymaga re-auth tokenu z krótkim TTL; SAML mock jasno oznaczony jako "demo IdP"; MFA secrets w `vault` (lub szyfrowane kolumny).

---

## Diagram nawigacji docelowej

```text
/                    Dashboard
/tasks               CRUD + bulk + realtime
/wizard              Multi-step form
/playground/*        Trudne komponenty (iframe, shadow DOM, infinite scroll, a11y...)
/ai/*                AI Lab (14 features — gotowe)
/compliance/         GxP Hub  ← STAGE 1
  ├ audit-trail
  ├ e-signatures
  ├ data-integrity
  └ validation
/sso/                Enterprise Auth  ← STAGE 2
  ├ saml
  ├ oidc
  ├ mfa
  └ sessions
/perf                Load Testing Lab  ← STAGE 3
/quality-metrics     DORA + QA Dashboard  ← STAGE 4
/profile
```

---

## Kolejność wykonania i czas

| Stage | Co | Iteracji | Najwyższy ROI dla rekrutera |
|---|---|---|---|
| 1 | Pharma/GxP Compliance | 1-2 | ⭐⭐⭐⭐⭐ (dosłownie z ogłoszenia) |
| 2 | Enterprise SSO | 1-2 | ⭐⭐⭐⭐⭐ ("testy SSO") |
| 3 | Performance Lab | 1 | ⭐⭐⭐⭐ ("testy wydajnościowe") |
| 4 | Quality Metrics DORA | 1 | ⭐⭐⭐⭐⭐ ("metryki jakości") |
| 5 | Repo Playwright + CI/CD ZIP | 1 | ⭐⭐⭐⭐⭐ (główny deliverable warsztatu) |

**Rekomendacja:** zaczynamy od **Stage 1 (Pharma/GxP)** — to najbardziej unikalny element pod tę konkretną ofertę i nikt inny tego nie ma na portfolio. Potem Stage 4 (metryki) jako warstwa "pokazowa", bo wizualnie najbardziej imponuje na rozmowie. Stage 5 (repo) na końcu, gdy aplikacja ma już wszystkie targety do testowania.

Po akceptacji startuję od **Stage 1**. Czy zaczynamy zgodnie z kolejnością 1→2→3→4→5, czy chcesz inną?
