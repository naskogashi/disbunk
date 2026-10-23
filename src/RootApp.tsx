import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Landing from "./pages/Landing";
import { PageLoading } from "./components/PageLoading";
import { RouteMetadata } from "./components/RouteMetadata";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

// The homepage has no dependency on Supabase, auth initialization or admin UI.
const Workspace = lazy(() => import("./App"));
function WorkspaceEntry() {
  const { t } = useTranslation();
  if (!import.meta.env.VITE_SUPABASE_URL?.trim() || !import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    return <main className="min-h-screen space-y-4 bg-background p-8 text-foreground"><h1 className="text-2xl font-bold">{t("setup.title")}</h1><p>{t("setup.description")}</p><p>{t("setup.restart")}</p></main>;
  }
  return <Suspense fallback={<PageLoading/>}><Workspace/></Suspense>;
}
export default function RootApp() {
  return <BrowserRouter><RouteMetadata/><RouteErrorBoundary><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="*" element={<WorkspaceEntry/>}/>
  </Routes></RouteErrorBoundary></BrowserRouter>;
}
