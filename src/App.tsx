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
import PlaygroundAll from "./pages/playground/AllChallenges";
import AILabLayout from "./pages/ai/AILabLayout";
import AIOverview from "./pages/ai/Overview";
import AIObservability from "./pages/ai/Observability";
import AIComingSoon from "./pages/ai/ComingSoon";
import AITestGenerator from "./pages/ai/TestGenerator";
import AISelfHealing from "./pages/ai/SelfHealing";
import AIBugTriage from "./pages/ai/BugTriage";
import AIVisualDiff from "./pages/ai/VisualDiff";
import AIAgentCrew from "./pages/ai/AgentCrew";
import AIRag from "./pages/ai/RagPage";
import AIEvals from "./pages/ai/EvalsPage";
import AIGuardrails from "./pages/ai/GuardrailsPage";
import AIPromptPlayground from "./pages/ai/PromptPlayground";
import AICostTracker from "./pages/ai/CostTracker";
import AISyntheticData from "./pages/ai/SyntheticData";
import AIWorkflowBuilder from "./pages/ai/WorkflowBuilder";
import ComplianceLayout from "./pages/compliance/ComplianceLayout";
import QualityLayout from "./pages/quality/QualityLayout";
import QualityOverview from "./pages/quality/Overview";
import QualityDora from "./pages/quality/Dora";
import QualityPyramid from "./pages/quality/Pyramid";
import QualityFlaky from "./pages/quality/Flaky";
import QualityCoverage from "./pages/quality/Coverage";
import ComplianceOverview from "./pages/compliance/Overview";
import AuditTrail from "./pages/compliance/AuditTrail";
import ESignatures from "./pages/compliance/ESignatures";
import DataIntegrity from "./pages/compliance/DataIntegrity";
import Validation from "./pages/compliance/Validation";
import SecurityLayout from "./pages/security/SecurityLayout";
import SecurityOverview from "./pages/security/Overview";
import SecurityMfa from "./pages/security/Mfa";
import SecuritySso from "./pages/security/Sso";
import SecuritySessions from "./pages/security/Sessions";
import ChaosLayout from "./pages/chaos/ChaosLayout";
import ChaosOverview from "./pages/chaos/Overview";
import ChaosExperiments from "./pages/chaos/Experiments";
import ChaosPerfLab from "./pages/chaos/PerfLab";
import ChaosSlos from "./pages/chaos/Slos";
import PlaywrightStarter from "./pages/PlaywrightStarter";
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
                <Route path="all" element={<PlaygroundAll />} />
              </Route>
              <Route path="/ai" element={<AILabLayout />}>
                <Route index element={<AIOverview />} />
                <Route path="observability" element={<AIObservability />} />
                <Route path="test-generator" element={<AITestGenerator />} />
                <Route path="self-healing" element={<AISelfHealing />} />
                <Route path="bug-triage" element={<AIBugTriage />} />
                <Route path="visual-diff" element={<AIVisualDiff />} />
                <Route path="agents" element={<AIAgentCrew />} />
                <Route path="rag" element={<AIRag />} />
                <Route path="evals" element={<AIEvals />} />
                <Route path="guardrails" element={<AIGuardrails />} />
                <Route path="prompt-playground" element={<AIPromptPlayground />} />
                <Route path="cost-tracker" element={<AICostTracker />} />
                <Route path="synthetic-data" element={<AISyntheticData />} />
                <Route path="workflow-builder" element={<AIWorkflowBuilder />} />
              </Route>
              <Route path="/compliance" element={<ComplianceLayout />}>
                <Route index element={<ComplianceOverview />} />
                <Route path="audit-trail" element={<AuditTrail />} />
                <Route path="e-signatures" element={<ESignatures />} />
                <Route path="data-integrity" element={<DataIntegrity />} />
                <Route path="validation" element={<Validation />} />
              </Route>
              <Route path="/quality-metrics" element={<QualityLayout />}>
                <Route index element={<QualityOverview />} />
                <Route path="dora" element={<QualityDora />} />
                <Route path="pyramid" element={<QualityPyramid />} />
                <Route path="flaky" element={<QualityFlaky />} />
                <Route path="coverage" element={<QualityCoverage />} />
              </Route>
              <Route path="/security" element={<SecurityLayout />}>
                <Route index element={<SecurityOverview />} />
                <Route path="mfa" element={<SecurityMfa />} />
                <Route path="sso" element={<SecuritySso />} />
                <Route path="sessions" element={<SecuritySessions />} />
              </Route>
              <Route path="/chaos" element={<ChaosLayout />}>
                <Route index element={<ChaosOverview />} />
                <Route path="experiments" element={<ChaosExperiments />} />
                <Route path="perf" element={<ChaosPerfLab />} />
                <Route path="slo" element={<ChaosSlos />} />
              </Route>
              <Route path="/playwright-starter" element={<PlaywrightStarter />} />
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
