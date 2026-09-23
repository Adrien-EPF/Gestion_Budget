import type { BudgetMonth } from '../services/dataService';
import { describeBudgetMonth, summarizeBudgetYear } from './budgetYearCopy';
import { formatAmount } from './formatAmount';

const realized = (month: number, spent: number, ceiling = 120, carriedOver = 0): BudgetMonth => ({
  month,
  state: 'realized',
  spent,
  ceiling,
  carriedOver,
});
const upcoming = (month: number, ceiling = 120, carriedOver = 0): BudgetMonth => ({
  month,
  state: 'upcoming',
  spent: 0,
  ceiling,
  carriedOver,
});

describe('budgetYearCopy — résumé de l’année', () => {
  it('sums up a year kept within the plan with what was left unspent', () => {
    const months = [realized(0, 100), realized(1, 90), upcoming(2)];

    expect(summarizeBudgetYear(months, { amount: 120, carryOver: false })).toEqual({
      title: 'Dans le prévu tous les mois',
      detail: `${formatAmount(50)} non dépensés sur l’année.`,
    });
  });

  it('counts what was planned, not the carried amounts twice, when carry-over is on', () => {
    const months = [realized(0, 100), realized(1, 130, 140, 20)];

    expect(summarizeBudgetYear(months, { amount: 120, carryOver: true }).detail).toBe(
      `${formatAmount(10)} non dépensés sur l’année, reportés au fil des mois.`
    );
  });

  it('names the months a little over the plan, out of the months gone by', () => {
    const months = [realized(5, 100), realized(6, 130), realized(7, 125), realized(8, 121), upcoming(9)];

    expect(summarizeBudgetYear(months, { amount: 120, carryOver: false })).toEqual({
      title: 'Dans le prévu 1 mois sur 4',
      detail: '3 mois un peu au-dessus : juillet, août, septembre.',
    });
    expect(summarizeBudgetYear([realized(0, 10), realized(1, 130)], { amount: 120, carryOver: false }).detail).toBe(
      'Un mois un peu au-dessus : février.'
    );
  });

  it('says so when nothing was spent in the category', () => {
    expect(summarizeBudgetYear([realized(0, 0), upcoming(1)], { amount: 120, carryOver: false })).toEqual({
      title: 'Rien de dépensé ici cette année.',
      detail: null,
    });
  });
});

describe('budgetYearCopy — lecture du mois', () => {
  it('states a month a little over the plan, without alarm', () => {
    expect(describeBudgetMonth(realized(8, 138), false)).toEqual({
      pill: 'over',
      amounts: `${formatAmount(138)} dépensés sur ${formatAmount(120)} prévus`,
      carried: null,
      message: `Un peu plus que prévu ce mois-ci (${formatAmount(18, { signed: true })}).`,
    });
  });

  it('tells what was left, and where it went with carry-over', () => {
    expect(describeBudgetMonth(realized(8, 78), false).message).toBe(`Il est resté ${formatAmount(42)}.`);
    const carried = describeBudgetMonth(realized(8, 98, 140, 20), true);
    expect(carried.pill).toBe('ok');
    expect(carried.carried).toBe(`dont ${formatAmount(20)} de reliquat d’août`);
    expect(carried.message).toBe(`Il est resté ${formatAmount(42)}, reportés sur octobre.`);
    expect(describeBudgetMonth(realized(11, 100), true).message).toBe(`Il est resté ${formatAmount(20)}, reportés sur janvier.`);
  });

  it('shows a month to come by its plan only', () => {
    expect(describeBudgetMonth(upcoming(9), false)).toEqual({
      pill: 'upcoming',
      amounts: `${formatAmount(120)} prévus`,
      carried: null,
      message: 'Mois pas encore commencé.',
    });
  });

  it('has nothing to read before the budget started', () => {
    expect(describeBudgetMonth({ month: 2, state: 'not_started', spent: 0, ceiling: 0, carriedOver: 0 }, false)).toEqual({
      pill: null,
      amounts: null,
      carried: null,
      message: 'Ce budget n’avait pas encore commencé.',
    });
  });
});
