import { monthName } from '../navigation/formatMonthLabel';
import { formatAmount } from './formatAmount';

const NBSP = ' ';

const lower = (month: number) => monthName(month).toLowerCase();

/** Period under the year's spending total (§6.7): Prévisions are never counted as spent. */
export function expensePeriodNote(lastMonth: number): string {
  if (lastMonth === 11) return 'De janvier à décembre.';
  const period = lastMonth === 0 ? 'En janvier' : `De janvier à ${lower(lastMonth)}`;
  return `${period} · les prévisions ne sont pas comptées.`;
}

/**
 * Under a category's monthly bars: its average over the months gone by
 * (the rest of the year hasn't happened) and its highest month.
 */
export function describeMonthlySpread(months: number[], lastMonth: number): string {
  const elapsed = months.slice(0, lastMonth + 1);
  const average = elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length;
  const peak = months.indexOf(Math.max(...months));
  return `Moyenne ${formatAmount(average)} par mois · le plus haut en ${lower(peak)} (${formatAmount(months[peak])}).`;
}

/** « 43 % », or « <1 % » rather than a misleading zero. */
export function formatShare(share: number): string {
  return share < 0.01 ? `<1${NBSP}%` : `${Math.round(share * 100)}${NBSP}%`;
}
