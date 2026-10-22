export const SITE_URL = "https://disbunk.org";
export const HOME_TITLE = "Disbunk.org — Evidence first. A coordinated response.";
export const HOME_DESCRIPTION = "Verify claims, preserve evidence, and coordinate a credible response to misinformation. Disbunk connects journalists, researchers, and civil society.";
const pageKeys: Record<string, string> = {
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
  const home = path === "/";
  return {
    title: home ? translate("seo.homeTitle") : `${key ? translate(key) : translate("seo.notFound")} | Disbunk.org`,
    description: translate(home ? "seo.homeDescription" : key === "landing.signIn" ? "seo.loginDescription" : "seo.workspaceDescription"),
    canonical: `${SITE_URL}${home ? "/" : path}`,
    robots: home ? "index, follow, max-image-preview:large" : "noindex, follow",
    home,
  };
}

export const SITE_SCHEMA = {
  "@context": "https://schema.org", "@type": "WebSite", name: "Disbunk.org",
  url: `${SITE_URL}/`, description: HOME_DESCRIPTION, inLanguage: ["en", "sq"],
};
