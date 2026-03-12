import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Claims from "./pages/Claims";
import Evidence from "./pages/Evidence";
import Campaigns from "./pages/Campaigns";
import SbunkerFeed from "./pages/SbunkerFeed";
import Teams from "./pages/Teams";
import Analytics from "./pages/Analytics";
import Docs from "./pages/Docs";
import SettingsPage from "./pages/SettingsPage";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/evidence" element={<Evidence />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/sbunker" element={<SbunkerFeed />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRoles={["admin"]}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
