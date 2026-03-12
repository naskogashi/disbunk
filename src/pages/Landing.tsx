import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Search, Users, CheckCircle } from "lucide-react";

export default function Landing() {
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language?.startsWith("sq") ? "sq" : "en";
  const toggleLang = () => i18n.changeLanguage(currentLang === "en" ? "sq" : "en");

  const steps = [
    { icon: Search, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { icon: Users, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { icon: CheckCircle, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground">Disbunk.org</span>
            <span className="hidden sm:inline text-xs text-muted-foreground ml-2 tracking-wide">
              {t("landing.tagline")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs font-mono" onClick={toggleLang}>
            {currentLang === "en" ? "EN → SQ" : "SQ → EN"}
          </Button>
          <Link to="/login">
            <Button size="sm">{t("landing.signIn")}</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
            {t("landing.badge")}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
            {t("landing.heroTitle")}{" "}
            <span className="text-primary">{t("landing.heroHighlight")}</span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            {t("landing.heroDesc")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/dashboard">
              <Button size="lg" className="gap-2 px-6">
                {t("landing.submitClaim")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="px-6">
                {t("landing.learnHow")}
              </Button>
            </a>
          </div>
        </div>

        <div id="how-it-works" className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
          {steps.map((step, i) => (
            <div key={i} className="text-center space-y-3 p-6 rounded-xl border border-border bg-card">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-6">
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-4xl mx-auto text-center">
          {t("common.footer")}
        </p>
      </footer>
    </div>
  );
}
