import type { BudgetProgress, MonthRef } from '../services/dataService';
import { formatAmount } from './formatAmount';

/**
 * Micro-copy for budgets. Factual and never anxious (CONTEXT.md §10,
 * handoff §6.3): an overrun is worded « un peu plus qu’en général »,
 * never « vous avez dépassé ».
 */

const NBSP = ' ';

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** « d’août », « de septembre »: the elision the month's first letter asks for. */
function deMonth(month: number): string {
  const name = MONTH_NAMES[month];
  return /^[aeiouhéèêâîôû]/i.test(name) ? `d’${name}` : `de ${name}`;
}

const previousMonthOf = ({ month }: MonthRef) => (month === 0 ? 11 : month - 1);

/** Share of `month` gone by at `now`: 0 before it starts, 1 once it is over. */
export function monthElapsedFraction(now: Date, { year, month }: MonthRef): number {
  const monthStart = new Date(year, month, 1).getTime();
  const nextMonthStart = new Date(year, month + 1, 1).getTime();
  if (now.getTime() < monthStart) return 0;
  if (now.getTime() >= nextMonthStart) return 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return now.getDate() / daysInMonth;
}

const BANDS: { at: number; label: string }[] = [
  { at: 0, label: 'presque rien' },
  { at: 1 / 4, label: 'environ un quart' },
  { at: 1 / 3, label: 'environ un tiers' },
  { at: 1 / 2, label: 'environ la moitié' },
  { at: 2 / 3, label: 'environ deux tiers' },
  { at: 3 / 4, label: 'environ les trois quarts' },
  { at: 1, label: 'presque tout' },
];

function nearestBand(ratio: number): { at: number; label: string } {
  const clamped = Math.min(1, Math.max(0, ratio));
  return BANDS.reduce((best, band) =>
    Math.abs(band.at - clamped) < Math.abs(best.at - clamped) ? band : best
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The summary card's note on how the month is going: how much of the
 * month is behind us against how much of the planned amount is used.
 */
export function describeMonthProgress(spent: number, planned: number, elapsed: number): string {
  if (elapsed === 0) return 'Le mois n’a pas encore commencé.';

  const used = planned > 0 ? spent / planned : 0;
  if (used > 1) {
    return elapsed === 1
      ? 'Mois terminé, le prévu est utilisé, et un peu plus.'
      : `${capitalize(nearestBand(elapsed).label)} du mois écoulé, le prévu est déjà utilisé, et un peu plus.`;
  }

  const usedBand = nearestBand(used);
  if (elapsed === 1) return `Mois terminé, ${usedBand.label} du prévu utilisé.`;

  const elapsedBand = nearestBand(elapsed);
  const usedText = usedBand.at === elapsedBand.at ? 'autant' : usedBand.label;
  return `${capitalize(elapsedBand.label)} du mois écoulé, ${usedText} du prévu utilisé.`;
}

/** The note under a budget's bar. */
export function describeBudget({ exceeded, remaining, carriedOver }: BudgetProgress, month: MonthRef): string {
  const carried = deMonth(previousMonthOf(month));
  if (exceeded) {
    return carriedOver > 0
      ? `Un peu plus qu’en général ce mois-ci — le reliquat ${carried} couvre une partie.`
      : 'Un peu plus qu’en général ce mois-ci.';
  }
  const left = `Il reste ${formatAmount(remaining)} pour ce mois-ci.`;
  return carriedOver > 0 ? `${left} Le reliquat ${carried} est inclus.` : left;
}

/** `138 / 120 €` — whole amounts lose their `,00` to keep the card header short. */
export function formatBudgetRatio(spent: number, ceiling: number): string {
  const compact = (value: number) =>
    formatAmount(value)
      .replace(`${NBSP}€`, '')
      .replace(/,00$/, '');
  return `${compact(spent)} / ${compact(ceiling)}${NBSP}€`;
}
