import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import GlobePage from "./pages/GlobePage";
import SitesPage from "./pages/SitesPage";
import RulesPage from "./pages/RulesPage";
import ThreatsPage from "./pages/ThreatsPage";
import APIProtectionPage from "./pages/APIProtectionPage";
import AIDetectionPage from "./pages/AIDetectionPage";
import RateLimitingPage from "./pages/RateLimitingPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/globe" element={<GlobePage />} />
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/threats" element={<ThreatsPage />} />
            <Route path="/api-protection" element={<APIProtectionPage />} />
            <Route path="/ai-detection" element={<AIDetectionPage />} />
            <Route path="/rate-limiting" element={<RateLimitingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
