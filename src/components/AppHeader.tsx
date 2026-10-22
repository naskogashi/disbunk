import { PrivateAvatar } from "@/components/ProfilePictures";
import { useProfilePicture } from "@/hooks/useProfilePicture";
import { Sun, Moon, LogOut, ArrowUpRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const picture=useProfilePicture(user?.id);
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  const currentLang = i18n.language?.startsWith("sq") ? "sq" : "en";
  const toggleLang = () => {
    const next = currentLang === "en" ? "sq" : "en";
    i18n.changeLanguage(next);
  };

  const initials = (user?.user_metadata?.full_name || user?.email || "U")
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border bg-card/95 px-5 backdrop-blur sm:px-8">
      <SidebarTrigger className="-ml-1" />

      <div className="hidden sm:block">
        <p className="text-sm font-bold">{t("redesign.workspace")}</p>
        <p className="text-xs text-muted-foreground">{t("redesign.workspaceDesc")}</p>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon"><Link to="/alerts" aria-label={t("tools.alerts")}><Bell className="h-4 w-4" /></Link></Button>
        <Button asChild size="sm" className="mr-2 hidden rounded-full px-4 md:inline-flex"><Link to="/claims/new">{t("dashboard.newClaim")}<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-10 px-3 text-xs font-bold text-muted-foreground hover:text-primary"
          onClick={toggleLang}
          title="Language"
        >
          {currentLang === "en" ? "EN → SQ" : "SQ → EN"}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleTheme}
          aria-label={t(theme === "dark" ? "redesign.lightMode" : "redesign.darkMode")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-primary" />
          ) : (
            <Moon className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label={t("redesign.account")}>
              <PrivateAvatar path={picture.data?.avatar_path} fallbackUrl={picture.data?.avatar_url||user?.user_metadata?.avatar_url} name={user?.user_metadata?.full_name||user?.email||"User"} className="h-7 w-7"/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              {user?.user_metadata?.full_name && (
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>{t("common.settings")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
