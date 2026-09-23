import { monthName } from '../navigation/formatMonthLabel';
import type { BudgetMonth } from '../services/dataService';
import { formatAmount } from './formatAmount';
import { fromMonth } from './yearReportCopy';

const lower = (month: number) => monthName(month).toLowerCase();
const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Heading of the budget chart (§6.7 graphique 3), over the months gone
 * by: kept within the plan every month, or which months went a little
 * over — never « dépassé ».
 */
export function summarizeBudgetYear(
  months: BudgetMonth[],
  budget: { amount: number; carryOver: boolean }
): { title: string; detail: string | null } {
  const gone = months.filter((m) => m.state === 'realized');
  if (gone.every((m) => m.spent === 0)) return { title: 'Rien de dépensé ici cette année.', detail: null };

  const over = gone.filter((m) => m.spent > m.ceiling);
  if (over.length === 0) {
    // Planned minus spent: a carried amount is last month's plan, not money added.
    const unspent = Math.max(0, cents(gone.length * budget.amount - gone.reduce((sum, m) => sum + m.spent, 0)));
    return {
      title: 'Dans le prévu tous les mois',
      detail: `${formatAmount(unspent)} non dépensés sur l’année${budget.carryOver ? ', reportés au fil des mois.' : '.'}`,
    };
  }
  const count = over.length === 1 ? 'Un mois' : `${over.length} mois`;
  return {
    title: `Dans le prévu ${gone.length - over.length} mois sur ${gone.length}`,
    detail: `${count} un peu au-dessus : ${over.map((m) => lower(m.month)).join(', ')}.`,
  };
}

export type BudgetMonthPill = 'ok' | 'over' | 'upcoming';

export interface BudgetMonthReading {
  pill: BudgetMonthPill | null;
  amounts: string | null;
  /** « dont 20,00 € de reliquat de juillet », when the month got some. */
  carried: string | null;
  message: string;
}

/** The reading under the budget chart for the month picked. */
export function describeBudgetMonth(month: BudgetMonth, carryOver: boolean): BudgetMonthReading {
  if (month.state === 'not_started') {
    return { pill: null, amounts: null, carried: null, message: 'Ce budget n’avait pas encore commencé.' };
  }
  const carried =
    month.carriedOver > 0
      ? `dont ${formatAmount(month.carriedOver)} de reliquat ${fromMonth((month.month + 11) % 12)}`
      : null;
  if (month.state === 'upcoming') {
    return {
      pill: 'upcoming',
      amounts: `${formatAmount(month.ceiling)} prévus`,
      carried,
      message: 'Mois pas encore commencé.',
    };
  }

  const amounts = `${formatAmount(month.spent)} dépensés sur ${formatAmount(month.ceiling)} prévus`;
  if (month.spent > month.ceiling) {
    return {
      pill: 'over',
      amounts,
      carried,
      message: `Un peu plus que prévu ce mois-ci (${formatAmount(cents(month.spent - month.ceiling), { signed: true })}).`,
    };
  }
  const left = formatAmount(cents(month.ceiling - month.spent));
  return {
    pill: 'ok',
    amounts,
    carried,
    message: carryOver ? `Il est resté ${left}, reportés sur ${lower((month.month + 1) % 12)}.` : `Il est resté ${left}.`,
  };
}
