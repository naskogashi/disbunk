import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import sq from "./i18n/sq.json";
import en from "./i18n/en.json";
import Landing from "./pages/Landing";
import PublicPage from "./pages/PublicPage";
import NotFound from "./pages/NotFound";
import { PageLoading } from "./components/PageLoading";
import { publicRoute, languageOf } from "./lib/public-site";
export async function renderPage(path: string, loading=false) {
  const route=publicRoute(path);
  const i18n=createInstance();
  await i18n.use(initReactI18next).init({lng:languageOf(path),resources:{sq:{translation:sq},en:{translation:en}},interpolation:{escapeValue:false}});
  return renderToString(<I18nextProvider i18n={i18n}><StaticRouter location={path}>{loading ? <PageLoading/> : route?.id==="home" ? <Landing/> : route ? <PublicPage/> : <NotFound/>}</StaticRouter></I18nextProvider>);
}
