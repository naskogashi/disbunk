import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";

// Original image assets extracted from the proposal header and footer.
// Keep original colours and proportions, including on the dark theme.
export function ProjectFooter() {
  const { t } = useTranslation();
  return <footer className="mt-auto border-t border-border bg-card">
    <div className="page-wrap py-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><Brand className="text-xl" /><p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{t("common.footer")}</p></div>
      <div aria-label={t("tools.projectPartners")} className="mt-7 flex flex-wrap items-center justify-center gap-x-7 gap-y-5 rounded-xl bg-[hsl(var(--partner-surface))] p-5 sm:justify-between">
        <img src="/partners/ddi.png" alt="Digital Democracy Initiative" className="h-auto max-h-14 w-56 max-w-full object-contain" loading="lazy" />
        <img src="/partners/metamorphosis.png" alt="Metamorphosis Foundation" className="h-auto max-h-16 w-48 max-w-full object-contain" loading="lazy" />
        <img src="/partners/civic-literacy-initiative.png" alt="Civic Literacy Initiative" className="h-auto max-h-20 w-36 max-w-full object-contain" loading="lazy" />
        <img src="/partners/civicus.png" alt="CIVICUS" className="h-auto max-h-20 w-24 max-w-full object-contain" loading="lazy" />
      </div>
      <div className="mt-7 flex flex-col items-center gap-2 border-t border-border pt-6 text-center">
        <a href="https://codon.fi" target="_blank" rel="noopener noreferrer" aria-label="CODON" className="rounded-md p-2">
          <img src="/partners/codon.png" alt="CODON" className="h-9 w-auto max-w-28 object-contain dark:hidden" loading="lazy" />
          <img src="/partners/codon-dark.png" alt="CODON" className="hidden h-9 w-auto max-w-28 object-contain dark:block" loading="lazy" />
        </a>
        <p className="text-xs text-muted-foreground">{t("tools.codonCredit")}</p>
      </div>
    </div>
  </footer>;
}
