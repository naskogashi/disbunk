import { createServer } from "vite";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const server = await createServer({ mode: "production", cacheDir: ".npm-cache/vite-prerender", server: { middlewareMode: true, hmr: false }, appType: "custom" });
const escape = text => text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
try {
  const { renderLanding } = await server.ssrLoadModule("/src/entry-prerender.tsx");
  const { pageMetadata, APP_PATHS } = await server.ssrLoadModule("/src/lib/page-metadata.ts");
  const { default: en } = await server.ssrLoadModule("/src/i18n/en.json");
  const translate = key => key.split(".").reduce((value, part) => value?.[part], en) ?? key;
  const template = await readFile("dist/index.html", "utf8");
  const awaitedMarkup = await renderLanding();
  await writeFile("dist/index.html", template.replace('<div id="root"></div>', () => `<div id="root">${awaitedMarkup}</div>`));
  for (const path of [...APP_PATHS, "/404"]) {
    const meta = pageMetadata(path, translate);
    let html = template.replace(/<title>.*?<\/title>/, `<title>${escape(meta.title)}</title>`)
      .replace(/<script id="site-structured-data"[^>]*>.*?<\/script>/, "")
      .replace(/(<link rel="canonical" href=")[^"]+/, `$1${escape(meta.canonical)}`);
    for (const [name, content] of Object.entries({description:meta.description,robots:meta.robots,"og:title":meta.title,"og:description":meta.description,"og:url":meta.canonical,"twitter:title":meta.title,"twitter:description":meta.description})) {
      html = html.replace(new RegExp(`(<meta (?:name|property)="${name}" content=")[^"]*`), (_, prefix) => prefix + escape(content));
    }
    if (path === "/404") await writeFile("dist/404.html", html);
    else { await mkdir(`dist${path}`, {recursive:true}); await writeFile(`dist${path}/index.html`, html); }
  }
  console.log("Prerendered homepage and generated noindex metadata for application routes.");
} finally { await server.close(); }
