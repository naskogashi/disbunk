import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Claims = lazy(() => import("./pages/Claims"));
const ClaimDetail = lazy(() => import("./pages/ClaimDetail"));
const NewClaim = lazy(() => import("./pages/NewClaim"));
const Evidence = lazy(() => import("./pages/Evidence"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const Teams = lazy(() => import("./pages/Teams"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const Docs = lazy(() => import("./pages/Docs"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Templates = lazy(() => import("./pages/Templates"));
const Alerts = lazy(() => import("./pages/Alerts"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="p-8 text-sm" role="status">Loading Disbunk…</div>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/claims/new" element={<NewClaim />} />
              <Route path="/claims/:id" element={<ClaimDetail />} />
              <Route path="/evidence" element={<Evidence />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/sbunker" element={<Navigate to="/dashboard" replace />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/alerts" element={<Alerts />} />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
