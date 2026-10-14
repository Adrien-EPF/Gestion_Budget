import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService, Importance, TransactionStatus } from './dataService';

describe('dataService — importance : budgets et répartition', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let accountId: number;
  const cat: Record<string, number> = {};
  const SEPT = { year: 2026, month: 8 };

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    accountId = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    for (const category of await dataService.listCategories()) cat[category.name] = category.id;
  });

  afterEach(() => close());

  const spend = (
    amount: number,
    importance: Importance,
    extra: { status?: TransactionStatus; offBalance?: boolean; date?: string; category?: string } = {}
  ) =>
    dataService.createTransaction({
      accountId,
      operationDate: extra.date ?? '2026-09-10',
      amount: -amount,
      categoryId: cat[extra.category ?? 'Loisir'],
      importance,
      status: extra.status,
      offBalance: extra.offBalance,
    });

  const superflu = async (month = SEPT) => {
    const { budgets } = await dataService.getBudgetOverview(month);
    return budgets.find((b) => b.budget.importance === 'secondaire_superflu')!;
  };

  describe('creating an importance budget', () => {
    it('is monthly, on one level, with the level as its name', async () => {
      const budget = await dataService.createBudget({
        importance: 'secondaire_superflu',
        amount: 150,
        startMonth: SEPT,
      });
      expect(budget).toMatchObject({
        categoryId: null,
        importance: 'secondaire_superflu',
        name: 'Secondaire superflu',
        amount: 150,
        carryOver: false,
        startMonth: SEPT,
      });
      expect((await dataService.getBudgetOverview(SEPT)).budgets.map((b) => b.budget)).toEqual([budget]);
    });

    it('is unique per level, next to the category budgets', async () => {
      await dataService.createBudget({ importance: 'essentiel', amount: 500, startMonth: SEPT });
      await dataService.createBudget({ categoryId: cat['Loisir'], amount: 80, startMonth: SEPT });
      await dataService.createBudget({ importance: 'exceptionnel', amount: 200, startMonth: SEPT });

      await expect(dataService.createBudget({ importance: 'essentiel', amount: 10 })).rejects.toThrow();
      expect((await dataService.listImportancesWithoutBudget()).map((i) => i)).toEqual([
        'secondaire_important',
        'secondaire_superflu',
      ]);
    });

    it('needs a ceiling above zero, and exactly a category or a level', async () => {
      await expect(dataService.createBudget({ importance: 'essentiel', amount: 0 })).rejects.toThrow();
      await expect(
        dataService.createBudget({ importance: 'essentiel', categoryId: cat['Loisir'], amount: 10 })
      ).rejects.toThrow();
      await expect(dataService.createBudget({ amount: 10 })).rejects.toThrow();
    });

    it('lists category budgets first, then the levels from Essentiel to Exceptionnel', async () => {
      await dataService.createBudget({ importance: 'exceptionnel', amount: 1, startMonth: SEPT });
      await dataService.createBudget({ importance: 'essentiel', amount: 1, startMonth: SEPT });
      await dataService.createBudget({ categoryId: cat['Restaurant'], amount: 1, startMonth: SEPT });

      const names = (await dataService.getBudgetOverview(SEPT)).budgets.map((b) => b.budget.name);
      expect(names).toEqual(['Restaurant', 'Essentiel', 'Exceptionnel']);
    });
  });

  describe('consumption follows the bilan comptable', () => {
    beforeEach(() => dataService.createBudget({ importance: 'secondaire_superflu', amount: 150, startMonth: SEPT }));

    it('counts the expenses of that level, whatever their category', async () => {
      await spend(40, 'secondaire_superflu', { category: 'Loisir' });
      await spend(25, 'secondaire_superflu', { category: 'Restaurant' });
      await spend(99, 'essentiel');

      const progress = await superflu();
      expect(progress.spent).toBe(65);
      expect(progress.ceiling).toBe(150);
      expect(progress.remaining).toBe(85);
    });

    it('includes a Fantôme and leaves out Hors bilan and Prévision', async () => {
      await spend(10, 'secondaire_superflu', { status: 'fantome' });
      await spend(20, 'secondaire_superflu', { status: 'pointe' });
      await spend(30, 'secondaire_superflu', { offBalance: true });
      await spend(40, 'secondaire_superflu', { status: 'prevision' });

      expect((await superflu()).spent).toBe(30);
    });

    it('stays in its month, and can carry what is left over', async () => {
      await dataService.setBudgetCarryOver((await superflu()).budget.id, true);
      await spend(100, 'secondaire_superflu', { date: '2026-09-05' });
      await spend(30, 'secondaire_superflu', { date: '2026-10-05' });

      const october = await superflu({ year: 2026, month: 9 });
      expect(october.spent).toBe(30);
      expect(october.carriedOver).toBe(50);
      expect(october.ceiling).toBe(200);
    });

    it('shows over the year like a category budget', async () => {
      await spend(60, 'secondaire_superflu', { date: '2026-09-05' });

      const year = await dataService.getBudgetYear(2026);
      const months = year.budgets.find((b) => b.budget.importance === 'secondaire_superflu')!.months;
      expect(months[8]).toMatchObject({ month: 8, spent: 60, ceiling: 150 });
    });
  });

  describe('répartition par importance', () => {
    it('adds up the bilan expenses of the month per level, always the four levels', async () => {
      await spend(30, 'essentiel');
      await spend(20, 'essentiel', { category: 'Restaurant' });
      await spend(15, 'secondaire_important');
      await spend(5, 'secondaire_superflu', { status: 'fantome' });
      await spend(500, 'exceptionnel', { offBalance: true });
      await spend(70, 'secondaire_superflu', { status: 'prevision' });
      await spend(9, 'essentiel', { date: '2026-10-01' });

      expect(await dataService.getImportanceBreakdown({ month: SEPT })).toEqual([
        { importance: 'essentiel', amount: 50 },
        { importance: 'secondaire_important', amount: 15 },
        { importance: 'secondaire_superflu', amount: 5 },
        { importance: 'exceptionnel', amount: 0 },
      ]);
    });

    it('covers the whole year, on every account', async () => {
      const archived = (await dataService.createAccount({ name: 'Ancien', initialBalance: 0 })).id;
      await spend(10, 'essentiel', { date: '2026-01-15' });
      await spend(20, 'essentiel', { date: '2026-09-15' });
      await dataService.createTransaction({
        accountId: archived,
        operationDate: '2026-03-01',
        amount: -7,
        importance: 'exceptionnel',
      });
      await dataService.archiveAccount(archived);
      await spend(99, 'essentiel', { date: '2025-12-31' });

      const year = await dataService.getImportanceBreakdown({ year: 2026 });
      expect(year.map((s) => s.amount)).toEqual([30, 0, 0, 7]);
    });
  });

  it('exports an importance budget by its level in the CSV', async () => {
    await dataService.createBudget({ importance: 'secondaire_superflu', amount: 150, startMonth: SEPT });
    const files = await dataService.exportCsv();
    const budgets = files.find((f) => f.filename === 'budgets.csv')!.content;
    expect(budgets).toContain('Secondaire superflu');
  });

  it('restores an importance budget from a backup', async () => {
    await dataService.createBudget({ importance: 'secondaire_superflu', amount: 150, startMonth: SEPT });
    const backup = await dataService.createBackup();
    await dataService.restoreBackup(JSON.stringify(backup));

    expect((await dataService.getBudgetOverview(SEPT)).budgets[0].budget.importance).toBe('secondaire_superflu');
  });
});
