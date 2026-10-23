import { publicRoutes, type PublicLanguage } from "@/lib/public-site";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, ArrowRight, Search, FileCheck2, Users, Quote, Network, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicTechnology } from "@/components/PublicTechnology";
import { PublicHeader } from "@/components/PublicHeader";
import { ProjectFooter } from "@/components/ProjectFooter";

export default function Landing() {
  const { t, i18n } = useTranslation();
  const language:PublicLanguage=i18n.language.startsWith("en") ? "en" : "sq";
  const modules = [
    { icon: Search, title: t("nav.claims"), detail: t("identity.claimsDesc"), path: publicRoutes.claims[language] },
    { icon: FileCheck2, title: t("nav.evidence"), detail: t("identity.evidenceDesc"), path: publicRoutes.evidence[language] },
    { icon: Network, title: t("nav.campaigns"), detail: t("identity.campaignsDesc"), path: publicRoutes.campaigns[language] },
    { icon: Users, title: t("nav.teams"), detail: t("identity.teamsDesc"), path: publicRoutes.teams[language] },
  ];
  const steps = [
    { title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];
  return <div className="min-h-screen">
    <PublicHeader />
    <main id="content">
      <section className="landing-hero border-b border-border">
        <div className="page-wrap grid gap-10 py-12 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-20 lg:py-20">
          <div><p className="eyebrow">{t("identity.kicker")}</p>
            <h1 className="hero-title mt-7 text-[clamp(2.8rem,6.8vw,6.2rem)] leading-[1.02] [overflow-wrap:anywhere]">{t("identity.heroFirst")}<br /><em>{t("identity.heroSecond")}</em></h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">{t("identity.description")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4"><Button asChild size="lg" className="h-12 rounded-lg px-6 font-bold"><Link to="/claims/new">{t("landing.submitClaim")}<ArrowUpRight className="ml-3 h-4 w-4" /></Link></Button><a href="#how-it-works" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-border underline-offset-8 hover:decoration-primary">{t("redesign.seeHow")}<ArrowRight className="h-4 w-4" /></a></div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground"><span>{t("identity.journalists")}</span><span>{t("identity.researchers")}</span><span>{t("identity.civilSociety")}</span></div>
          </div>
          <div className="signal-board relative overflow-hidden rounded-xl p-5 sm:p-8">
            <div className="signal-rule flex items-center justify-between border-b pb-5"><p className="text-xs font-semibold uppercase tracking-[.16em]">{t("identity.traceLabel")}</p><span className="signal-label font-mono text-[10px]">01 — 03</span></div>
            <div className="relative space-y-0">
              {steps.map((step, index) => <div key={step.title} className="signal-rule relative flex gap-4 border-b py-7 last:border-b-0"><span className="signal-accent mt-1 font-mono text-xs">0{index+1}</span><div><p className="text-xl font-semibold">{step.title}</p><p className="signal-label mt-2 text-sm leading-relaxed">{step.desc}</p></div>{index === 2 ? <Check className="signal-accent ml-auto mt-1 h-5 w-5 shrink-0" /> : <ChevronRight className="signal-label ml-auto mt-1 h-5 w-5 shrink-0" />}</div>)}
            </div>
            <div className="signal-rule mt-2 flex items-center gap-3 border-t pt-5"><Quote className="signal-accent h-5 w-5 shrink-0" /><p className="signal-label text-xs leading-relaxed">{t("identity.principle")}</p></div>
          </div>
        </div>
      </section>
      <section id="platform" className="page-wrap py-14 lg:py-20" aria-labelledby="modules-title">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t("identity.workspaceLabel")}</p><h2 id="modules-title" className="mt-3 text-3xl font-extrabold">{t("identity.workspaceTitle")}</h2></div><p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{t("identity.workspaceDesc")}</p></div>
        <div className="grid border-y border-border md:grid-cols-2 lg:grid-cols-4">{modules.map(({ icon: Icon, title, detail, path }, index) => <Link to={path} key={path} className="group border-b border-border px-2 py-7 transition-colors hover:bg-secondary/60 md:px-5 lg:border-b-0 lg:border-r last:border-0"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-primary" /><span className="font-mono text-[10px] text-muted-foreground">0{index+1}</span></div><h3 className="mt-8 flex items-center justify-between gap-2 text-lg font-bold">{title}<ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p></Link>)}</div>
      </section>
      <section id="how-it-works" className="border-y border-border bg-card">
        <div className="page-wrap grid gap-10 py-14 lg:grid-cols-[1fr_1.35fr] lg:gap-24 lg:py-20"><div><p className="eyebrow">{t("redesign.howLabel")}</p><h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">{t("identity.howTitle")}</h2><p className="mt-5 text-muted-foreground">{t("redesign.howDesc")}</p><Link to={publicRoutes.methodology[language]} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary">{language==="en" ? "Read our methodology" : "Lexoni metodologjinë"}<ArrowRight className="h-4 w-4" /></Link></div><ol>{steps.map((step, index) => <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-border py-6 first:pt-0 last:border-0 last:pb-0"><span className="font-mono text-sm text-primary">0{index+1}</span><div><h3 className="text-xl font-bold">{step.title}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{step.desc}</p></div></li>)}</ol></div>
      </section>
      <PublicTechnology />
      <section className="page-wrap py-14 lg:py-16"><div className="flex flex-wrap items-center justify-between gap-6"><div><p className="eyebrow">{t("identity.joinLabel")}</p><h2 className="mt-3 text-3xl font-extrabold">{t("redesign.joinTitle")}</h2></div><Button asChild size="lg" className="h-12 rounded-lg px-6"><Link to="/login">{t("redesign.getStarted")}<ArrowUpRight className="ml-3 h-5 w-5" /></Link></Button></div></section>
    </main>
    <ProjectFooter />
  </div>;
}
