import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { isNavigationActive, workspacePage } from '@/lib/workspace-navigation';

const state=vi.hoisted(()=>({admin:false,mobile:false}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({hasRole:()=>state.admin})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>state.mobile}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string)=>key})}));
beforeEach(()=>{state.admin=false;state.mobile=false;});

function navigation(defaultOpen=true) {
  return render(<MemoryRouter initialEntries={['/claims/example']}><SidebarProvider defaultOpen={defaultOpen}><AppSidebar/><SidebarTrigger/></SidebarProvider></MemoryRouter>);
}

it('groups investigation links, marks the current route, and hides administration from nonadmins',()=>{
  navigation();
  expect(screen.getByText('navigation.investigations')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'nav.claims'})).toHaveAttribute('aria-current','page');
  expect(screen.queryByRole('link',{name:'nav.admin'})).not.toBeInTheDocument();
  expect(isNavigationActive('/claims-old','/claims')).toBe(false);
  expect(workspacePage('/claims/new').title).toBe('dashboard.newClaim');
});

it('keeps collapsed destinations named and exposes administration to admins',()=>{
  state.admin=true;
  navigation(false);
  expect(screen.getByRole('link',{name:'nav.claims'})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'nav.admin'})).toBeInTheDocument();
});

it('shows full mobile labels even after desktop collapse, and closes on navigation',async()=>{
  state.mobile=true;
  navigation(false);
  fireEvent.click(screen.getByRole('button',{name:'common.toggleSidebar'}));
  expect(await screen.findByRole('dialog',{name:'navigation.menu'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'navigation.closeMenu'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link',{name:'nav.teams'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
