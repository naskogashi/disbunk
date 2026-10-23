import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
const sitemap = new JSDOM(await readFile('dist/sitemap.xml','utf8'),{contentType:'application/xml'});
const entries=[...sitemap.window.document.querySelectorAll('url')];
assert.equal(entries.length,22);
for(const entry of entries) {
  const url=entry.querySelector('loc').textContent;
  const path=new URL(url).pathname;
  const language=path.startsWith('/en/')?'en':'sq';
  const file=path==='/'?'dist/index.html':`dist${path.replace(/\/$/,'')}/index.html`;
  const dom=new JSDOM(await readFile(file,'utf8'));const doc=dom.window.document;
  assert.equal(doc.documentElement.lang,language,url);
  assert.equal(doc.querySelector('link[rel="canonical"]').href,url);
  assert.match(doc.querySelector('meta[name="robots"]').content,/^index/);
  assert.equal(doc.querySelectorAll('h1').length,1,url);
  assert.equal(doc.querySelectorAll('script[type="module"]').length,0,url);
  assert.ok(doc.querySelector('script[src="/public-site.js"][defer]'),url);
  assert.ok(doc.querySelector('main').textContent.length>400,url);
  assert.equal(doc.querySelectorAll('link[hreflang]').length,3,url);
  assert.equal(entry.querySelector('lastmod').textContent,'2026-10-23');
  for(const alternate of entry.getElementsByTagName('xhtml:link')) {
    const lang=alternate.getAttribute('hreflang');const href=alternate.getAttribute('href');
    assert.equal(doc.querySelector(`link[hreflang="${lang}"]`).href,href,url);
    if(lang!=='x-default')assert.ok(doc.querySelector(`a[hreflang="${lang}"][lang="${lang}"][href="${new URL(href).pathname}"]`),`Language link missing: ${url}`);
  }
  const graph=JSON.parse(doc.getElementById('site-structured-data').textContent)['@graph'];
  assert.ok(graph.some(item=>item['@type']==='Organization'));
  const page=graph.find(item=>['WebPage','FAQPage','AboutPage','ContactPage'].includes(item['@type']));
  assert.equal(page.url,url);assert.equal(page.inLanguage,language);
  if(page['@type']==='FAQPage')for(const question of page.mainEntity) {assert.ok(doc.body.textContent.includes(question.name));assert.ok(doc.body.textContent.includes(question.acceptedAnswer.text));}
  for(const anchor of doc.querySelectorAll('a[href^="/"]')) {
    const href=anchor.getAttribute('href').split('#')[0];
    if(!href||href==='/login'||href==='/claims/new')continue;
    assert.ok(entries.some(item=>new URL(item.querySelector('loc').textContent).pathname===href),`Unrecognized public link ${href} on ${url}`);
  }
  dom.window.close();
}
for(const path of ['/login','/claims','/dashboard','/templates','/admin']){
  const doc=new JSDOM(await readFile(`dist${path}/index.html`,'utf8')).window.document;
  assert.match(doc.querySelector('meta[name="robots"]').content,/noindex/);
  assert.equal(doc.querySelectorAll('link[hreflang]').length,0);
  assert.equal(doc.querySelectorAll('script[type="application/ld+json"]').length,0);
}
for(const file of ['dist/404.html','dist/en/404.html']){
  const doc=new JSDOM(await readFile(file,'utf8')).window.document;
  assert.match(doc.querySelector('meta[name="robots"]').content,/noindex/);
  assert.equal(doc.querySelector('h1').textContent,'404');
}
assert.match(await readFile('dist/llms.txt','utf8'),/^# Disbunk/);
console.log('SEO checks passed: 22 full public HTML pages, reciprocal language groups, schema, sitemap, language links, private noindex and bilingual 404s.');
