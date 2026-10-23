import { createInstance } from 'i18next';
import { expect, it } from 'vitest';
import en from '@/i18n/en.json';
import sq from '@/i18n/sq.json';
import { localizedTaskTitle, playbookSteps, standardPlaybookTitles } from '@/lib/playbook-tasks';

it('translates existing English and Albanian standard tasks without changing custom tasks',async()=>{
  const i18n=createInstance();
  await i18n.init({resources:{en:{translation:en},sq:{translation:sq}},lng:'sq',initImmediate:false});
  for (const step of playbookSteps) expect(localizedTaskTitle(en.tools[step],i18n.t)).toBe(sq.tools[step]);
  expect(localizedTaskTitle('  Trace the original source and context  ',i18n.t)).toBe(sq.tools.stepSource);
  const custom='Call the election commission at 10:00';
  expect(localizedTaskTitle(custom,i18n.t)).toBe(custom);
  await i18n.changeLanguage('en');
  for (const step of playbookSteps) expect(localizedTaskTitle(sq.tools[step],i18n.t)).toBe(en.tools[step]);
  expect(standardPlaybookTitles()).toEqual(playbookSteps.map(step=>en.tools[step]));
});
