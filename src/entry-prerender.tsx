import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "./i18n/en.json";
import Landing from "./pages/Landing";
export async function renderLanding() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
  return renderToString(<I18nextProvider i18n={i18n}><StaticRouter location="/"><Landing /></StaticRouter></I18nextProvider>);
}
