import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { pageMetadata, structuredData } from "@/lib/page-metadata";

function setMeta(selector: string, attribute: string, key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) { element = document.createElement("meta"); element.setAttribute(attribute, key); document.head.append(element); }
  element.content = content;
}
export function RouteMetadata() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  useEffect(() => {
    const meta = pageMetadata(pathname, t);
    document.title = meta.title;
    setMeta('meta[name="description"]', "name", "description", meta.description);
    setMeta('meta[name="robots"]', "name", "robots", meta.robots);
    for (const [key, content] of Object.entries({title:meta.title,description:meta.description,url:meta.canonical,locale:i18n.language.startsWith("sq") ? "sq_AL" : "en_US"})) {
      setMeta(`meta[property="og:${key}"]`, "property", `og:${key}`, content);
    }
    for (const [key, content] of Object.entries({title:meta.title,description:meta.description})) setMeta(`meta[name="twitter:${key}"]`, "name", `twitter:${key}`, content);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
    canonical.href = meta.canonical;
    document.documentElement.lang=meta.publicPage ? meta.language : i18n.language.startsWith("en") ? "en" : "sq";
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(element=>element.remove());
    for(const [language,href] of Object.entries(meta.alternates ?? {})) { const link=document.createElement("link");link.rel="alternate";link.hreflang=language;link.href=href;document.head.append(link); }
    setMeta('meta[property="og:locale:alternate"]', "property", "og:locale:alternate", meta.language==="sq" ? "en_US" : "sq_AL");
    const imageAlt=meta.language==="sq" ? "Disbunk – Verifikimi i fakteve dhe reagimi ndaj dezinformimit" : "Disbunk – Collaborative fact-checking and disinformation response";
    setMeta('meta[property="og:image:alt"]',"property","og:image:alt",imageAlt);
    setMeta('meta[name="twitter:image:alt"]',"name","twitter:image:alt",imageAlt);
    let structured = document.getElementById("site-structured-data");
    if (meta.publicPage) {
      if (!structured) { structured = document.createElement("script"); structured.id = "site-structured-data"; structured.setAttribute("type", "application/ld+json"); document.head.append(structured); }
      structured.textContent = JSON.stringify(structuredData(pathname,meta.title,meta.description));
    } else structured?.remove();

  }, [pathname, t, i18n.language]);
  return null;
}
