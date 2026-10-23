import { LanguageSelect } from "@/components/LanguageSelect";
import { PrivateAvatar } from "@/components/ProfilePictures";
import { useProfilePicture } from "@/hooks/useProfilePicture";
import { Sun, Moon, LogOut, Bell, ChevronRight, UserCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "react-router-dom";
import { workspacePage } from "@/lib/workspace-navigation";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { open, openMobile, isMobile } = useSidebar();
  const picture=useProfilePicture(user?.id);
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const page = workspacePage(pathname);
  return <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 backdrop-blur sm:px-6">
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <SidebarTrigger className="!size-11 shrink-0 rounded-xl" aria-expanded={isMobile ? openMobile : open} aria-label={t(isMobile ? "navigation.openMenu" : "navigation.toggleMenu")}/>
      <nav aria-label={t("navigation.currentLocation")} className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden shrink-0 text-muted-foreground lg:inline">{t(page.section)}</span>
        <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground lg:block"/>
        <span aria-current="page" className="truncate font-semibold">{t(page.title)}</span>
      </nav>
    </div>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <Button asChild variant="ghost" size="icon" className="size-11 rounded-xl"><Link to="/alerts" aria-label={t("tools.alerts")}><Bell className="size-[18px]"/></Link></Button>
      <LanguageSelect/>
      <DropdownMenu><DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 rounded-full" aria-label={t("redesign.account")}>
          <PrivateAvatar path={picture.data?.avatar_path} fallbackUrl={picture.data?.avatar_url||user?.user_metadata?.avatar_url} name={user?.user_metadata?.full_name||user?.email||"User"} className="size-8"/>
        </Button>
      </DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64 rounded-xl p-2">
        <div className="px-2 py-2"><p className="truncate text-sm font-semibold">{user?.user_metadata?.full_name || user?.email}</p>{user?.user_metadata?.full_name && <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>}</div>
        <DropdownMenuSeparator/>
        <DropdownMenuItem asChild className="min-h-11 gap-2 rounded-lg"><Link to="/profile"><UserCircle className="size-4"/>{t("nav.profile")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-11 gap-2 rounded-lg"><Link to="/settings"><Settings className="size-4"/>{t("nav.settings")}</Link></DropdownMenuItem>
        <DropdownMenuItem onSelect={toggleTheme} className="min-h-11 gap-2 rounded-lg">{theme === "dark" ? <Sun className="size-4"/> : <Moon className="size-4"/>}{t(theme === "dark" ? "redesign.lightMode" : "redesign.darkMode")}</DropdownMenuItem>
        <DropdownMenuSeparator/>
        <DropdownMenuItem onSelect={()=>void signOut()} className="min-h-11 gap-2 rounded-lg text-destructive"><LogOut className="size-4"/>{t("auth.signOut")}</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>
  </header>;
}
