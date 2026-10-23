import { useTranslation } from "react-i18next";

export function LanguageSelect() {
  const { t, i18n } = useTranslation();
  return <select aria-label={t("common.interfaceLanguage")} value={i18n.language?.startsWith("en") ? "en" : "sq"}
    onChange={event => void i18n.changeLanguage(event.target.value)}
    className="h-10 max-w-28 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
    <option value="sq">Shqip</option><option value="en">English</option>
  </select>;
}
