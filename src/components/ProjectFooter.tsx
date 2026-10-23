import { PublicLanguageLinks } from "@/components/PublicLanguageLinks";
import { publicRoutes, CONTENT_UPDATED } from "@/lib/public-site";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";

// Optimized copies of the original project partner assets.
// Keep original colours and proportions, including on the dark theme.
export function ProjectFooter() {
  const { t, i18n } = useTranslation();
  const language=i18n.language.startsWith("en") ? "en" : "sq";
  const labels=language==="en" ? ["About","Methodology","FAQ","Contact","Privacy","Terms"] : ["Rreth nesh","Metodologjia","Pyetje të shpeshta","Kontakt","Privatësia","Kushtet"];
  return <footer className="mt-auto border-t border-border bg-card">
    <div className="page-wrap py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><Brand className="text-xl" /><p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{t("common.footer")}</p></div>
      <div className="mt-6"><PublicLanguageLinks/></div>
      <nav aria-label={language==="en" ? "Project information" : "Informacion për projektin"} className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-4 text-sm">{(["about","methodology","faq","contact","privacy","terms"] as const).map((id,index)=><a key={id} href={publicRoutes[id][language]} className="inline-flex min-h-11 items-center font-semibold hover:text-primary">{labels[index]}</a>)}</nav>
      <p className="mt-4 text-xs text-muted-foreground">{language==="en" ? "Public information updated" : "Informacioni publik u përditësua më"}: <time dateTime={CONTENT_UPDATED}>{CONTENT_UPDATED}</time></p>
      <h2 className="mt-7 text-sm font-semibold">{t("tools.projectPartners")}</h2>
      <div aria-label={t("tools.projectPartners")} className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-5 rounded-xl bg-[hsl(var(--partner-surface))] p-5 sm:justify-between">
        <img src="/partners/ddi.webp" width="560" height="113" decoding="async" alt="Digital Democracy Initiative" className="h-auto max-h-14 w-56 max-w-full object-contain" loading="lazy" />
        <img src="/partners/metamorphosis.webp" width="560" height="175" decoding="async" alt="Metamorphosis Foundation" className="h-auto max-h-16 w-48 max-w-full object-contain" loading="lazy" />
        <img src="/partners/civic-literacy-initiative.webp" width="560" height="294" decoding="async" alt="Civic Literacy Initiative" className="h-auto max-h-20 w-36 max-w-full object-contain" loading="lazy" />
        <img src="/partners/civicus.webp" width="353" height="320" decoding="async" alt="CIVICUS" className="h-auto max-h-20 w-24 max-w-full object-contain" loading="lazy" />
        <a href="https://sbunker.org" target="_blank" rel="noopener noreferrer" aria-label={t("common.externalSbunker")} className="rounded-md p-2 transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <img src="/partners/sbunker.webp" alt="Sbunker" width="200" height="258" className="h-20 w-auto object-contain" loading="lazy" decoding="async" />
        </a>
      </div>
      <div className="mt-7 flex flex-col items-center gap-2 border-t border-border pt-6 text-center">
        <a href="https://codon.fi" target="_blank" rel="noopener noreferrer" aria-label="CODON" className="rounded-md p-2">
          <img src="/partners/codon.webp" width="252" height="74" decoding="async" alt="CODON" className="h-9 w-auto max-w-28 object-contain dark:hidden" loading="lazy" />
          <img src="/partners/codon-dark.webp" width="252" height="74" decoding="async" alt="CODON" className="hidden h-9 w-auto max-w-28 object-contain dark:block" loading="lazy" />
        </a>
        <p className="text-xs text-muted-foreground">{t("tools.codonCredit")}</p>
      </div>
    </div>
  </footer>;
}
