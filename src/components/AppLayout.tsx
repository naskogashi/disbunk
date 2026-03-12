import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
          <footer className="border-t border-border px-6 py-4">
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-4xl">
              This web page is produced as part of the Hackathon activity under the CIVICUS Digital Democracy Initiative (DDI), implemented by Metamorphosis Foundation in partnership with Civic Literacy Initiative.
            </p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
