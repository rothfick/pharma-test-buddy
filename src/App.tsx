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
