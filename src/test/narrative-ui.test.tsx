import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { NarrativeSuggestions } from '@/components/NarrativeSuggestions';

const mocks=vi.hoisted(()=>({admin:false,from:vi.fn()}));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>({hasRole:()=>mocks.admin})}));
vi.mock('@/lib/supabase',()=>({supabase:{from:mocks.from}}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(key:string)=>key})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/lib/locale',()=>({displayDateTime:(value:string)=>value}));
beforeEach(()=>{mocks.admin=false;mocks.from.mockReset();});

it('does not fetch or expose analysis for nonadmins',()=>{
  render(<NarrativeSuggestions onAccepted={()=>{}} />);
  expect(mocks.from).not.toHaveBeenCalled();
  expect(screen.queryByText('clustering.title')).not.toBeInTheDocument();
});

it('gives admins an honest not-yet-activated state when database access fails',async()=>{
  mocks.admin=true;
  const query={select:vi.fn(),eq:vi.fn(),order:vi.fn(),limit:vi.fn()};
  query.select.mockReturnValue(query);query.eq.mockReturnValue(query);query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({data:null,error:{message:'missing table'}});
  mocks.from.mockReturnValue(query);
  render(<MemoryRouter><NarrativeSuggestions onAccepted={()=>{}} /></MemoryRouter>);
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('clustering.unavailable'));
  expect(screen.queryByText('clustering.empty')).not.toBeInTheDocument();
});
