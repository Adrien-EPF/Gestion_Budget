import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService, MonthRef } from './dataService';

describe('dataService — budget prévu vs réalisé sur l’année (#29)', () => {
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

  it('sets a past year’s twelve monthly ceilings against what was spent', async () => {
    await budget('Restaurant', 100, { year: 2025, month: 0 });
    await spend('Restaurant', 80, '2025-01-12');
    await spend('Restaurant', 150, '2025-03-02');
    await spend('Restaurant', 999, '2026-01-02');

    const overview = await dataService.getBudgetYearComparison(2025);

    expect(overview.lastMonth).toBe(11);
    expect(overview.budgets).toEqual([
      expect.objectContaining({ planned: 1200, spent: 230, budget: expect.objectContaining({ categoryName: 'Restaurant' }) }),
    ]);
  });

  it('stops the current year at the current month, from January for a budget set up earlier', async () => {
    await budget('Restaurant', 100, { year: 2025, month: 3 });
    await spend('Restaurant', 50, '2026-09-03');
    await spend('Restaurant', 40, '2026-10-01');

    const overview = await dataService.getBudgetYearComparison(2026);

    expect(overview.lastMonth).toBe(8);
    expect(overview.budgets[0]).toMatchObject({ planned: 900, spent: 50 });
  });

  it('counts a budget from its first month only', async () => {
    await budget('Loisir', 50, { year: 2026, month: 5 });
    await spend('Loisir', 30, '2026-05-20');
    await spend('Loisir', 20, '2026-06-20');

    const [loisir] = (await dataService.getBudgetYearComparison(2026)).budgets;

    expect(loisir).toMatchObject({ planned: 200, spent: 20 });
  });

  it('plans the monthly ceiling only: carry-over moves money between months, it adds none', async () => {
    await budget('Restaurant', 100, { year: 2025, month: 10 }, true);

    const [restaurant] = (await dataService.getBudgetYearComparison(2025)).budgets;

    expect(restaurant).toMatchObject({ planned: 200, spent: 0 });
  });

  it('flags a budget « à surveiller » past 85 % of its plan, and exceeded past it', async () => {
    await budget('Restaurant', 100, { year: 2025, month: 11 });
    await budget('Loisir', 100, { year: 2025, month: 11 });
    await budget('Culture', 100, { year: 2025, month: 11 });
    await spend('Restaurant', 80, '2025-12-05');
    await spend('Loisir', 90, '2025-12-05');
    await spend('Culture', 120, '2025-12-05');

    const flags = Object.fromEntries(
      (await dataService.getBudgetYearComparison(2025)).budgets.map((b) => [
        b.budget.categoryName,
        { watch: b.watch, exceeded: b.exceeded },
      ])
    );

    expect(flags).toEqual({
      Loisir: { watch: true, exceeded: false },
      Restaurant: { watch: false, exceeded: false },
      Culture: { watch: true, exceeded: true },
    });
  });

  it('has nothing to compare for a year yet to come or before any budget', async () => {
    await budget('Restaurant', 100, { year: 2026, month: 0 });

    expect(await dataService.getBudgetYearComparison(2027)).toEqual({ lastMonth: null, budgets: [] });
    expect(await dataService.getBudgetYearComparison(2025)).toEqual({ lastMonth: 11, budgets: [] });
  });
});
