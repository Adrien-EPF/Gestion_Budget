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

const MONTHS_FR = [
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

const WEEKDAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** `"2026-10-05"` -> `"5 octobre"` */
export function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return `${day} ${MONTHS_FR[month - 1]}`;
}

/** `"2026-10-05"` -> `"lundi"` */
export function weekdayName(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  return WEEKDAYS_FR[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/**
 * Reads a date typed as `JJ/MM/AAAA` (or already ISO) into `YYYY-MM-DD`;
 * `null` when it isn't a real calendar date.
 */
export function parseTypedDate(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$|^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [year, month, day] = match[4]
    ? [Number(match[4]), Number(match[5]), Number(match[6])]
    : [Number(match[3]), Number(match[2]), Number(match[1])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `"2026-10-05"` -> `"05/10/2026"`, the shape the date field is typed in. */
export function toTypedDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}
