import { LayoutDashboard, FileText, Shield, Target, Users, BarChart3, Bell, Files } from 'lucide-react';

export const workspaceNavigation = [
  { key: 'overview', items: [
    { key: 'nav.dashboard', url: '/dashboard', icon: LayoutDashboard },
    { key: 'tools.alerts', url: '/alerts', icon: Bell },
  ] },
  { key: 'investigations', items: [
    { key: 'nav.claims', url: '/claims', icon: FileText },
    { key: 'nav.evidence', url: '/evidence', icon: Shield },
    { key: 'nav.campaigns', url: '/campaigns', icon: Target },
    { key: 'tools.templates', url: '/templates', icon: Files },
  ] },
  { key: 'organization', items: [
    { key: 'nav.teams', url: '/teams', icon: Users },
    { key: 'nav.analytics', url: '/analytics', icon: BarChart3 },
  ] },
];

export function isNavigationActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + '/');
}

export function workspacePage(pathname: string) {
  if (isNavigationActive(pathname, '/claims/new')) return { section: 'navigation.investigations', title: 'dashboard.newClaim' };
  for (const group of workspaceNavigation) {
    const item = group.items.find(item => isNavigationActive(pathname, item.url));
    if (item) return { section: `navigation.${group.key}`, title: item.key };
  }
  const secondary = [['/admin','nav.admin'],['/settings','nav.settings'],['/profile','nav.profile'],['/docs','nav.docs']];
  return { section:'navigation.workspace', title:secondary.find(([path])=>isNavigationActive(pathname,path))?.[1] ?? 'navigation.workspace' };
}
