import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import GlobePage from "./pages/GlobePage";
import SitesPage from "./pages/SitesPage";
import RulesPage from "./pages/RulesPage";

import APIProtectionPage from "./pages/APIProtectionPage";
import AIDetectionPage from "./pages/AIDetectionPage";
import RateLimitingPage from "./pages/RateLimitingPage";
import SettingsPage from "./pages/SettingsPage";
import SetupGuidePage from "./pages/SetupGuidePage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">INITIALIZING DEFLECTRA...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/globe" element={<GlobePage />} />
        <Route path="/sites" element={<SitesPage />} />
        <Route path="/rules" element={<RulesPage />} />
        
        <Route path="/api-protection" element={<APIProtectionPage />} />
        <Route path="/ai-detection" element={<AIDetectionPage />} />
        <Route path="/rate-limiting" element={<RateLimitingPage />} />
        <Route path="/setup-guide" element={<SetupGuidePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </DashboardLayout>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
