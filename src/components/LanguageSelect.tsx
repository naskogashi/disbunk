import { useTranslation } from "react-i18next";
export function LanguageSelect() {
  const {t,i18n}=useTranslation();
  const active=i18n.language?.startsWith("en") ? "en" : "sq";
  return <div role="group" aria-label={t("common.interfaceLanguage")} className="language-switch">
    {(["sq","en"] as const).map(language=><button key={language} type="button" lang={language} aria-pressed={active===language} className="language-choice" onClick={()=>void i18n.changeLanguage(language)}>{language==="sq"?"Shqip":"English"}</button>)}
  </div>;
}
