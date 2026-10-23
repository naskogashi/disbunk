import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import en from '@/i18n/en.json';
import sq from '@/i18n/sq.json';
import { PublicHeader } from '@/components/PublicHeader';
import { PublicTechnology } from '@/components/PublicTechnology';

it('provides public section links from login and closes the accessible mobile menu after selection',async()=>{
  const i18n=createInstance();
  await i18n.init({lng:'sq',resources:{sq:{translation:sq},en:{translation:en}},initImmediate:false});
  render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/login']}><PublicHeader/></MemoryRouter></I18nextProvider>);
  expect(screen.getByRole('link',{name:sq.publicNav.technology})).toHaveAttribute('href','/#technology');
  expect(screen.getByRole('link',{name:sq.landing.signIn})).toHaveAttribute('href','/login');
  fireEvent.click(screen.getByLabelText(sq.publicNav.open));
  const menu=screen.getByLabelText(sq.publicNav.open).closest('details')!;
  expect(menu).toHaveAttribute('open');
  fireEvent.click(screen.getByRole('link',{name:new RegExp(sq.publicNav.technologyHint)}));
  expect(menu).not.toHaveAttribute('open');
});

it('explains current limitations and distinguishes planned integrations in both languages',async()=>{
  const i18n=createInstance();
  await i18n.init({lng:'sq',resources:{sq:{translation:sq},en:{translation:en}},initImmediate:false});
  render(<I18nextProvider i18n={i18n}><PublicTechnology/></I18nextProvider>);
  expect(screen.getByText(sq.publicTools.boundaries)).toBeVisible();
  expect(screen.getByText(sq.publicTools.integrationsNote)).toBeVisible();
  expect(screen.getByText('DocumentCloud')).toBeVisible();
  await act(async()=>{await i18n.changeLanguage('en');});
  await waitFor(()=>expect(screen.getByText(en.publicTools.boundaries)).toBeVisible());
  expect(screen.getByText(en.publicTools.translationBody)).toBeVisible();
});
