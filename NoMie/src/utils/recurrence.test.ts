import { nextOccurrenceOnOrAfter, occurrenceDate, occurrencesBetween } from './recurrence';

describe('occurrenceDate', () => {
  it('keeps the reference day each month', () => {
    expect(occurrenceDate('2026-01-05', 'monthly', 0)).toBe('2026-01-05');
    expect(occurrenceDate('2026-01-05', 'monthly', 11)).toBe('2026-12-05');
    expect(occurrenceDate('2026-01-05', 'monthly', 12)).toBe('2027-01-05');
  });

  it('takes the last day of a month too short for the reference day, without drifting', () => {
    expect(occurrenceDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
    expect(occurrenceDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
    expect(occurrenceDate('2026-01-31', 'monthly', 3)).toBe('2026-04-30');
  });

  it('steps by seven days when weekly, across month and year ends', () => {
    expect(occurrenceDate('2026-12-28', 'weekly', 1)).toBe('2027-01-04');
  });

  it('repeats on the same date each year, Feb 29 falling back to Feb 28', () => {
    expect(occurrenceDate('2026-03-12', 'yearly', 2)).toBe('2028-03-12');
    expect(occurrenceDate('2024-02-29', 'yearly', 1)).toBe('2025-02-28');
    expect(occurrenceDate('2024-02-29', 'yearly', 4)).toBe('2028-02-29');
  });
});

describe('occurrencesBetween', () => {
  it('lists the occurrences on a half-open range', () => {
    expect(occurrencesBetween('2026-01-25', 'monthly', '2026-09-20', '2026-11-01')).toEqual([
      '2026-09-25',
      '2026-10-25',
    ]);
    expect(occurrencesBetween('2026-01-25', 'monthly', '2026-09-25', '2026-10-25')).toEqual(['2026-09-25']);
  });

  it('starts at the reference date when the range begins before it', () => {
    expect(occurrencesBetween('2026-10-05', 'monthly', '2026-09-20', '2026-12-01')).toEqual([
      '2026-10-05',
      '2026-11-05',
    ]);
  });

  it('finds weekly and yearly occurrences a long way from the reference date', () => {
    // 2026-01-05 is a Monday; Mondays from Sept 21 to Oct 11.
    expect(occurrencesBetween('2026-01-05', 'weekly', '2026-09-20', '2026-10-12')).toEqual([
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
    ]);
    expect(occurrencesBetween('2020-10-05', 'yearly', '2026-09-20', '2026-11-01')).toEqual(['2026-10-05']);
    expect(occurrencesBetween('2020-10-05', 'yearly', '2026-10-06', '2027-01-01')).toEqual([]);
  });
});

describe('nextOccurrenceOnOrAfter', () => {
  it('counts an occurrence falling on the day itself', () => {
    expect(nextOccurrenceOnOrAfter('2026-01-20', 'monthly', '2026-09-20')).toBe('2026-09-20');
    expect(nextOccurrenceOnOrAfter('2026-01-05', 'monthly', '2026-09-20')).toBe('2026-10-05');
  });

  it('is the reference date for a rule that has not begun', () => {
    expect(nextOccurrenceOnOrAfter('2027-02-01', 'weekly', '2026-09-20')).toBe('2027-02-01');
  });
});
