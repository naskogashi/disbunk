import type { TFunction } from 'i18next';
import en from '@/i18n/en.json';
import sq from '@/i18n/sq.json';

export const playbookSteps = ['stepSource', 'stepEvidence', 'stepReview', 'stepResponse'] as const;
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');

// Older tasks store the interface text at creation time, rather than a key.
// Match only known built-in steps; user-authored tasks remain untouched.
export function localizedTaskTitle(title: string, t: TFunction) {
  const step = playbookSteps.find(key => [en.tools[key], sq.tools[key]].some(value => normalize(value) === normalize(title)));
  return step ? t(`tools.${step}`) : title;
}

export function standardPlaybookTitles() {
  return playbookSteps.map(key => en.tools[key]);
}
