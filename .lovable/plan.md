
# QA Playground - aplikacja testowa pod ofertę Senior QA Automation Engineer

Zbudujemy aplikację webową, która świadomie zawiera **wszystkie elementy z opisu stanowiska**, dzięki czemu możesz na niej zaprezentować pełen warsztat: framework Playwright + TS, testy SSO, funkcjonalne, wydajnościowe, API, CI/CD i metryki jakości.

Aplikacja będzie mieć motyw lekko "enterprise" (panel zarządzania zadaniami / ticketami z rolami) - wystarczająco generyczny, żeby pasował do wielu ofert, ale wystarczająco złożony, żeby było co testować.

## Co będzie w aplikacji (Target Under Test)

### 1. Moduł autentykacji (pod testy SSO)
- Logowanie email + hasło
- Logowanie Google (OAuth) - imitacja SSO korporacyjnego
- Role użytkowników: `admin`, `manager`, `user` (osobna tabela `user_roles`)
- Reset hasła, walidacja siły hasła, blokada po N nieudanych próbach
- Strona profilu z możliwością wylogowania ze wszystkich sesji
- Atrybuty `data-testid` na każdym istotnym elemencie - ułatwia stabilne selektory

### 2. Złożone formularze i workflow
- Wieloetapowy wizard (4 kroki): dane podstawowe → szczegóły → załączniki → podsumowanie
- Walidacje synchroniczne (zod) i asynchroniczne (sprawdzanie unikalności w DB)
- Dynamiczne pola (dodawanie/usuwanie wierszy)
- Drag & drop, date picker, multi-select, file upload
- Auto-save draftu co X sekund
- Toast notifications i modal dialogs (do testów warunków wyścigu)

### 3. Tabela danych z operacjami CRUD
- Lista zadań/ticketów z paginacją serwerową, sortowaniem, filtrami i wyszukiwaniem
- Bulk actions (zaznacz wiele → zmień status / usuń)
- Inline editing
- Eksport do CSV
- Realtime updates (zmiana w jednej karcie pojawia się w drugiej) - świetny test asynchroniczności

### 4. API + edge functions (do testów API i wydajnościowych)
- Endpoint REST: `/api/tasks` (GET/POST/PUT/DELETE) z autoryzacją JWT
- Endpoint z celowym opóźnieniem (`?delay=2000`) - do testów timeoutów
- Endpoint zwracający różne kody błędów na żądanie (`?fail=500`) - do testów retry/error handling
- Endpoint z paginacją kursorową dla testów wydajnościowych

### 5. Dashboard metryk (motyw "Quality Metrics")
- Wykresy (recharts): liczba ticketów wg statusu, czas rozwiązania, throughput
- Filtry zakresu dat
- KPI cards
- Świetny target dla testów wizualnych (screenshot comparison)

### 6. Strony "trudne do przetestowania" (celowo)
- Iframe z osadzonym formularzem
- Shadow DOM component
- Strona z infinite scroll
- Strona z animacjami i opóźnionym renderem
- Niestabilny komponent (czasem wolniej się ładuje) - do ćwiczenia self-healing

## Co dostarczymy w tym kroku (sama aplikacja)

W tym planie skupiamy się na **zbudowaniu aplikacji** w Lovable. Framework testów Playwright, pipeline CI/CD i dashboard wyników testów to osobny krok - utworzysz je w lokalnym repo Git poza Lovable (Lovable nie uruchamia Playwrighta na żywo).

Po zbudowaniu aplikacji dam Ci:
- **Strukturę repo testowego** (`tests/`, `playwright.config.ts`, page objects, fixtures)
- **Przykładowe testy** dla każdego modułu (login, SSO, formularz wieloetapowy, API, wizualne)
- **Konfigurację GitHub Actions** (`.github/workflows/playwright.yml`) - uruchamianie na PR, raporty HTML, artefakty
- **Konfigurację Azure DevOps** (`azure-pipelines.yml`) - alternatywny pipeline
- **Instrukcję użycia Playwright AI features**: generowanie testów (codegen + LLM), self-healing przez fallback selektorów, integracja z GPT do analizy failów
- **Skrypt liczący metryki jakości** (flakiness rate, czas wykonania, coverage) → JSON dla dashboardu w aplikacji

## Stack techniczny

- **Frontend**: React + TypeScript + Tailwind + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) - auth, baza, edge functions, storage
- **Auth**: email/password + Google OAuth (jako proxy SSO) + role w osobnej tabeli `user_roles`
- **API**: edge functions z celowymi "haczykami" (delay, error injection)
- **Testowalne hooki**: `data-testid` na wszystkich kluczowych elementach, stabilne URL-e, deterministyczny seed danych

## Dlaczego ta aplikacja pokrywa wymagania z oferty

| Wymaganie | Pokrycie |
|---|---|
| Playwright + AI (generowanie, self-healing) | Wiele różnych komponentów + niestabilne strony do ćwiczenia self-healing |
| Testy funkcjonalne | Wizard, CRUD, formularze |
| Testy wydajnościowe | Endpointy z opóźnieniem, paginacja, infinite scroll |
| Testy SSO | Google OAuth + role + sesje |
| CI/CD GitHub / Azure DevOps | Dwa gotowe pipeline'y w repo testowym |
| Praca z metrykami jakości | Wbudowany dashboard metryk + skrypt eksportu wyników testów |
| Środowiska chmurowe | Aplikacja działa na Lovable Cloud (Supabase) |

## Plan budowy w krokach

1. **Setup + Auth**: Lovable Cloud, tabela `user_roles`, logowanie email + Google, strony login/signup/profile
2. **CRUD Tasks + tabela**: model danych, lista z filtrami/paginacją, inline edit, bulk actions, realtime
3. **Wizard formularza**: 4 kroki, walidacje zod, auto-save, file upload do storage
4. **Edge functions API**: endpointy z parametrami `delay`/`fail`, JWT auth, paginacja kursorowa
5. **Dashboard metryk**: wykresy recharts, KPI, filtry dat
6. **Strony "trudne"**: iframe, shadow DOM, infinite scroll, animacje
7. **Polish + data-testid + seed danych**: deterministyczne fixture'y do testów

Po akceptacji zaczynam od kroku 1. Po zbudowaniu aplikacji przejdziemy do repo Playwrighta + CI/CD.
