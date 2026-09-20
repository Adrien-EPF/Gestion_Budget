import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService, MonthRef, TransactionStatus } from './dataService';

describe('dataService — budgets', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let accountId: number;
  const cat: Record<string, number> = {};
  const JUL: MonthRef = { year: 2026, month: 6 };
  const AUG: MonthRef = { year: 2026, month: 7 };
  const SEPT: MonthRef = { year: 2026, month: 8 };

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    accountId = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    for (const category of await dataService.listCategories()) cat[category.name] = category.id;
  });

  afterEach(() => close());

  const spend = (
    category: string,
    amount: number,
    date = '2026-09-10',
    status: TransactionStatus = 'non_pointe',
    onAccount = accountId
  ) =>
    dataService.createTransaction({
      accountId: onAccount,
      operationDate: date,
      amount: -amount,
      categoryId: cat[category],
      status,
    });

  const restaurant = async (month: MonthRef) => {
    const { budgets } = await dataService.getBudgetOverview(month);
    return budgets.find((b) => b.budget.categoryName === 'Restaurant')!;
  };

  describe('creating', () => {
    it('creates a monthly budget, carry-over off by default', async () => {
      const budget = await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 120,
        startMonth: SEPT,
      });
      expect(budget).toMatchObject({
        categoryId: cat['Restaurant'],
        categoryName: 'Restaurant',
        amount: 120,
        carryOver: false,
        startMonth: SEPT,
      });
      const { budgets } = await dataService.getBudgetOverview(SEPT);
      expect(budgets.map((b) => b.budget)).toEqual([budget]);
    });

    it('starts in the current month when no start is given', async () => {
      const now = new Date();
      const budget = await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 50 });
      expect(budget.startMonth).toEqual({ year: now.getFullYear(), month: now.getMonth() });
    });

    it('refuses a second budget on the same category, and a ceiling of zero or less', async () => {
      await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 120, startMonth: SEPT });
      await expect(
        dataService.createBudget({ categoryId: cat['Restaurant'], amount: 50, startMonth: SEPT })
      ).rejects.toThrow(/already has a budget/);
      await expect(
        dataService.createBudget({ categoryId: cat['Loisir'], amount: 0, startMonth: SEPT })
      ).rejects.toThrow(/greater than zero/);
      await expect(
        dataService.createBudget({ categoryId: 9999, amount: 10, startMonth: SEPT })
      ).rejects.toThrow(/does not exist/);
    });

    it('offers only the visible expense categories that have no budget yet', async () => {
      await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 120, startMonth: SEPT });
      const names = (await dataService.listCategoriesWithoutBudget()).map((c) => c.name);
      expect(names).toContain('Loisir');
      expect(names).toContain('Cadeaux'); // kind "both"
      expect(names).not.toContain('Restaurant');
      expect(names).not.toContain('Salaire/Intérêts/Avantages'); // income only
    });

    it('does not show a budget in months before it started', async () => {
      await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 120, startMonth: SEPT });
      expect((await dataService.getBudgetOverview(AUG)).budgets).toEqual([]);
    });
  });

  describe('consumption', () => {
    beforeEach(async () => {
      await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 100, startMonth: JUL });
    });

    it('sums the month’s spending in the budget’s category, Non Pointé and Pointé alike', async () => {
      await spend('Restaurant', 30, '2026-09-02', 'non_pointe');
      await spend('Restaurant', 20, '2026-09-30', 'pointe');
      const progress = await restaurant(SEPT);
      expect(progress.spent).toBe(50);
      expect(progress.ceiling).toBe(100);
      expect(progress.remaining).toBe(50);
    });

    it('leaves out Prévision, Flux comptable, other categories, other months and archived accounts', async () => {
      const other = (await dataService.createAccount({ name: 'Archivé', initialBalance: 0 })).id;
      await spend('Restaurant', 10);
      await spend('Restaurant', 1000, '2026-09-10', 'prevision');
      await spend('Restaurant', 1000, '2026-09-10', 'flux_comptable');
      await spend('Loisir', 1000);
      await spend('Restaurant', 1000, '2026-08-31');
      await spend('Restaurant', 1000, '2026-10-01');
      await spend('Restaurant', 1000, '2026-09-10', 'non_pointe', other);
      await dataService.archiveAccount(other);

      expect((await restaurant(SEPT)).spent).toBe(10);
    });

    it('lets a refund in the category offset spending, without going below zero', async () => {
      await spend('Restaurant', 40);
      await dataService.createTransaction({
        accountId,
        operationDate: '2026-09-11',
        amount: 15,
        categoryId: cat['Restaurant'],
      });
      expect((await restaurant(SEPT)).spent).toBe(25);

      await dataService.createTransaction({
        accountId,
        operationDate: '2026-09-12',
        amount: 500,
        categoryId: cat['Restaurant'],
      });
      expect((await restaurant(SEPT)).spent).toBe(0);
    });

    it('counts a split transaction through its portions’ categories, not its principal one', async () => {
      await dataService.createTransaction({
        accountId,
        operationDate: '2026-09-11',
        amount: -28.5,
        categoryId: cat['Restaurant'],
        splits: [
          { categoryId: cat['Restaurant'], amount: -14.25 },
          { categoryId: cat['Avancé'], amount: -14.25, advanced: true },
        ],
      });
      expect((await restaurant(SEPT)).spent).toBe(14.25);
    });

    it('measures each month on its own', async () => {
      await spend('Restaurant', 30, '2026-08-15');
      await spend('Restaurant', 45, '2026-09-15');
      expect((await restaurant(AUG)).spent).toBe(30);
      expect((await restaurant(SEPT)).spent).toBe(45);
    });
  });

  describe('bar tint and exceeding', () => {
    beforeEach(async () => {
      await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 100, startMonth: SEPT });
    });

    it('stays « ok » up to and including 85 % of the ceiling', async () => {
      await spend('Restaurant', 85);
      const progress = await restaurant(SEPT);
      expect(progress.watch).toBe(false);
      expect(progress.exceeded).toBe(false);
      expect(progress.fillRatio).toBe(0.85);
    });

    it('switches to « à surveiller » just past 85 %', async () => {
      await spend('Restaurant', 85.01);
      const progress = await restaurant(SEPT);
      expect(progress.watch).toBe(true);
      expect(progress.exceeded).toBe(false);
    });

    it('is not exceeded at exactly the ceiling, and is once past it', async () => {
      await spend('Restaurant', 100);
      expect((await restaurant(SEPT)).exceeded).toBe(false);
      await spend('Restaurant', 38);
      const progress = await restaurant(SEPT);
      expect(progress.exceeded).toBe(true);
      expect(progress.watch).toBe(true);
      expect(progress.remaining).toBe(-38);
    });

    it('caps the fill at 100 % even when exceeded', async () => {
      await spend('Restaurant', 250);
      expect((await restaurant(SEPT)).fillRatio).toBe(1);
    });

    it('starts empty and « ok »', async () => {
      const progress = await restaurant(SEPT);
      expect(progress).toMatchObject({ spent: 0, fillRatio: 0, watch: false, exceeded: false });
    });
  });

  describe('carry-over of what was left unspent', () => {
    it('adds last month’s unspent balance to this month’s ceiling when on', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: AUG,
      });
      await spend('Restaurant', 60, '2026-08-10');

      const progress = await restaurant(SEPT);
      expect(progress.carriedOver).toBe(40);
      expect(progress.ceiling).toBe(140);
    });

    it('does nothing when off', async () => {
      await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 100, startMonth: AUG });
      await spend('Restaurant', 60, '2026-08-10');

      const progress = await restaurant(SEPT);
      expect(progress.carriedOver).toBe(0);
      expect(progress.ceiling).toBe(100);
    });

    it('is independent for each budget', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: AUG,
      });
      await dataService.createBudget({ categoryId: cat['Loisir'], amount: 100, startMonth: AUG });
      await spend('Restaurant', 60, '2026-08-10');
      await spend('Loisir', 60, '2026-08-10');

      const { budgets } = await dataService.getBudgetOverview(SEPT);
      const ceiling = (name: string) => budgets.find((b) => b.budget.categoryName === name)!.ceiling;
      expect(ceiling('Restaurant')).toBe(140);
      expect(ceiling('Loisir')).toBe(100);
    });

    it('can be switched on and off, and the new setting applies right away', async () => {
      const { id } = await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        startMonth: AUG,
      });
      await spend('Restaurant', 60, '2026-08-10');

      await dataService.setBudgetCarryOver(id, true);
      expect((await restaurant(SEPT)).ceiling).toBe(140);
      expect((await restaurant(SEPT)).budget.carryOver).toBe(true);

      await dataService.setBudgetCarryOver(id, false);
      expect((await restaurant(SEPT)).ceiling).toBe(100);
    });

    it('accumulates over consecutive months: what carried into a month and was not used carries on', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: JUL,
      });
      await spend('Restaurant', 70, '2026-07-10'); // 30 left -> August ceiling 130
      await spend('Restaurant', 50, '2026-08-10'); // 80 left -> September ceiling 180

      expect((await restaurant(AUG)).ceiling).toBe(130);
      const sept = await restaurant(SEPT);
      expect(sept.carriedOver).toBe(80);
      expect(sept.ceiling).toBe(180);
    });

    it('never lets an overspent month shrink the next one', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: AUG,
      });
      await spend('Restaurant', 160, '2026-08-10');

      const sept = await restaurant(SEPT);
      expect(sept.carriedOver).toBe(0);
      expect(sept.ceiling).toBe(100);
    });

    it('does not reach back before the budget existed', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: SEPT,
      });
      await spend('Restaurant', 10, '2026-08-10'); // before the budget: irrelevant

      const sept = await restaurant(SEPT);
      expect(sept.carriedOver).toBe(0);
      expect(sept.ceiling).toBe(100);
    });

    it('carries across a year boundary', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: { year: 2026, month: 11 },
      });
      await spend('Restaurant', 25, '2026-12-20');
      const january = await restaurant({ year: 2027, month: 0 });
      expect(january.carriedOver).toBe(75);
    });

    it('feeds the tint: a carried balance raises the ceiling the 85 % is measured on', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: AUG,
      });
      await spend('Restaurant', 50, '2026-08-10'); // 50 left -> September ceiling 150
      await spend('Restaurant', 100, '2026-09-10');

      const sept = await restaurant(SEPT);
      expect(sept.exceeded).toBe(false);
      expect(sept.watch).toBe(false);
    });
  });

  describe('overview totals', () => {
    it('sums what was spent and what was planned, carry-over included', async () => {
      await dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        carryOver: true,
        startMonth: AUG,
      });
      await dataService.createBudget({ categoryId: cat['Loisir'], amount: 50, startMonth: AUG });
      await spend('Restaurant', 30, '2026-08-10');
      await spend('Restaurant', 20, '2026-09-10');
      await spend('Loisir', 15, '2026-09-10');

      const overview = await dataService.getBudgetOverview(SEPT);
      expect(overview.spent).toBe(35);
      expect(overview.planned).toBe(220); // 170 + 50
    });

    it('is empty without budgets', async () => {
      expect(await dataService.getBudgetOverview(SEPT)).toEqual({ budgets: [], spent: 0, planned: 0 });
    });

    it('lists budgets in category order', async () => {
      await dataService.createBudget({ categoryId: cat['Loisir'], amount: 50, startMonth: SEPT });
      await dataService.createBudget({ categoryId: cat['Alimentation/Entretien essentiel'], amount: 300, startMonth: SEPT });
      const names = (await dataService.getBudgetOverview(SEPT)).budgets.map((b) => b.budget.categoryName);
      expect(names).toEqual(['Alimentation/Entretien essentiel', 'Loisir']);
    });
  });
});
