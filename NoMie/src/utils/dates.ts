const SHORT_MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as `YYYY-MM-DD` — the format transactions store. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `"2026-09-11"` -> `"11 sept."` */
export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return `${day} ${SHORT_MONTHS_FR[month - 1]}`;
}

/** `"2026-09-11"` -> `"11 sept. 2026"` */
export function formatLongDate(isoDate: string): string {
  const year = isoDate.slice(0, 4);
  return `${formatShortDate(isoDate)} ${year}`;
}

/** Day of month without leading zero, for sentences like "le 30". */
export function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}
