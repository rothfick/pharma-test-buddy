import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Wizard from "./pages/Wizard";
import PlaygroundLayout from "./pages/playground/PlaygroundLayout";
import PlaygroundOverview from "./pages/playground/Overview";
import PlaygroundInteractions from "./pages/playground/Interactions";
import PlaygroundAsync from "./pages/playground/Async";
import PlaygroundFiles from "./pages/playground/Files";
import PlaygroundSecurity from "./pages/playground/Security";
import PlaygroundA11y from "./pages/playground/A11y";
import PlaygroundLegacy from "./pages/playground/Legacy";
import AILabLayout from "./pages/ai/AILabLayout";
import AIOverview from "./pages/ai/Overview";
import AIObservability from "./pages/ai/Observability";
import AIComingSoon from "./pages/ai/ComingSoon";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/wizard" element={<Wizard />} />
              <Route path="/playground" element={<PlaygroundLayout />}>
                <Route index element={<PlaygroundOverview />} />
                <Route path="interactions" element={<PlaygroundInteractions />} />
                <Route path="async" element={<PlaygroundAsync />} />
                <Route path="files" element={<PlaygroundFiles />} />
                <Route path="security" element={<PlaygroundSecurity />} />
                <Route path="a11y" element={<PlaygroundA11y />} />
                <Route path="legacy" element={<PlaygroundLegacy />} />
              </Route>
              <Route path="/ai" element={<AILabLayout />}>
                <Route index element={<AIOverview />} />
                <Route path="observability" element={<AIObservability />} />
                <Route path="test-generator" element={<AIComingSoon title="Playwright Test Generator" description="Story / screenshot → gotowy test TS z Page Object." plan={["Form: textarea (story) + upload screenshota","Edge function streamuje Gemini Pro (multimodal) z structured output (tool calling)","Walidacja schematem zod, podgląd kodu z syntax highlight, copy-to-clipboard","Trace w Observability (feature='test-gen')"]} />} />
                <Route path="self-healing" element={<AIComingSoon title="Self-healing Selectors" description="Failujący selektor + DOM snapshot → naprawa + uzasadnienie." plan={["Input: stary selektor + paste DOM (lub URL do live page)","Gateway: gemini-flash z tool calling, structured output {selector, strategy, confidence}","Side-by-side diff starego i nowego selektora","Eval mode: batch 10 przykładów → success rate"]} />} />
                <Route path="bug-triage" element={<AIComingSoon title="Bug Triage" description="Stacktrace / log / HAR → klasyfikacja + root cause." plan={["Upload .log/.har lub paste stacktrace","LLM zwraca strukturę: category, severity, root_cause, suggested_fix, confidence","Fallback chain: gpt-5-mini → gemini-flash → gemini-pro","Historia triage'y w tabeli"]} />} />
                <Route path="visual-diff" element={<AIComingSoon title="Visual Diff (multimodal)" description="Dwa screenshoty → ocena czy zmiana to bug czy intended." plan={["Upload baseline + current image","Gemini Pro multimodal: verdict (bug/intended/needs_review) + opis","Pixel diff jako baseline + LLM jako tiebreaker","Galeria poprzednich porównań"]} />} />
                <Route path="agents" element={<AIComingSoon title="Agent Crew" description="Planner → Explorer → Writer → Critic z tool calling." plan={["Edge function agent-crew: pętla z handoffami między rolami","Tools: navigate, read_dom, query_db (whitelisted), search_docs (RAG)","Realtime: agent_steps streamuje się do UI jako timeline","Cancel mid-run, retry failed step, koszt całkowity per run"]} />} />
                <Route path="rag" element={<AIComingSoon title="RAG nad dokumentacją" description="Upload PDF/MD → embeddings → Q&A z cytowaniami." plan={["Upload dokumentu → chunking (500 tok overlap 50)","Embeddingi → pgvector (już gotowe w schemacie)","Q&A: top-k retrieval + answer z cytowaniami","Guardrail: similarity<0.7 → 'I don't know'"]} />} />
                <Route path="evals" element={<AIComingSoon title="Eval Harness" description="Datasety, metryki, A/B promptów." plan={["Prompt registry UI (CRUD wersji)","Datasets jako JSONL (input + expected)","Run eval: model X prompt vN → score, latency, cost","Side-by-side comparison + wykres trendu"]} />} />
                <Route path="guardrails" element={<AIComingSoon title="Guardrails Playground" description="Prompt injection, PII, schema validation." plan={["Predefiniowane ataki (Ignore previous, DAN, prompt leak)","Pipeline: input scanner → LLM → output scanner","PII redaction (regex + LLM) z podświetleniem zamian","Score: blocked vs passed, false positive rate"]} />} />
              </Route>
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
