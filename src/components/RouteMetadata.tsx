import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { pageMetadata, SITE_SCHEMA } from "@/lib/page-metadata";

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
    let structured = document.getElementById("site-structured-data");
    if (meta.home) {
      if (!structured) { structured = document.createElement("script"); structured.id = "site-structured-data"; structured.setAttribute("type", "application/ld+json"); document.head.append(structured); }
      structured.textContent = JSON.stringify({ ...SITE_SCHEMA, description: meta.description });
    } else structured?.remove();

  }, [pathname, t, i18n.language]);
  return null;
}
