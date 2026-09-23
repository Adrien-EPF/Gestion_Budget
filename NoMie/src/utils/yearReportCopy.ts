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

/** « d’octobre », « de décembre » — the elided form before a vowel. */
export const fromMonth = (month: number) => (/^[aeiouy]/.test(lower(month)) ? `d’${lower(month)}` : `de ${lower(month)}`);

/** « Fin septembre », title of the balance reading. */
export const monthEndLabel = (month: number) => `Fin ${lower(month)}`;

/**
 * Legend of the lighter end of the réel curves: the months after
 * `lastMonth` (all of them for a year to come) are Prévisions.
 */
export function forecastLegend(lastMonth: number | null): string {
  const first = lastMonth === null ? 0 : lastMonth + 1;
  const months = first === 11 ? fromMonth(11) : `${fromMonth(first)} à décembre`;
  return `Trait plus clair : prévisions ${months}`;
}

/**
 * Sentence under the balance chart when an account goes below zero
 * (§6.7): what happened, then what the forecasts suggest — stated as a
 * fact, never as « découvert » or an alert. `null` while all stay above.
 */
export function describeBelowZero(accounts: { name: string; real: number[] }[], lastMonth: number | null): string | null {
  const realized = lastMonth ?? -1;
  for (const { name, real } of accounts) {
    const pastDip = real.findIndex((value, month) => month <= realized && value < 0);
    const forecastDip = real.findIndex((value, month) => month > realized && value < 0);
    if (pastDip < 0 && forecastDip < 0) continue;

    const sentences: string[] = [];
    if (pastDip >= 0) {
      const back = real.findIndex((value, month) => month > pastDip && month <= realized && value >= 0);
      sentences.push(
        `Le ${name} est passé sous zéro fin ${lower(pastDip)} (${formatAmount(real[pastDip])})` +
          (back >= 0 ? `, puis il est remonté fin ${lower(back)}.` : '.')
      );
    }
    if (forecastDip >= 0) {
      const subject = pastDip >= 0 ? 'il' : `le ${name}`;
      sentences.push(
        `D’après les prévisions, ${subject} repasserait sous zéro fin ${lower(forecastDip)} — une récurrence peut être décalée si besoin.`
      );
    }
    return sentences.join(' ');
  }
  return null;
}
