import { createServer } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const server=await createServer({mode:'production',cacheDir:'.npm-cache/vite-prerender',server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
  const {renderPage}=await server.ssrLoadModule('/src/entry-prerender.tsx');
  const {pageMetadata,APP_PATHS,structuredData,SITE_URL}=await server.ssrLoadModule('/src/lib/page-metadata.ts');
  const {publicRoutes,CONTENT_UPDATED,languageOf}=await server.ssrLoadModule('/src/lib/public-site.ts');
  const dictionaries={};
  for(const language of ['sq','en']) dictionaries[language]=(await server.ssrLoadModule(`/src/i18n/${language}.json`)).default;
  const template=await readFile('dist/index.html','utf8');
  const publicPaths=Object.values(publicRoutes).flatMap(paths=>Object.values(paths));
  const output=async(path,loading=false,file)=>{
    const language=languageOf(path);
    const t=key=>key.split('.').reduce((value,part)=>value?.[part],dictionaries[language]) ?? key;
    const meta=pageMetadata(path,t);
    const dom=new JSDOM(template);const doc=dom.window.document;
    doc.documentElement.lang=language;doc.title=meta.title;
    doc.getElementById('root').innerHTML=await renderPage(path,loading);
    doc.querySelector('link[rel="canonical"]').href=meta.canonical;
    const values={description:meta.description,robots:meta.robots,'og:title':meta.title,'og:description':meta.description,'og:url':meta.canonical,'og:locale':language==='sq'?'sq_AL':'en_US','og:locale:alternate':language==='sq'?'en_US':'sq_AL','og:image:alt':meta.title,'twitter:title':meta.title,'twitter:description':meta.description,'twitter:image:alt':meta.title};
    for(const [key,content] of Object.entries(values)) { const attr=key.startsWith('og:')?'property':'name';let element=doc.querySelector(`meta[${attr}="${key}"]`);if(!element){element=doc.createElement('meta');element.setAttribute(attr,key);doc.head.append(element);}element.content=content; }
    doc.querySelectorAll('link[hreflang]').forEach(element=>element.remove());
    for(const [language,href] of Object.entries(meta.alternates??{})){const link=doc.createElement('link');link.rel='alternate';link.hreflang=language;link.href=href;doc.head.append(link);}
    doc.getElementById('site-structured-data')?.remove();
    if(meta.publicPage){
      doc.querySelectorAll('script[type="module"],link[rel="modulepreload"]').forEach(element=>element.remove());
      const enhancement=doc.createElement('script');enhancement.src='/public-site.js';enhancement.defer=true;doc.body.append(enhancement);
      if(path==='/kontakt'||path==='/en/contact'){const script=doc.createElement('script');script.src='/contact-form.js';script.defer=true;doc.body.append(script);}
    }
    const schema=structuredData(path,meta.title,meta.description);
    if(schema){const script=doc.createElement('script');script.id='site-structured-data';script.type='application/ld+json';script.textContent=JSON.stringify(schema).replaceAll('<','\\u003c');doc.head.append(script);}
    const target=file??(path==='/'?'dist/index.html':`dist${path.replace(/\/$/,'')}/index.html`);
    await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await writeFile(target,dom.serialize());dom.window.close();
  };
  for(const path of publicPaths) await output(path);
  for(const path of [...APP_PATHS,'/sbunker']) await output(path,true);
  await output('/404',false,'dist/404.html');await output('/en/404',false,'dist/en/404.html');
  const xmlEscape=text=>text.replaceAll('&','&amp;').replaceAll('"','&quot;');
  const urls=Object.values(publicRoutes).flatMap(paths=>Object.values(paths).map(path=>`  <url><loc>${SITE_URL}${path}</loc><lastmod>${CONTENT_UPDATED}</lastmod>${Object.entries({...paths,'x-default':paths.sq}).map(([lang,url])=>`<xhtml:link rel="alternate" hreflang="${lang}" href="${xmlEscape(SITE_URL+url)}"/>`).join('')}</url>`));
  await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
  const llms=`# Disbunk\n\nDisbunk is a collaborative platform where journalists, researchers and civil society verify claims, preserve evidence and coordinate responses to disinformation. Focus: Albania, Kosovo and North Macedonia. Albanian is the default language; English is available at /en/. Disbunk is not affiliated with Debunk.org in Lithuania.\n\nDisbunk është platformë bashkëpunimi për verifikimin e pretendimeve, ruajtjen e provave dhe reagimin ndaj dezinformimit.\n\nUpdated: ${CONTENT_UPDATED}\n\n## Public information / Informacion publik\n${Object.entries(publicRoutes).map(([id,paths])=>`- [${id} (shqip)](${SITE_URL}${paths.sq})\n- [${id} (English)](${SITE_URL}${paths.en})`).join('\n')}\n\n## Limits\nHDBSCAN suggests similar recorded claims for human review; similarity does not prove falsity or coordination. It does not automatically monitor news or social platforms. Google Cloud Translation activation is being configured; DocumentCloud and Slack/Discord/Telegram delivery are planned. Private workspace data is not public. Privacy and service terms are preliminary notices pending organizational review.\n`;
  await writeFile('dist/llms.txt',llms);
  // CloudPanel vhost include: only explicitly registered app paths receive an SPA shell.
  const lines=['# Generated by scripts/prerender.mjs. Install inside the HTTPS Disbunk server block.','error_page 404 /404.html;','location = /404.html { internal; }','location = /en/404.html { internal; }','location = /en { return 301 /en/$is_args$args; }'];
  for(const path of publicPaths){lines.push(`location = ${path} { try_files ${path==='/'?'/index.html':path.replace(/\/$/,'')+'/index.html'} =404; }`);if(path!=='/'&&path!=='/en/')lines.push(`location = ${path}/ { return 301 ${path}$is_args$args; }`);}
  for(const path of [...APP_PATHS,'/sbunker']) {lines.push(`location = ${path} { try_files ${path}/index.html =404; }`);lines.push(`location = ${path}/ { return 301 ${path}$is_args$args; }`);}
  lines.push('location ~ "^/claims/[0-9a-fA-F-]{36}$" { try_files /claims/index.html =404; }','location ~ "^/claims/([0-9a-fA-F-]{36})/$" { return 301 /claims/$1$is_args$args; }','location /en/ { error_page 404 /en/404.html; try_files $uri =404; }','location / { try_files $uri =404; }');
  await mkdir('deploy',{recursive:true});await writeFile('deploy/nginx-public-routes.conf',lines.join('\n')+'\n');
  console.log(`Prerendered ${publicPaths.length} public pages, application shells, bilingual 404s, sitemap and llms.txt.`);
} finally {await server.close();}
