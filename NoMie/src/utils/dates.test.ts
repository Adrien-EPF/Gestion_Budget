import { dayOfMonth, formatLongDate, formatShortDate, toIsoDate } from './dates';

describe('dates', () => {
  it('serialises a local date as YYYY-MM-DD, zero-padded', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('formats a short French date without a leading zero', () => {
    expect(formatShortDate('2026-09-11')).toBe('11 sept.');
    expect(formatShortDate('2026-01-05')).toBe('5 janv.');
    expect(formatShortDate('2026-08-30')).toBe('30 août');
  });

  it('adds the year for the long form', () => {
    expect(formatLongDate('2026-09-11')).toBe('11 sept. 2026');
  });

  it('extracts the day of month', () => {
    expect(dayOfMonth('2026-09-30')).toBe(30);
    expect(dayOfMonth('2026-09-05')).toBe(5);
  });
});
