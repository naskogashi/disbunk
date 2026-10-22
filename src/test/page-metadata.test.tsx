import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter, Link } from "react-router-dom";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import en from "@/i18n/en.json";
import sq from "@/i18n/sq.json";
import { RouteMetadata } from "@/components/RouteMetadata";
import { APP_PATHS, pageMetadata } from "@/lib/page-metadata";

afterEach(cleanup);
it("uses translated titles for every app route without indexing private pages", async () => {
  const i18n = createInstance();
  await i18n.init({lng:"en",resources:{en:{translation:en},sq:{translation:sq}}});
  for (const path of APP_PATHS) {
    const meta = pageMetadata(path,i18n.t.bind(i18n));
    expect(meta.title).toContain(" | Disbunk.org");
    expect(meta.title).not.toMatch(/nav\.|claims\.|tools\./);
    expect(meta.robots).toContain("noindex");
  }
  expect(pageMetadata("/claims/private-case",i18n.t.bind(i18n)).robots).toContain("noindex");
  await i18n.changeLanguage("sq");
  expect(pageMetadata("/",i18n.t.bind(i18n)).title).toBe(sq.seo.homeTitle);
});
it("updates head metadata on navigation and removes homepage structured data from the workspace", async () => {
  const i18n=createInstance();
  await i18n.use(initReactI18next).init({lng:"en",resources:{en:{translation:en}}});
  render(<I18nextProvider i18n={i18n}><MemoryRouter><RouteMetadata/><Link to="/evidence?claim=private-id">Evidence</Link><Link to="/">Home</Link></MemoryRouter></I18nextProvider>);
  expect(document.title).toBe(en.seo.homeTitle);
  expect(document.getElementById("site-structured-data")).not.toBeNull();
  fireEvent.click(screen.getByRole("link",{name:"Evidence"}));
  expect(document.title).toBe(`${en.nav.evidence} | Disbunk.org`);
  expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("noindex");
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://disbunk.org/evidence");
  expect(document.getElementById("site-structured-data")).toBeNull();
  fireEvent.click(screen.getByRole("link",{name:"Home"}));
  expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toMatch(/^index/);
});
