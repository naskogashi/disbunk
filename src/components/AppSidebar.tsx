import { BookOpen, Settings, Lock, ExternalLink, Plus, X, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { workspaceNavigation, isNavigationActive } from "@/lib/workspace-navigation";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = !isMobile && state === "collapsed";
  const { pathname } = useLocation();
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const closeMobile = () => { if (isMobile) setOpenMobile(false); };
  const utility = [
    { key:"nav.docs",url:"/docs",icon:BookOpen },
    { key:"nav.settings",url:"/settings",icon:Settings },
    ...(hasRole("admin") ? [{key:"nav.admin",url:"/admin",icon:Lock}] : []),
  ];
  const navItem = (item: typeof utility[number]) => <SidebarMenuItem key={item.url}>
    <SidebarMenuButton asChild isActive={isNavigationActive(pathname,item.url)} tooltip={t(item.key)} className="workspace-nav-item group-data-[collapsible=icon]:!size-11">
      <NavLink to={item.url} onClick={closeMobile} aria-label={collapsed ? t(item.key) : undefined}>
        <item.icon className="!size-[18px] shrink-0" strokeWidth={1.8}/>
        {!collapsed && <><span className="truncate">{t(item.key)}</span>{isNavigationActive(pathname,item.url) && <ChevronRight className="ml-auto !size-3.5 opacity-60"/>}</>}
      </NavLink>
    </SidebarMenuButton>
  </SidebarMenuItem>;

  return <Sidebar collapsible="icon" className="workspace-nav">
    <SidebarHeader className="gap-5 px-4 pb-4 pt-6 group-data-[collapsible=icon]:px-3">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <Link to="/dashboard" onClick={closeMobile} aria-label="Disbunk.org" className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          {collapsed ? <img src="/favicon.svg" alt="" className="size-9"/> : <Brand className="!text-xl"/>}
        </Link>
        {isMobile && <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={()=>setOpenMobile(false)} aria-label={t("navigation.closeMenu")}><X className="size-5"/></Button>}
      </div>
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip={t("dashboard.newClaim")} className="workspace-create group-data-[collapsible=icon]:!size-11">
        <Link to="/claims/new" onClick={closeMobile} aria-label={collapsed ? t("dashboard.newClaim") : undefined}><Plus className="!size-[18px]"/>{!collapsed && <span>{t("dashboard.newClaim")}</span>}</Link>
      </SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    </SidebarHeader>
    <SidebarContent className="gap-1 px-1 pb-3">
      <nav aria-label={t("navigation.main")} className="space-y-2">
        {workspaceNavigation.map(group=><SidebarGroup key={group.key} className="py-2">
          <SidebarGroupLabel className="mb-1 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{t(`navigation.${group.key}`)}</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{group.items.map(navItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>)}
      </nav>
    </SidebarContent>
    <SidebarFooter className="gap-2 border-t border-sidebar-border px-4 py-3 group-data-[collapsible=icon]:px-3">
      <nav aria-label={t("navigation.resources")}><SidebarMenu>{utility.map(navItem)}
        <SidebarMenuItem><SidebarMenuButton asChild tooltip={t("common.sbunkerDisinfo")} className="workspace-nav-item group-data-[collapsible=icon]:!size-11">
          <a href="https://sbunker.org/category/disinfo/" target="_blank" rel="noopener noreferrer" aria-label={t("common.externalSbunker")}><ExternalLink className="!size-[18px]"/>{!collapsed && <span>{t("common.sbunkerDisinfo")}</span>}</a>
        </SidebarMenuButton></SidebarMenuItem>
      </SidebarMenu></nav>
    </SidebarFooter>
  </Sidebar>;
}
