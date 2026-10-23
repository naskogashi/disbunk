import { useTranslation } from "react-i18next";

export function PageLoading() {
  const { t } = useTranslation();
  return <div className="min-h-screen bg-background px-6 py-10" role="status" aria-label={t("common.loading")}>
    <span className="sr-only">{t("common.loading")}</span>
    <div className="mx-auto max-w-6xl space-y-8" aria-hidden="true">
      <div className="h-8 w-36 rounded-lg bg-muted motion-safe:animate-pulse"/>
      <div className="h-px bg-border"/>
      <div className="h-12 w-2/3 max-w-md rounded-lg bg-muted motion-safe:animate-pulse"/>
      <div className="grid gap-5 sm:grid-cols-3">{[0,1,2].map(index => <div key={index} className="h-36 rounded-xl border bg-card motion-safe:animate-pulse"/>)}</div>
    </div>
  </div>;
}
