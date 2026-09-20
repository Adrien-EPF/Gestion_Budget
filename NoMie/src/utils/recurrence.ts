export type RecurrenceFrequency = 'monthly' | 'weekly' | 'yearly';

const pad = (n: number) => String(n).padStart(2, '0');

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return { year, month: month - 1, day };
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Calendar arithmetic in UTC, so a daylight-saving change never shifts a date. */
function addDays(iso: string, days: number): string {
  const { year, month, day } = parseIso(iso);
  const shifted = new Date(Date.UTC(year, month, day + days));
  return toIso(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

/**
 * The `index`-th occurrence of a rule, 0 being the reference date itself.
 * A month too short for the reference day (the 31st, Feb 29) takes its last day.
 */
export function occurrenceDate(reference: string, frequency: RecurrenceFrequency, index: number): string {
  if (frequency === 'weekly') return addDays(reference, 7 * index);

  const { year, month, day } = parseIso(reference);
  const monthsAhead = frequency === 'monthly' ? index : 12 * index;
  const target = new Date(Date.UTC(year, month + monthsAhead, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth();
  return toIso(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

/** Index from which scanning for occurrences on/after `from` can start without skipping any. */
function startIndex(reference: string, frequency: RecurrenceFrequency, from: string): number {
  if (from <= reference) return 0;
  const ref = parseIso(reference);
  const target = parseIso(from);
  const months = (target.year - ref.year) * 12 + (target.month - ref.month);
  if (frequency === 'monthly') return Math.max(0, months - 1);
  if (frequency === 'yearly') return Math.max(0, Math.floor(months / 12) - 1);
  const days = (Date.UTC(target.year, target.month, target.day) - Date.UTC(ref.year, ref.month, ref.day)) / 86_400_000;
  return Math.max(0, Math.floor(days / 7) - 1);
}

/** Occurrences dated on `[from, to)` (ISO dates), in order. */
export function occurrencesBetween(
  reference: string,
  frequency: RecurrenceFrequency,
  from: string,
  to: string
): string[] {
  const dates: string[] = [];
  for (let index = startIndex(reference, frequency, from); ; index++) {
    const date = occurrenceDate(reference, frequency, index);
    if (date >= to) return dates;
    if (date >= from) dates.push(date);
  }
}

/** First occurrence dated `from` or later. */
export function nextOccurrenceOnOrAfter(
  reference: string,
  frequency: RecurrenceFrequency,
  from: string
): string {
  for (let index = startIndex(reference, frequency, from); ; index++) {
    const date = occurrenceDate(reference, frequency, index);
    if (date >= from) return date;
  }
}

/** The day after `iso`. */
export function nextDay(iso: string): string {
  return addDays(iso, 1);
}
