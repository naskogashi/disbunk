import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceCatalog } from "@/components/ServiceCatalog";

export default function Docs() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const sections = [
    { title: "nav.claims", text: "tools.docsClaims", url: "/claims" },
    { title: "nav.evidence", text: "tools.docsEvidence", url: "/evidence" },
    { title: "tools.playbook", text: "tools.docsReview", url: "/claims" },
    { title: "tools.templates", text: "tools.docsTemplates", url: "/templates" },
    { title: "tools.alerts", text: "tools.docsAlerts", url: "/alerts" },
  ];
  return <div className="space-y-7"><div><p className="eyebrow">Disbunk</p><h1 className="mt-2 text-3xl font-extrabold">{t("nav.docs")}</h1><p className="mt-2 text-muted-foreground">{t("tools.docsIntro")}</p></div><div className="grid gap-4 md:grid-cols-2">{sections.map((section,index) => <Card key={section.text}><CardContent className="p-6"><span className="font-mono text-xs text-primary">0{index+1}</span><h2 className="mt-3 text-xl"><Link to={section.url} className="hover:underline">{t(section.title)}</Link></h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(section.text)}</p></CardContent></Card>)}</div>{hasRole("admin") && <p className="rounded-xl border bg-secondary p-5 text-sm text-muted-foreground">{t("tools.researchNote")}</p>}<ServiceCatalog /></div>;
}
