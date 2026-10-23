import { ContactForm } from "@/components/ContactForm";
import { useLocation } from 'react-router-dom';
import { publicCopy } from '@/content/public-pages';
import { CONTENT_UPDATED, publicDate, publicRoute, publicRoutes } from '@/lib/public-site';
import { PublicHeader } from '@/components/PublicHeader';
import { ProjectFooter } from '@/components/ProjectFooter';

export default function PublicPage() {
  const { pathname } = useLocation();
  const route = publicRoute(pathname)!;
  if (route.id === 'home') return null;
  const { language, id } = route;
  const copy = publicCopy[language][id];
  const en = language === 'en';
  return <div className="flex min-h-screen flex-col"><PublicHeader/><main id="content" className="page-wrap w-full flex-1 py-12 lg:py-20">
    <nav aria-label={en ? 'Breadcrumb' : 'Vendndodhja'} className="mb-8 text-sm text-muted-foreground"><a href={publicRoutes.home[language]} className="hover:text-primary">Disbunk</a><span aria-hidden="true" className="mx-3">/</span>{copy.title}</nav>
    <div className="max-w-3xl"><p className="eyebrow">{en ? 'Fact-checking and disinformation response' : 'Verifikimi i fakteve dhe reagimi ndaj dezinformimit'}</p><h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">{copy.title}</h1><p className="mt-6 text-xl leading-relaxed text-muted-foreground">{copy.description}</p>
    <p className="mt-5 text-xs text-muted-foreground">{en ? 'Last updated' : 'Përditësuar më'}: <time dateTime={CONTENT_UPDATED}>{publicDate(CONTENT_UPDATED,language)}</time></p>
    {id==='contact' && <ContactForm language={language}/>}
    <div className="mt-10 space-y-10 border-t border-border pt-10">{copy.sections.map(section=><section key={section.title}><h2 className="text-2xl font-bold">{section.title}</h2><p className="mt-4 leading-relaxed text-muted-foreground">{section.body}</p></section>)}</div>
    {(id==='about'||id==='contact') && <a href="https://sbunker.org/" target="_blank" rel="noopener noreferrer" className="mt-6 mr-6 inline-flex min-h-11 items-center font-semibold text-primary">Sbunker · sbunker.org</a>}
    <div className="mt-12 flex flex-wrap gap-4 border-t border-border pt-8"><a href={publicRoutes.methodology[language]} className="inline-flex min-h-11 items-center rounded-xl border border-border px-5 font-semibold">{en ? 'Our methodology' : 'Metodologjia jonë'}</a><a href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">{en ? 'Open the workspace' : 'Hap hapësirën e punës'}</a></div></div>
  </main><ProjectFooter/></div>;
}
