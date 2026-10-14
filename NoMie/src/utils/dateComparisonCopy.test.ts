import type { DateComparison } from '../services/dataService';
import { describeComparedAmounts, describeDateComparison } from './dateComparisonCopy';

const comparison = (overrides: Partial<DateComparison>): DateComparison => ({
  day: 14,
  monthsCompared: 3,
  total: { current: 420, average: 510 },
  byCategory: [],
  byImportance: [],
  ...overrides,
});

const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('dateComparisonCopy', () => {
  it('states the comparison as a fact', () => {
    expect(plain(describeDateComparison(comparison({})))).toBe('420 € au 14, contre 510 € en moyenne à cette date');
  });

  it('says how many months stand behind a shorter history', () => {
    expect(plain(describeDateComparison(comparison({ monthsCompared: 2 })))).toBe(
      '420 € au 14, contre 510 € en moyenne à cette date (sur 2 mois)'
    );
  });

  it('writes the first of the month in full', () => {
    expect(plain(describeDateComparison(comparison({ day: 1 })))).toContain('au 1er,');
  });

  it('never judges, whichever way the numbers go', () => {
    for (const total of [{ current: 900, average: 100 }, { current: 10, average: 500 }]) {
      expect(describeDateComparison(comparison({ total }))).not.toMatch(/!|trop|attention|dépass|économ|bravo/i);
    }
  });

  it('puts two amounts side by side', () => {
    expect(plain(describeComparedAmounts({ current: 60, average: 45 }))).toBe('60 € contre 45 €');
  });
});
