import type { BudgetProgress } from '../services/dataService';
import {
  describeBudget,
  describeMonthProgress,
  formatBudgetRatio,
  monthElapsedFraction,
} from './budgetCopy';
import { formatAmount } from './formatAmount';

const SEPT = { year: 2026, month: 8 };

function progress(overrides: Partial<BudgetProgress>): BudgetProgress {
  return {
    budget: {
      id: 1,
      categoryId: 1,
      categoryName: 'Restaurant',
      amount: 100,
      carryOver: false,
      startMonth: SEPT,
    },
    spent: 0,
    carriedOver: 0,
    ceiling: 100,
    remaining: 100,
    fillRatio: 0,
    exceeded: false,
    watch: false,
    ...overrides,
  };
}

describe('monthElapsedFraction', () => {
  it('is 0 before the month and 1 after it', () => {
    expect(monthElapsedFraction(new Date(2026, 7, 31), SEPT)).toBe(0);
    expect(monthElapsedFraction(new Date(2026, 9, 1), SEPT)).toBe(1);
  });

  it('is the share of days gone by within the month', () => {
    expect(monthElapsedFraction(new Date(2026, 8, 15), SEPT)).toBe(0.5); // 15 of 30
    expect(monthElapsedFraction(new Date(2026, 8, 30), SEPT)).toBe(1);
  });
});

describe('describeMonthProgress', () => {
  it('compares how much of the month is gone with how much of the plan is used', () => {
    expect(describeMonthProgress(80, 120, 20 / 30)).toBe(
      'Environ deux tiers du mois écoulé, autant du prévu utilisé.'
    );
    expect(describeMonthProgress(30, 120, 0.5)).toBe(
      'Environ la moitié du mois écoulé, environ un quart du prévu utilisé.'
    );
  });

  it('says when the month is over, or has not begun', () => {
    expect(describeMonthProgress(60, 120, 1)).toBe('Mois terminé, environ la moitié du prévu utilisé.');
    expect(describeMonthProgress(0, 120, 0)).toBe('Le mois n’a pas encore commencé.');
  });

  it('never blames when the plan is used up', () => {
    const note = describeMonthProgress(150, 120, 0.5);
    expect(note).toBe('Environ la moitié du mois écoulé, le prévu est déjà utilisé, et un peu plus.');
    expect(note).not.toMatch(/dépass|attention|!/i);
  });
});

describe('describeBudget', () => {
  it('states what is left while within the ceiling', () => {
    expect(describeBudget(progress({ remaining: 42 }), SEPT)).toBe(
      `Il reste ${formatAmount(42)} pour ce mois-ci.`
    );
  });

  it('mentions the carried balance, with the right elision for the month name', () => {
    expect(describeBudget(progress({ remaining: 42, carriedOver: 10 }), SEPT)).toContain(
      'Le reliquat d’août est inclus.'
    );
    expect(describeBudget(progress({ remaining: 42, carriedOver: 10 }), { year: 2026, month: 9 })).toContain(
      'Le reliquat de septembre est inclus.'
    );
    expect(describeBudget(progress({ remaining: 42, carriedOver: 10 }), { year: 2026, month: 0 })).toContain(
      'Le reliquat de décembre est inclus.'
    );
  });

  it('words an overrun softly, and credits the carried balance when there is one', () => {
    const over = progress({ exceeded: true, remaining: -18, spent: 138, ceiling: 120 });
    expect(describeBudget(over, SEPT)).toBe('Un peu plus qu’en général ce mois-ci.');
    expect(describeBudget({ ...over, carriedOver: 20 }, SEPT)).toBe(
      'Un peu plus qu’en général ce mois-ci — le reliquat d’août couvre une partie.'
    );
    expect(describeBudget(over, SEPT)).not.toMatch(/dépass|attention|!/i);
  });
});

describe('formatBudgetRatio', () => {
  it('drops the decimals of whole amounts', () => {
    expect(formatBudgetRatio(138, 120)).toBe('138 / 120 €');
  });

  it('keeps cents when there are some', () => {
    expect(formatBudgetRatio(138.5, 120)).toBe('138,50 / 120 €');
  });

  it('separates thousands', () => {
    expect(formatBudgetRatio(1250, 2000)).toBe('1 250 / 2 000 €');
  });
});
