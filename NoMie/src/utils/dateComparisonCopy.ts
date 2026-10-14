import type { DateComparison } from '../services/dataService';
import { formatAmount } from './formatAmount';

const whole = (amount: number) => formatAmount(amount, { whole: true });

/** « au 14 », « au 1er »: the day the cumul runs to. */
const untilDay = (day: number) => (day === 1 ? 'au 1er' : `au ${day}`);

/**
 * The comparison à date as a plain fact, never a verdict (§6.1 « sans jugement »):
 * « 420 € au 14, contre 510 € en moyenne à cette date ».
 */
export function describeDateComparison({ day, total, monthsCompared }: DateComparison): string {
  const base = `${whole(total.current)} ${untilDay(day)}, contre ${whole(total.average)} en moyenne à cette date`;
  return monthsCompared < 3 ? `${base} (sur ${monthsCompared} mois)` : base;
}

/** One line of the detail: « 60 € contre 45 € en moyenne ». */
export function describeComparedAmounts({ current, average }: { current: number; average: number }): string {
  return `${whole(current)} contre ${whole(average)}`;
}
