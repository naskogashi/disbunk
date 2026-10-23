import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicRoute } from '@/lib/public-site';
export function PublicLocale() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  useEffect(()=>{ const route=publicRoute(pathname); if(route && i18n.language!==route.language) void i18n.changeLanguage(route.language); },[pathname,i18n]);
  return null;
}
