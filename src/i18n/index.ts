import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en.json";
import sq from "./sq.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sq: { translation: sq },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "sq"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "disbunk_language",
    },
  });

const updateDocumentLanguage = (language: string) => {
  if (typeof document !== "undefined") document.documentElement.lang = language.startsWith("sq") ? "sq" : "en";
};
updateDocumentLanguage(i18n.language ?? "en");
i18n.on("languageChanged", updateDocumentLanguage);

export default i18n;
