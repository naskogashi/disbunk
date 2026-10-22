import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Outlet } from "react-router-dom";
import { ProjectFooter } from "@/components/ProjectFooter";

export function AppLayout() {
  const { t } = useTranslation();

  return (
    <SidebarProvider>
      <div className="workspace min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main id="content" className="flex-1 p-5 sm:p-8 lg:p-10">
            <Suspense fallback={<p role="status">{t("common.loading")}</p>}><Outlet /></Suspense>
          </main>
          <ProjectFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}
