import { publicRoute, publicRoutes, CONTENT_UPDATED, languageOf } from "./public-site";
import { publicCopy } from "@/content/public-pages";
export const SITE_URL = "https://disbunk.org";
const pageKeys: Record<string, string> = {
  "/forgot-password": "accountTools.forgotPassword", "/reset-password": "accountTools.resetPassword",
  "/login": "landing.signIn", "/dashboard": "nav.dashboard", "/claims": "nav.claims",
  "/claims/new": "claims.newClaim", "/evidence": "nav.evidence", "/campaigns": "nav.campaigns",
  "/teams": "nav.teams", "/analytics": "nav.analytics", "/docs": "nav.docs",
  "/profile": "nav.profile", "/settings": "nav.settings", "/admin": "nav.admin",
  "/templates": "tools.templates", "/alerts": "tools.alerts",
};
export const APP_PATHS = Object.keys(pageKeys);
export function pageMetadata(pathname: string, translate: (key: string) => string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const key = pageKeys[path] || (/^\/claims\/[^/]+$/.test(path) ? "nav.claims" : undefined);
  const route=publicRoute(pathname);
  const home = route?.id === "home";
  const copy=route && route.id!=="home" ? publicCopy[route.language][route.id] : undefined;
  return {
    title: copy ? `${copy.title} | Disbunk` : home ? translate("seo.homeTitle") : `${key ? translate(key) : translate("seo.notFound")} | Disbunk.org`,
    description: copy?.description ?? translate(home ? "seo.homeDescription" : key === "landing.signIn" ? "seo.loginDescription" : "seo.workspaceDescription"),
    canonical: `${SITE_URL}${route?.path ?? path}`,
    robots: route ? "index, follow, max-image-preview:large" : "noindex, follow",
    home,
    publicPage: !!route,
    language: route?.language ?? languageOf(pathname),
    alternates: route ? {sq: SITE_URL+publicRoutes[route.id].sq,en: SITE_URL+publicRoutes[route.id].en,"x-default": SITE_URL+publicRoutes[route.id].sq} : undefined,
  };
}

export function structuredData(pathname: string, title: string, description: string) {
  const route=publicRoute(pathname);
  if(!route) return undefined;
  const org={"@type":"Organization","@id":`${SITE_URL}/#org`,name:"Disbunk",alternateName:"Disbunk.org",url:`${SITE_URL}/`,logo:`${SITE_URL}/favicon.svg`,description:publicCopy[route.language].about.sections[0].body.split(". ")[0]+".",sameAs:["https://github.com/naskogashi/disbunk"]};
  const website={"@type":"WebSite","@id":`${SITE_URL}/#website`,name:"Disbunk",url:`${SITE_URL}/`,inLanguage:["sq","en"],publisher:{"@id":org["@id"]}};
  const page={"@type":route.id==="about" ? "AboutPage" : route.id==="contact" ? "ContactPage" : route.id==="faq" ? "FAQPage" : "WebPage","@id":SITE_URL+route.path,url:SITE_URL+route.path,name:title,description,inLanguage:route.language,dateModified:CONTENT_UPDATED,isPartOf:{"@id":website["@id"]},...(route.id==="faq" ? {mainEntity:publicCopy[route.language].faq.sections.map(section=>({"@type":"Question",name:section.title,acceptedAnswer:{"@type":"Answer",text:section.body}}))} : {})};
  const graph:object[]=[org,website,page];
  if(route.id==="home") graph.push({"@type":"SoftwareApplication",name:"Disbunk",applicationCategory:"BusinessApplication",operatingSystem:"Web",inLanguage:route.language,url:SITE_URL+route.path,description,publisher:{"@id":org["@id"]}});
  else graph.push({"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Disbunk",item:SITE_URL+publicRoutes.home[route.language]},{"@type":"ListItem",position:2,name:title,item:SITE_URL+route.path}]});
  return {"@context":"https://schema.org","@graph":graph};
}
