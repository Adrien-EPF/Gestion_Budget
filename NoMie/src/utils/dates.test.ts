import {
  dayOfMonth,
  formatDayMonth,
  formatLongDate,
  formatShortDate,
  parseTypedDate,
  toIsoDate,
  toTypedDate,
  weekdayName,
} from './dates';

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

describe('date typing and long forms', () => {
  it('formats a day and month in full', () => {
    expect(formatDayMonth('2026-10-05')).toBe('5 octobre');
    expect(formatDayMonth('2026-02-01')).toBe('1 février');
  });

  it('names the weekday', () => {
    expect(weekdayName('2026-09-21')).toBe('lundi');
    expect(weekdayName('2026-09-20')).toBe('dimanche');
  });

  it('reads typed dates, French or ISO, and rejects impossible ones', () => {
    expect(parseTypedDate('05/10/2026')).toBe('2026-10-05');
    expect(parseTypedDate(' 5/1/2026 ')).toBe('2026-01-05');
    expect(parseTypedDate('2026-10-05')).toBe('2026-10-05');
    expect(parseTypedDate('31/02/2026')).toBeNull();
    expect(parseTypedDate('demain')).toBeNull();
    expect(parseTypedDate('')).toBeNull();
  });

  it('writes a date the way it is typed', () => {
    expect(toTypedDate('2026-10-05')).toBe('05/10/2026');
  });
});
