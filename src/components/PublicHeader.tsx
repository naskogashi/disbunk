import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, ArrowUpRight, Menu, X, Layers, Route, Cpu, ExternalLink, ArrowRight } from 'lucide-react';
import { PublicLanguageLinks } from '@/components/PublicLanguageLinks';
import { publicRoute, publicRoutes } from '@/lib/public-site';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/Brand';
import { useTheme } from '@/hooks/useTheme';

const links = [
  {id:'platform',key:'platform',icon:Layers},
  {id:'how-it-works',key:'how',icon:Route},
  {id:'technology',key:'technology',icon:Cpu},
];
export function PublicHeader() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const page=publicRoute(pathname);
  const language=page?.language ?? (i18n.language.startsWith('en') ? 'en' : 'sq');
  const home=publicRoutes.home[language];
  const [active,setActive]=useState('');
  const {theme,toggleTheme}=useTheme();
  useEffect(()=>{
    if(page?.id!=='home')return;
    const initial=links.find(({id})=>window.location.hash===`#${id}`);
    if(initial)document.getElementById(initial.id)?.scrollIntoView({block:'start'});
    if(typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(entries=>{const visible=entries.find(entry=>entry.isIntersecting);if(visible)setActive(visible.target.id);},{rootMargin:'-15% 0px -65% 0px'});
    for(const {id} of links){const section=document.getElementById(id);if(section)observer.observe(section);}
    return ()=>observer.disconnect();
  },[pathname,page?.id]);
  const href=(id:string)=>page?.id==='home' ? `#${id}` : `${home}#${id}`;
  const themeButton=<Button variant="ghost" size="icon" data-public-theme data-light-label={t('redesign.lightMode')} data-dark-label={t('redesign.darkMode')} className="size-11 shrink-0 rounded-xl" onClick={toggleTheme} aria-label={t(theme==='dark'?'redesign.lightMode':'redesign.darkMode')}><Sun className="hidden size-[18px] dark:block"/><Moon className="size-[18px] dark:hidden"/></Button>;
  return <header className="sticky top-0 z-40 border-b border-border bg-background/95">
    <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4">{t('redesign.skip')}</a>
    <div className="page-wrap grid h-20 grid-cols-[1fr_auto] items-center gap-3 min-[1152px]:grid-cols-[1fr_auto_1fr]">
      <Link to={home} aria-label="Disbunk.org" className="shrink-0 rounded-md"><span className="hidden min-[360px]:inline-flex"><Brand className="!text-lg sm:!text-2xl"/></span><img src="/favicon.svg" alt="" className="size-8 min-[360px]:hidden"/></Link>
      <nav aria-label={t('redesign.navigation')} data-section-navigation className="hidden w-[440px] grid-cols-4 items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 min-[1152px]:grid">
        {links.map(({id,key})=><a key={id} href={href(id)} aria-current={active===id?'location':undefined} className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-primary aria-[current=location]:bg-card aria-[current=location]:text-primary aria-[current=location]:shadow-sm">{t(`publicNav.${key}`)}</a>)}
        <a href={publicRoutes.about[language]} className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full px-2 text-sm font-semibold text-muted-foreground hover:bg-card hover:text-primary">{language==='en'?'About':'Rreth nesh'}</a>
      </nav>
      <div className="flex shrink-0 items-center justify-self-end gap-2">
        <div className="hidden items-center gap-1 min-[1152px]:flex">{themeButton}<PublicLanguageLinks/></div>
        <Button asChild className="h-11 w-24 justify-center rounded-xl px-3 text-sm"><Link to="/login">{t('landing.signIn')}<ArrowUpRight className="ml-2 hidden size-4 min-[420px]:block"/></Link></Button>
        <details data-public-menu className="group/public-menu min-[1152px]:hidden" onKeyDown={event=>{if(event.key==='Escape')event.currentTarget.open=false;}}>
          <summary aria-label={t('publicNav.open')} data-open-label={t('publicNav.open')} data-close-label={t('common.close')} className="relative z-50 flex size-11 cursor-pointer list-none items-center justify-center rounded-xl border border-border bg-background [&::-webkit-details-marker]:hidden"><Menu className="size-5 group-open/public-menu:hidden"/><X className="hidden size-5 group-open/public-menu:block"/></summary>
          <div data-menu-backdrop onClick={event=>event.currentTarget.closest('details')?.removeAttribute('open')} className="fixed inset-0 z-40 bg-black/40" aria-hidden="true"/>
          <div className="fixed inset-y-0 right-0 z-40 flex w-[calc(100vw-2rem)] max-w-sm flex-col border-l border-border bg-background shadow-xl">
            <div className="border-b border-border px-6 pb-6 pt-7 text-left"><Brand className="!text-xl"/><p className="pt-3 text-sm leading-relaxed text-muted-foreground">{t('publicNav.description')}</p></div>
            <nav aria-label={t('publicNav.mobileNavigation')} onClick={event=>{if((event.target as Element).closest('a'))event.currentTarget.closest('details')?.removeAttribute('open');}} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">{links.map(({id,key,icon:Icon})=><a key={id} href={href(id)} className="flex min-h-20 items-center gap-4 rounded-xl p-4 hover:bg-secondary focus-visible:bg-secondary"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" strokeWidth={1.7}/></span><span className="min-w-0 flex-1"><span className="block text-base font-bold">{t(`publicNav.${key}`)}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t(`publicNav.${key}Hint`)}</span></span><ArrowRight className="size-4 shrink-0 text-muted-foreground"/></a>)}<a href={publicRoutes.about[language]} className="block rounded-xl px-4 py-3 font-semibold">{language==='en'?'About Disbunk':'Rreth Disbunk'}</a><a href={publicRoutes.methodology[language]} className="block rounded-xl px-4 py-3 font-semibold">{language==='en'?'Methodology':'Metodologjia'}</a></nav>
            <div className="space-y-4 border-t border-border bg-secondary/30 p-6"><a href="https://sbunker.org/category/disinfo/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold" aria-label={t('common.externalSbunker')}>{t('common.sbunkerDisinfo')}<ExternalLink className="size-4"/></a><div className="flex items-center justify-between border-t border-border pt-4"><PublicLanguageLinks/>{themeButton}</div></div>
          </div>
        </details>
      </div>
    </div>
  </header>;
}
