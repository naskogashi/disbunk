# Public SEO implementation

## Inventory before changes

Vite 5 / React 18 / React Router 6. The homepage was build-time rendered in Albanian with Vite SSR and React renderToString; private application routes received a noindex loading shell. i18next dictionaries live in `src/i18n/{sq,en}.json`; the switcher used localStorage only (`disbunk_language`). HTML already included `lang=sq` and a minimal WebSite schema.

HTTP checks on 2026-10-23: HTTP root redirects 301 to HTTPS; www redirects 301 to non-www; `/login/` returned 200 without slash normalization; `/en/` and a random path both returned the Albanian homepage with 200. Nginx used an unrestricted `/index.html` fallback.

## Chosen design

Keep `/` for Albanian and `/en/` for English. Central translated slug mapping is `src/lib/public-site.ts`. Public URLs determine language, regardless of saved preferences; no IP or Accept-Language redirect. Public language links are ordinary anchors to counterpart pages and preserve section hashes. The authenticated workspace retains its language select and saved preference.

Build-time prerendering produces 22 public pages with self canonicals, reciprocal sq/en/x-default links, localized metadata, full HTML and schema. The sitemap and llms.txt are generated from the same route inventory. Private routes remain noindex and crawlable. `npm run check:seo` validates the built pages. Nginx configuration is generated at `deploy/nginx-public-routes.conf`; install it in the Disbunk HTTPS server block in place of the broad fallback, after deploying the generated files. Preserve TLS, logs, root and existing global settings. Only explicit workspace paths and UUID claim links receive app shells.

## Editorial limits

New Albanian copy requires **TODO-SQ-REVIEW** by a native speaker. Pending facts are listed in SEO-OFFPAGE.md. Organization parent/funder, free pricing, ratings, named staff and postal address are deliberately omitted from schema because not confirmed. Privacy and terms are transparent preliminary information, not completed legal notices. No public claim results, ClaimReview markup or automatic evidence publication were added.

## References

- Google localized pages: https://developers.google.com/search/docs/specialty/international/localized-versions
- Schema vocabulary: https://schema.org/SoftwareApplication and https://schema.org/FAQPage
- Google software app rich result requirements: https://developers.google.com/search/docs/appearance/structured-data/software-app

Performance measurements and live routing verification are recorded below after deployment. Lab Lighthouse metrics are not a substitute for field INP data.

## Live verification 2026-10-23

Initial SEO deployment 50730ef succeeded. CloudPanel accepted the generated routing configuration; a local backup of the previous vhost is retained in ignored artifacts. HTTP checks confirmed English pages 200 with full English HTML, random sq/en paths 404, llms.txt 200 text/plain, `/en` → 301 `/en/`, `/login/` → 301 `/login`, and an existing UUID claim deep link 200. Public pages remain crawlable and app shells remain noindex.

Schema.org validator: zero errors and warnings on the English homepage. Google Rich Results Test: one valid SoftwareApplication, no critical errors, two optional warnings (offers and aggregateRating). Test result: https://search.google.com/test/rich-results/result?id=S3DTTtRtFpVA61uNrqv6aA. No pricing or ratings were invented to remove optional warnings.

Owner confirmed that Disbunk is part of Sbunker NGO and CODON is a technical partner. The public organization schema now identifies Sbunker as parentOrganization. Signed-in workspace footers show CODON only; public acknowledgements are retained.

Public pages now use static HTML with a small progressive-enhancement script for menu, theme, section highlighting and language-link hashes. The React app bundle is not loaded on prerendered public pages. The native mobile details menu and all content/language links work without JavaScript. Login and authenticated workspace pages retain the React application and existing language select. A hydration experiment was discarded after it failed to improve the performance audit reliably.

Initial live Lighthouse mobile scores before static delivery: Albanian performance 90 / SEO 100 / accessibility 100, English performance 86 / SEO 100 / accessibility 100, LCP 2.0 seconds and CLS 0 for both. The final static English production preview measured performance 99 / SEO 100 / accessibility 100, LCP 1.5 seconds, CLS 0 and total blocking time 50 ms. Re-run live measurements after deployment; reports are retained in ignored `artifacts/`. INP requires field data and is not claimed from a navigation-only lab test.

The first route inventory exposed a nested React Router regression: the exact outer `/login` match consumed the path before the workspace router. Hotfix 98e9ffe restores a wildcard boundary with an explicit route allowlist inside WorkspaceEntry. A regression test now uses real nested workspace routes. The deployed login form was verified after the fix.
