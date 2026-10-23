import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicPage from "./pages/PublicPage";
import NotFound from "./pages/NotFound";
import { PublicLocale } from "./components/PublicLocale";
import { publicRoutes } from "./lib/public-site";
import { APP_PATHS } from "./lib/page-metadata";
import Landing from "./pages/Landing";
import { PageLoading } from "./components/PageLoading";
import { RouteMetadata } from "./components/RouteMetadata";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

// The homepage has no dependency on Supabase, auth initialization or admin UI.
const Workspace = lazy(() => import("./App"));
function WorkspaceEntry() {
  const { t } = useTranslation();
  const path=useLocation().pathname.replace(/\/+$/, "") || "/";
  if(!APP_PATHS.includes(path) && path!=="/sbunker" && !/^\/claims\/[^/]+$/.test(path)) return <NotFound/>;
  if (!import.meta.env.VITE_SUPABASE_URL?.trim() || !import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()) {
    return <main className="min-h-screen space-y-4 bg-background p-8 text-foreground"><h1 className="text-2xl font-bold">{t("setup.title")}</h1><p>{t("setup.description")}</p><p>{t("setup.restart")}</p></main>;
  }
  return <Suspense fallback={<PageLoading/>}><Workspace/></Suspense>;
}
export default function RootApp() {
  return <BrowserRouter><PublicLocale/><RouteMetadata/><RouteErrorBoundary><Routes>
    {Object.entries(publicRoutes).flatMap(([id,paths])=>Object.values(paths).map(path=><Route key={path} path={path} element={id==="home" ? <Landing/> : <PublicPage/>}/>))}
    <Route path="*" element={<WorkspaceEntry/>}/>
  </Routes></RouteErrorBoundary></BrowserRouter>;
}
