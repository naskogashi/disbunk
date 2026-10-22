import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, Sun, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { useTheme } from "@/hooks/useTheme";

export function PublicHeader() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const lang = i18n.language?.startsWith("sq") ? "sq" : "en";
  return (
    <header className="border-b border-border bg-background">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4">{t("redesign.skip")}</a>
      <div className="page-wrap flex min-h-20 flex-wrap items-center gap-2 py-3 sm:flex-nowrap">
        <Link to="/" aria-label="Disbunk.org"><Brand className="text-xl sm:text-2xl" /></Link>
        <nav aria-label={t("redesign.navigation")} className="ml-auto hidden items-center gap-7 text-sm font-semibold lg:flex">
          <a href="/#how-it-works" className="hover:text-primary">{t("landing.learnHow")}</a>
          <Link to="/claims" className="hover:text-primary">{t("nav.claims")}</Link>
          <a href="https://sbunker.org/category/disinfo/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Sbunker · Disinfo ↗</a>
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-5">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme} aria-label={t(theme === "dark" ? "redesign.lightMode" : "redesign.darkMode")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="font-bold" onClick={() => i18n.changeLanguage(lang === "en" ? "sq" : "en")} aria-label={lang === "en" ? "Switch to Albanian" : "Switch to English"}>{lang === "en" ? "SQ" : "EN"}</Button>
          <Button asChild size="sm" className="rounded-lg px-3 sm:px-5"><Link to="/login" aria-label={t("landing.signIn")}><span className="hidden min-[420px]:inline">{t("landing.signIn")}</span><ArrowUpRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>
      <details className="page-wrap border-t border-border py-2 lg:hidden"><summary className="w-fit cursor-pointer py-1 text-xs font-semibold text-muted-foreground">{t("tools.menu")}</summary><nav className="flex flex-wrap gap-x-6 gap-y-2 py-3 text-sm"><a href="/#how-it-works">{t("landing.learnHow")}</a><Link to="/claims">{t("nav.claims")}</Link><a href="https://sbunker.org/category/disinfo/" target="_blank" rel="noopener noreferrer">Sbunker · Disinfo ↗</a></nav></details>
    </header>
  );
}
