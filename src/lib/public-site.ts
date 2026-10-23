export type PublicLanguage = 'sq' | 'en';
export const CONTENT_UPDATED = '2026-10-23';
export const publicRoutes = {
  home: { sq: '/', en: '/en/' },
  about: { sq: '/rreth-nesh', en: '/en/about' },
  methodology: { sq: '/metodologjia', en: '/en/methodology' },
  claims: { sq: '/vecorite/pretendimet', en: '/en/features/claims' },
  evidence: { sq: '/vecorite/provat', en: '/en/features/evidence' },
  campaigns: { sq: '/vecorite/fushatat', en: '/en/features/campaigns' },
  teams: { sq: '/vecorite/ekipet', en: '/en/features/teams' },
  faq: { sq: '/pyetje-te-shpeshta', en: '/en/faq' },
  contact: { sq: '/kontakt', en: '/en/contact' },
  privacy: { sq: '/privatesia', en: '/en/privacy' },
  terms: { sq: '/kushtet', en: '/en/terms' },
} as const;
export type PublicPageId = keyof typeof publicRoutes;
export function publicRoute(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  for (const [id, paths] of Object.entries(publicRoutes)) {
    for (const language of ['sq','en'] as const) {
      if ((paths[language].replace(/\/+$/, '') || '/') === path) return { id: id as PublicPageId, language, path: paths[language] };
    }
  }
  return undefined;
}
export const languageOf = (path: string): PublicLanguage => path === '/en' || path.startsWith('/en/') ? 'en' : 'sq';
