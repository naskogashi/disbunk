import { useTranslation } from 'react-i18next';

export function WorkspaceFooter() {
  const { t } = useTranslation();
  return <footer className="mt-auto border-t border-border bg-card px-5 py-5 text-center">
    <a href="https://codon.fi" target="_blank" rel="noopener noreferrer" aria-label="CODON" className="inline-flex rounded-md p-2">
      <img src="/partners/codon.webp" width="252" height="74" alt="CODON" className="h-9 w-auto max-w-28 object-contain dark:hidden" loading="lazy" decoding="async"/>
      <img src="/partners/codon-dark.webp" width="252" height="74" alt="CODON" className="hidden h-9 w-auto max-w-28 object-contain dark:block" loading="lazy" decoding="async"/>
    </a>
    <p className="mt-2 text-xs text-muted-foreground">{t('tools.codonCredit')}</p>
  </footer>;
}
