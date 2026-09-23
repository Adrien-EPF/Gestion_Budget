const MONTHS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

/** e.g. formatMonthLabel(2026, 8) -> "Septembre 2026" (month is 0-11). */
export function formatMonthLabel(year: number, month: number): string {
  return `${MONTHS_FR[month]} ${year}`;
}

/** e.g. monthName(8) -> "Septembre" (month is 0-11). */
export function monthName(month: number): string {
  return MONTHS_FR[month];
}
