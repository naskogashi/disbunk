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
