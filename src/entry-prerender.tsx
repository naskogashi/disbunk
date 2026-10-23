import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import sq from "./i18n/sq.json";
import Landing from "./pages/Landing";
import { PageLoading } from "./components/PageLoading";
export async function renderLanding() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: "sq", resources: { sq: { translation: sq } }, interpolation: { escapeValue: false } });
  return renderToString(<I18nextProvider i18n={i18n}><StaticRouter location="/"><Landing /></StaticRouter></I18nextProvider>);
}
export async function renderLoading() {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({ lng: "sq", resources: { sq: { translation: sq } } });
  return renderToString(<I18nextProvider i18n={i18n}><PageLoading/></I18nextProvider>);
}
