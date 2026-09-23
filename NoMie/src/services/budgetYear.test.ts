import { createTestDataService } from '../test-utils/createTestDataService';
import type { BudgetMonth, DataService, MonthRef } from './dataService';

describe('dataService — budget prévu vs réalisé mois par mois (§6.7)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let accountId: number;
  const cat: Record<string, number> = {};

  beforeEach(async () => {
    // Mid-September 2026.
    ({ dataService, close } = await createTestDataService({ now: () => new Date(2026, 8, 15) }));
    accountId = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    for (const category of await dataService.listCategories()) cat[category.name] = category.id;
  });

  afterEach(() => close());

  const spend = (category: string, amount: number, date: string) =>
    dataService.createTransaction({
      accountId,
      operationDate: date,
      amount: -amount,
      categoryId: cat[category],
      status: 'pointe',
    });

  const budget = (category: string, amount: number, startMonth: MonthRef, carryOver = false) =>
    dataService.createBudget({ categoryId: cat[category], amount, startMonth, carryOver });

  const months = async (year: number, category = 'Restaurant') => {
    const overview = await dataService.getBudgetYear(year);
    return overview.budgets.find((b) => b.budget.categoryName === category)!.months;
  };
  const pick = (list: BudgetMonth[], ...keys: (keyof BudgetMonth)[]) =>
    list.map((m) => Object.fromEntries(keys.map((k) => [k, m[k]])));

  it('sets each month of a past year against its ceiling', async () => {
    await budget('Restaurant', 100, { year: 2025, month: 0 });
    await spend('Restaurant', 80, '2025-01-12');
    await spend('Restaurant', 150, '2025-03-02');
    await spend('Restaurant', 999, '2026-01-02');

    const overview = await dataService.getBudgetYear(2025);
    const restaurant = await months(2025);

    expect(overview.lastMonth).toBe(11);
    expect(restaurant).toHaveLength(12);
    expect(restaurant.every((m) => m.state === 'realized' && m.ceiling === 100 && m.carriedOver === 0)).toBe(true);
    expect(restaurant.map((m) => m.spent)).toEqual([80, 0, 150, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('raises a month’s ceiling by what was left the month before, when carry-over is on', async () => {
    await budget('Restaurant', 120, { year: 2024, month: 11 }, true);
    await spend('Restaurant', 100, '2024-12-10'); // 20 left, carried into January
    await spend('Restaurant', 110, '2025-01-10'); // 140 - 110: 30 left
    await spend('Restaurant', 200, '2025-02-10'); // over: nothing carried

    const [january, february, march] = await months(2025);

    expect([january, february, march].map(({ spent, ceiling, carriedOver }) => ({ spent, ceiling, carriedOver }))).toEqual([
      { spent: 110, ceiling: 140, carriedOver: 20 },
      { spent: 200, ceiling: 150, carriedOver: 30 },
      { spent: 0, ceiling: 120, carriedOver: 0 },
    ]);
  });

  it('leaves the months to come unspent, carrying only what the current month leaves', async () => {
    await budget('Restaurant', 100, { year: 2026, month: 0 }, true);
    await spend('Restaurant', 60, '2026-09-03');

    const restaurant = await months(2026);

    expect(pick(restaurant.slice(8), 'state', 'ceiling', 'carriedOver')).toEqual([
      { state: 'realized', ceiling: 900, carriedOver: 800 },
      { state: 'upcoming', ceiling: 940, carriedOver: 840 },
      { state: 'upcoming', ceiling: 100, carriedOver: 0 },
      { state: 'upcoming', ceiling: 100, carriedOver: 0 },
    ]);
  });

  it('has no ceiling before the month a budget started', async () => {
    await budget('Loisir', 50, { year: 2026, month: 5 });
    await spend('Loisir', 99, '2026-05-20');
    await spend('Loisir', 30, '2026-06-20');
    await spend('Loisir', 20, '2026-07-20');

    const loisir = await months(2026, 'Loisir');

    expect(pick(loisir.slice(4, 7), 'state', 'spent', 'ceiling')).toEqual([
      { state: 'not_started', spent: 0, ceiling: 0 },
      { state: 'realized', spent: 30, ceiling: 50 },
      { state: 'realized', spent: 20, ceiling: 50 },
    ]);
  });

  it('shows a year to come as ceilings only, and nothing before the first budget', async () => {
    await budget('Restaurant', 100, { year: 2026, month: 0 });

    const next = await dataService.getBudgetYear(2027);
    expect(next.lastMonth).toBeNull();
    expect(next.budgets[0].months.every((m) => m.state === 'upcoming' && m.ceiling === 100)).toBe(true);
    expect(await dataService.getBudgetYear(2025)).toEqual({ lastMonth: 11, budgets: [] });
  });
});
