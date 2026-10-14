import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService } from './dataService';

/**
 * The V2 « deux suivis » table (ADR 0004): which operations make the
 * balances (trésorerie) and which make the bilan (comptable).
 */
describe('dataService — trésorerie et bilan comptable', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;
  let livret: number;
  const cat: Record<string, number> = {};
  const SEPT = { year: 2026, month: 8 };

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    courant = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    livret = (await dataService.createAccount({ name: 'Livret A', initialBalance: 500 })).id;
    for (const category of await dataService.listCategories()) cat[category.name] = category.id;
  });

  afterEach(() => close());

  const add = (
    amount: number,
    status: 'non_pointe' | 'pointe' | 'prevision' | 'fantome',
    extra: { categoryId?: number; offBalance?: boolean; date?: string } = {}
  ) =>
    dataService.createTransaction({
      accountId: courant,
      operationDate: extra.date ?? '2026-09-10',
      amount,
      status,
      categoryId: extra.categoryId,
      offBalance: extra.offBalance,
    });

  describe('trésorerie — soldes', () => {
    it('leaves a Fantôme out of both balances, and counts a Prévision in the real one only', async () => {
      await add(-100, 'pointe');
      await add(-30, 'non_pointe');
      await add(2000, 'prevision');
      await add(-250, 'fantome');

      const [summary] = await dataService.listAccountSummaries(SEPT);
      expect(summary.realBalance).toBe(2870);
      expect(summary.pointedBalance).toBe(900);
    });

    it('keeps a Hors bilan operation in the balances', async () => {
      await add(-80, 'pointe', { offBalance: true });

      const [summary] = await dataService.listAccountSummaries(SEPT);
      expect(summary.realBalance).toBe(920);
      expect(summary.pointedBalance).toBe(920);
    });
  });

  describe('bilan comptable — dépenses et recettes', () => {
    it('counts Non pointé, Pointé and Fantôme, and leaves Prévision out', async () => {
      await add(-50, 'non_pointe');
      await add(-30, 'pointe');
      await add(-250, 'fantome', { categoryId: cat['Impôts'] });
      await add(250, 'fantome', { categoryId: cat['Salaire/Intérêts/Avantages'] });
      await add(-999, 'prevision');
      await add(2000, 'pointe');

      const summary = await dataService.getMonthSummary(SEPT);
      expect(summary.expenses).toBe(330);
      expect(summary.income).toBe(2250);
    });

    it('leaves a Hors bilan operation out of the bilan', async () => {
      await add(-80, 'pointe', { offBalance: true });
      await add(-20, 'pointe');

      const summary = await dataService.getMonthSummary(SEPT);
      expect(summary.expenses).toBe(20);
    });

    it('does not count an inter-account movement as an expense, on either side', async () => {
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-12',
        amount: -200,
        categoryId: cat['Mouvement inter-compte'],
        transferToAccountId: livret,
      });

      const summary = await dataService.getMonthSummary(SEPT);
      expect(summary.expenses).toBe(0);
      expect(summary.income).toBe(0);
      const [first, second] = await dataService.listAccountSummaries(SEPT);
      expect(first.realBalance).toBe(800);
      expect(second.realBalance).toBe(700);
    });

    it('leaves only the Avancé portion out, the rest of the operation counts', async () => {
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -28.5,
        splits: [
          { categoryId: cat['Restaurant'], amount: -14.25 },
          { categoryId: cat['Avancé'], amount: -14.25 },
        ],
      });

      const summary = await dataService.getMonthSummary(SEPT);
      expect(summary.expenses).toBe(14.25);
      const [account] = await dataService.listAccountSummaries(SEPT);
      expect(account.realBalance).toBe(971.5);
    });

    it('feeds the Bilan annuel by category with the same rules', async () => {
      await add(-40, 'pointe', { categoryId: cat['Restaurant'] });
      await add(-250, 'fantome', { categoryId: cat['Impôts'] });
      await add(-300, 'pointe', { categoryId: cat['Restaurant'], offBalance: true });

      const flows = await dataService.getCategoryFlowsByMonth(2026);
      expect(flows.map((f) => [f.categoryName, f.totalExpenses])).toEqual([
        ['Restaurant', 40],
        ['Impôts', 250],
      ]);
    });
  });

  describe('Hors bilan automatique', () => {
    it('ticks and locks the box on an Avancé operation', async () => {
      const created = await add(-60, 'non_pointe', { categoryId: cat['Avancé'], offBalance: false });
      expect(created.offBalance).toBe(true);
      expect((await dataService.getTransaction(created.id))?.offBalance).toBe(true);
    });

    it('ticks both legs of an inter-account movement', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-12',
        amount: -200,
        categoryId: cat['Mouvement inter-compte'],
        transferToAccountId: livret,
      });
      const mirror = await dataService.getTransaction(created.mirrorTransactionId as number);
      expect(created.offBalance).toBe(true);
      expect(mirror?.offBalance).toBe(true);
    });

    it('leaves the box free on any other operation', async () => {
      expect((await add(-10, 'pointe')).offBalance).toBe(false);
      expect((await add(-10, 'pointe', { offBalance: true })).offBalance).toBe(true);
    });

    it('refuses a Fantôme marked Hors bilan, which would count nowhere', async () => {
      await expect(add(-250, 'fantome', { offBalance: true })).rejects.toThrow(/Fantôme|fantôme|ghost/i);
    });
  });

  describe('Fantôme', () => {
    it('is never pointed, and never listed among the operations to point', async () => {
      const ghost = await add(-250, 'fantome');
      await dataService.setPointed(ghost.id, true);

      expect((await dataService.getTransaction(ghost.id))?.status).toBe('fantome');
      expect(await dataService.listTransactionsToPoint()).toEqual([]);
      expect(await dataService.countToPoint()).toBe(0);
    });
  });

  describe('importance', () => {
    it('defaults to Essentiel on an expense that counts in the bilan', async () => {
      expect((await add(-12, 'non_pointe')).importance).toBe('essentiel');
    });

    it('keeps the level the caller chose', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-10',
        amount: -12,
        importance: 'secondaire_superflu',
      });
      expect(created.importance).toBe('secondaire_superflu');
    });

    it('stays empty on an income and on a Hors bilan operation', async () => {
      expect((await add(50, 'non_pointe')).importance).toBeNull();
      expect((await add(-12, 'non_pointe', { offBalance: true })).importance).toBeNull();
    });
  });

  describe('catégories système', () => {
    it('marks Avancé and Mouvement inter-compte with a system role, no other', async () => {
      const categories = await dataService.listCategories();
      const roles = categories.filter((c) => c.systemRole !== null).map((c) => [c.name, c.systemRole]);
      expect(roles).toEqual([
        ['Mouvement inter-compte', 'virement'],
        ['Avancé', 'avance'],
      ]);
    });

    it('cannot be hidden, but can be renamed without breaking transfers', async () => {
      await expect(dataService.updateCategory(cat['Avancé'], { hidden: true })).rejects.toThrow();

      await dataService.updateCategory(cat['Mouvement inter-compte'], { name: 'Virement interne' });
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-12',
        amount: -100,
        categoryId: cat['Mouvement inter-compte'],
        transferToAccountId: livret,
      });
      expect(created.mirrorTransactionId).not.toBeNull();
    });

    it('offers Internet/téléphone among the default expense categories', async () => {
      const internet = (await dataService.listCategories()).find((c) => c.name === 'Internet/téléphone');
      expect(internet?.kind).toBe('expense');
    });
  });

  describe('compte épargne', () => {
    it('is off by default and can be switched on', async () => {
      expect((await dataService.getAccount(livret))?.isSavings).toBe(false);
      await dataService.setAccountSavings(livret, true);
      expect((await dataService.getAccount(livret))?.isSavings).toBe(true);
    });
  });

  describe('sauvegarde v2 et export', () => {
    it('carries the V2 fields through a backup round trip', async () => {
      await dataService.setAccountSavings(livret, true);
      const ghost = await add(-250, 'fantome', { categoryId: cat['Impôts'] });
      await add(-20, 'pointe', { offBalance: true });
      const backup = JSON.stringify(await dataService.createBackup());

      const other = await createTestDataService();
      await other.dataService.restoreBackup(backup);

      expect((await other.dataService.getAccount(livret))?.isSavings).toBe(true);
      expect((await other.dataService.getTransaction(ghost.id))?.status).toBe('fantome');
      const [row] = (await other.dataService.listMonthTransactions(SEPT)).filter((t) => t.offBalance);
      expect(row.amount).toBe(-20);
      await other.close();
    });

    it('refuses a V1 backup with a clear message, and keeps the data', async () => {
      await add(-20, 'pointe');
      const v1 = JSON.stringify({
        format: 'nomie-backup',
        version: 1,
        createdAt: '2026-09-01T00:00:00.000Z',
        data: {
          accounts: [],
          categories: [],
          transactions: [],
          transactionSplits: [],
          budgets: [],
          recurrenceRules: [],
          settings: [],
        },
      });

      await expect(dataService.restoreBackup(v1)).rejects.toThrow(/V1/);
      expect(await dataService.listMonthTransactions(SEPT)).toHaveLength(1);
    });

    it('adds status, importance, Hors bilan, libellé, advance and savings columns to the CSV', async () => {
      await dataService.setAccountSavings(livret, true);
      await add(-250, 'fantome', { categoryId: cat['Impôts'] });

      const files = await dataService.exportCsv();
      const transactions = files.find((f) => f.filename === 'transactions.csv')!.content;
      const accounts = files.find((f) => f.filename === 'comptes.csv')!.content;
      const [header] = transactions.split('\n');
      for (const column of ['Libellé', 'Statut', 'Importance', 'Hors bilan', 'Avance']) {
        expect(header).toContain(column);
      }
      expect(transactions).toContain('Fantôme');
      expect(accounts.split('\n')[0]).toContain('Compte épargne');
    });
  });
});
