import { useEffect, useRef, useState, type MouseEvent } from "react";
import { LanguageSelect } from "@/components/LanguageSelect";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Moon, Sun, ArrowUpRight, Menu, Layers, Route, Cpu, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { useTheme } from "@/hooks/useTheme";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const links = [
  {id:"platform",key:"platform",icon:Layers},
  {id:"how-it-works",key:"how",icon:Route},
  {id:"technology",key:"technology",icon:Cpu},
];

export function PublicHeader() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState("");
  const pendingAnchor=useRef<string|null>(null);
  useEffect(()=>{
    if (pathname!=="/") return;
    const initial=links.find(({id})=>window.location.hash===`#${id}`);
    if(initial) document.getElementById(initial.id)?.scrollIntoView({block:"start",behavior:"auto"});
    if(typeof IntersectionObserver==="undefined") return;
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.find(entry=>entry.isIntersecting);
      if(visible) setActive(visible.target.id);
    },{rootMargin:"-15% 0px -65% 0px",threshold:0});
    for(const {id} of links) { const section=document.getElementById(id);if(section) observer.observe(section); }
    return ()=>observer.disconnect();
  },[pathname]);
  const href=(id:string)=>pathname==="/" ? `#${id}` : `/#${id}`;
  const choose=(id:string,event:MouseEvent<HTMLAnchorElement>)=>{
    setActive(id);
    // Wait for the drawer's scroll lock and focus restoration before jumping.
    if(open && pathname==="/") { event.preventDefault();pendingAnchor.current=id; }
    setOpen(false);
  };
  const themeButton=<Button variant="ghost" size="icon" className="size-11 shrink-0 rounded-xl" onClick={toggleTheme} aria-label={t(theme === "dark" ? "redesign.lightMode" : "redesign.darkMode")}>{theme === "dark" ? <Sun className="size-[18px]"/> : <Moon className="size-[18px]"/>}</Button>;
  return <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
    <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4">{t("redesign.skip")}</a>
    <div className="page-wrap flex h-20 items-center justify-between gap-3">
      <Link to="/" aria-label="Disbunk.org" className="shrink-0 rounded-md"><span className="hidden min-[360px]:inline-flex"><Brand className="!text-lg sm:!text-2xl"/></span><img src="/favicon.svg" alt="" className="size-8 min-[360px]:hidden"/></Link>
      <nav aria-label={t("redesign.navigation")} className="hidden items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 lg:flex">
        {links.map(({id,key})=><a key={id} href={href(id)} onClick={event=>choose(id,event)} aria-current={active===id && pathname==="/" ? "location" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold transition-colors hover:bg-card hover:text-primary ${active===id && pathname==="/" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{t(`publicNav.${key}`)}</a>)}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-1 lg:flex">{themeButton}<LanguageSelect/></div>
        <Button asChild className="h-11 rounded-xl px-3 text-sm sm:px-4"><Link to="/login">{t("landing.signIn")}<ArrowUpRight className="ml-2 hidden size-4 min-[420px]:block"/></Link></Button>
        <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="size-11 rounded-xl lg:hidden" aria-label={t("publicNav.open")}><Menu className="size-5"/></Button></SheetTrigger>
          <SheetContent side="right" onCloseAutoFocus={event=>{
            const id=pendingAnchor.current;
            if(!id) return;
            event.preventDefault();pendingAnchor.current=null;
            window.location.hash=id;
            document.getElementById(id)?.scrollIntoView({block:"start",behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? "auto" : "smooth"});
          }} className="flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-0 p-0 [&>button]:right-3 [&>button]:top-4 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-xl">
            <SheetHeader className="border-b border-border px-6 pb-6 pt-7 text-left"><Brand className="!text-xl"/><SheetTitle className="sr-only">{t("publicNav.menu")}</SheetTitle><SheetDescription className="pt-3 text-sm leading-relaxed">{t("publicNav.description")}</SheetDescription></SheetHeader>
            <nav aria-label={t("publicNav.mobileNavigation")} className="flex-1 space-y-2 overflow-y-auto p-4">{links.map(({id,key,icon:Icon})=><a key={id} href={href(id)} onClick={event=>choose(id,event)} className="group flex min-h-20 items-center gap-4 rounded-xl p-4 transition-colors hover:bg-secondary focus-visible:bg-secondary"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" strokeWidth={1.7}/></span><span className="min-w-0 flex-1"><span className="block text-base font-bold">{t(`publicNav.${key}`)}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t(`publicNav.${key}Hint`)}</span></span><ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground"/></a>)}</nav>
            <div className="space-y-4 border-t border-border bg-secondary/30 p-6"><a href="https://sbunker.org/category/disinfo/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold" aria-label={t("common.externalSbunker")}>{t("common.sbunkerDisinfo")}<ExternalLink className="size-4"/></a><div className="flex items-center justify-between border-t border-border pt-4"><LanguageSelect/>{themeButton}</div></div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>;
}
