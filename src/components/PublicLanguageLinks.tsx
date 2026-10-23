import { useLocation } from 'react-router-dom';
import { LanguageSelect } from "@/components/LanguageSelect";
import { publicRoute, publicRoutes } from '@/lib/public-site';

/** Plain links remain usable in the prerendered page with JavaScript disabled. */
export function PublicLanguageLinks() {
  const { pathname, hash } = useLocation();
  const route = publicRoute(pathname);
  if(!route) return <LanguageSelect/>;
  const id = route.id;
  return <nav aria-label={route?.language === 'en' ? 'Page language' : 'Gjuha e faqes'} className="language-switch">
    {(['sq','en'] as const).map(language => <a key={language} href={`${publicRoutes[id][language]}${hash}`} hrefLang={language} lang={language} aria-current={route?.language === language ? 'page' : undefined} className="language-choice">{language === 'sq' ? 'Shqip' : 'English'}</a>)}
  </nav>;
}
