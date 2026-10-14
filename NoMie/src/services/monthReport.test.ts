import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService, Importance, TransactionStatus } from './dataService';

const OCT = { year: 2026, month: 9 };

describe('dataService — bilan du mois (#49)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;
  let livret: number;
  const cat: Record<string, number> = {};
  let today = new Date(2026, 9, 14, 12);

  beforeEach(async () => {
    today = new Date(2026, 9, 14, 12);
    ({ dataService, close } = await createTestDataService({ now: () => today }));
    courant = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    livret = (await dataService.createAccount({ name: 'Livret A', initialBalance: 500 })).id;
    for (const category of await dataService.listCategories()) cat[category.name] = category.id;
  });

  afterEach(() => close());

  const add = (
    amount: number,
    date: string,
    extra: {
      status?: TransactionStatus;
      category?: string;
      accountId?: number;
      offBalance?: boolean;
      importance?: Importance;
      transferToAccountId?: number;
    } = {}
  ) =>
    dataService.createTransaction({
      accountId: extra.accountId ?? courant,
      operationDate: date,
      amount,
      status: extra.status ?? 'pointe',
      categoryId: extra.category ? cat[extra.category] : undefined,
      offBalance: extra.offBalance,
      importance: extra.importance,
      transferToAccountId: extra.transferToAccountId,
    });

  describe('trésorerie — solde de fin du mois précédent', () => {
    it('sums what happened before the month, Prévision included and Fantôme left out', async () => {
      await add(-100, '2026-09-30');
      await add(-40, '2026-09-10', { status: 'prevision' });
      await add(-300, '2026-09-12', { status: 'fantome' });
      await add(-25, '2026-10-02');

      const [summary] = await dataService.listAccountSummaries(OCT);
      expect(summary.previousMonthBalance).toBe(860);
      expect(summary.realBalance).toBe(835);
    });

    it('is the initial balance when nothing happened before', async () => {
      await add(-25, '2026-10-02');
      const summaries = await dataService.listAccountSummaries(OCT);
      expect(summaries[1].previousMonthBalance).toBe(500);
    });
  });

  describe('épargne versée', () => {
    beforeEach(async () => {
      await dataService.setAccountSavings(livret, true);
    });

    const transfer = (
      amount: number,
      date: string,
      from: number,
      to: number,
      status: TransactionStatus = 'pointe'
    ) => add(-amount, date, { accountId: from, category: 'Mouvement inter-compte', transferToAccountId: to, status });

    it('is what goes into the savings accounts minus what comes out', async () => {
      await transfer(300, '2026-10-03', courant, livret);
      await transfer(50, '2026-10-09', livret, courant);
      expect(await dataService.getSavingsContributed(OCT)).toBe(250);
    });

    it('leaves out Prévisions, interest, other months and non-savings accounts', async () => {
      await transfer(100, '2026-10-03', courant, livret);
      await transfer(900, '2026-10-20', courant, livret, 'prevision');
      await transfer(70, '2026-09-28', courant, livret);
      await add(12, '2026-10-05', { accountId: livret, category: 'Salaire/Intérêts/Avantages' });
      const other = (await dataService.createAccount({ name: 'EdenRed', initialBalance: 0 })).id;
      await transfer(40, '2026-10-06', courant, other);
      expect(await dataService.getSavingsContributed(OCT)).toBe(100);
    });

    it('is zero without a savings account', async () => {
      await dataService.setAccountSavings(livret, false);
      await transfer(100, '2026-10-03', courant, livret);
      expect(await dataService.getSavingsContributed(OCT)).toBe(0);
    });
  });

  describe('comparaison à date', () => {
    it('compares the spending from the 1st to today with the average of the 3 previous months at that day', async () => {
      await add(-100, '2026-10-05');
      await add(-500, '2026-10-20'); // after today: not counted yet
      await add(-90, '2026-09-10');
      await add(-900, '2026-09-20'); // after the 14th
      await add(-150, '2026-08-14');
      await add(-210, '2026-07-01');

      const comparison = await dataService.getDateComparison(OCT);
      expect(comparison).not.toBeNull();
      expect(comparison!.day).toBe(14);
      expect(comparison!.monthsCompared).toBe(3);
      expect(comparison!.total).toEqual({ current: 100, average: 150 });
    });

    it('breaks the comparison down by category and by importance', async () => {
      await add(-60, '2026-10-05', { category: 'Restaurant', importance: 'secondaire_superflu' });
      await add(-20, '2026-10-06', { category: 'Voiture', importance: 'essentiel' });
      await add(-90, '2026-09-05', { category: 'Restaurant', importance: 'secondaire_superflu' });
      await add(-30, '2026-08-05', { category: 'Culture', importance: 'secondaire_important' });

      const comparison = (await dataService.getDateComparison(OCT))!;
      expect(comparison.byCategory.find((l) => l.name === 'Restaurant')).toEqual({
        categoryId: cat['Restaurant'],
        name: 'Restaurant',
        current: 60,
        average: 45,
      });
      expect(comparison.byCategory.find((l) => l.name === 'Culture')).toEqual({
        categoryId: cat['Culture'],
        name: 'Culture',
        current: 0,
        average: 15,
      });
      expect(comparison.byImportance).toEqual([
        { importance: 'essentiel', current: 20, average: 0 },
        { importance: 'secondaire_important', current: 0, average: 15 },
        { importance: 'secondaire_superflu', current: 60, average: 45 },
        { importance: 'exceptionnel', current: 0, average: 0 },
      ]);
    });

    it('follows the bilan rules: Fantôme counts, Hors bilan, Avancé and Prévision do not', async () => {
      await add(-10, '2026-10-02');
      await add(-200, '2026-10-02', { status: 'fantome', category: 'Impôts' });
      await add(-50, '2026-10-02', { offBalance: true });
      await add(-70, '2026-10-02', { status: 'prevision' });
      await add(-80, '2026-10-02', { category: 'Avancé' });
      await add(-5, '2026-09-02');
      const comparison = (await dataService.getDateComparison(OCT))!;
      expect(comparison.total.current).toBe(210);
    });

    it('caps the day at the end of a shorter month', async () => {
      today = new Date(2026, 2, 31, 12); // 31 March; February has 28 days
      await add(-40, '2026-03-10');
      await add(-60, '2026-02-27');
      await add(-30, '2026-01-31');
      await add(-500, '2026-02-28'); // the last day of February is still "by the 31st"

      const comparison = (await dataService.getDateComparison({ year: 2026, month: 2 }))!;
      expect(comparison.day).toBe(31);
      expect(comparison.monthsCompared).toBe(2);
      expect(comparison.total.average).toBe(295); // (60 + 500 in February, 30 in January) / 2
    });

    it('averages only the months that have a history', async () => {
      await add(-100, '2026-08-20'); // first operation: August
      await add(-60, '2026-09-03');
      await add(-30, '2026-10-03');

      const comparison = (await dataService.getDateComparison(OCT))!;
      expect(comparison.monthsCompared).toBe(2);
      expect(comparison.total.average).toBe(30); // August 0 by the 14th, September 60
    });

    it('is hidden without any previous month of history', async () => {
      await add(-30, '2026-10-03');
      expect(await dataService.getDateComparison(OCT)).toBeNull();
    });

    it('covers the whole month for a past month, and is hidden for a month to come', async () => {
      await add(-30, '2026-09-25');
      await add(-10, '2026-08-25');
      await add(-20, '2026-07-25');
      const september = (await dataService.getDateComparison({ year: 2026, month: 8 }))!;
      expect(september.day).toBe(30);
      expect(september.total.current).toBe(30);
      expect(await dataService.getDateComparison({ year: 2026, month: 10 })).toBeNull();
    });
  });

  describe('bloc Hors bilan', () => {
    it('totals advances, reimbursements and movements between accounts', async () => {
      await add(-80, '2026-10-02', { category: 'Avancé' });
      await add(30, '2026-10-04', { category: 'Avancé' });
      await add(-200, '2026-10-06', { category: 'Mouvement inter-compte', transferToAccountId: livret });
      await add(-15, '2026-10-07', { offBalance: true });
      await add(-999, '2026-10-08', { category: 'Avancé', status: 'prevision' });
      await add(-5, '2026-09-30', { category: 'Avancé' });
      await add(-10, '2026-10-09');

      expect(await dataService.getOffBalanceSummary({ month: OCT })).toEqual({
        advances: 80,
        reimbursements: 30,
        transfers: 200,
        others: 15,
      });
    });

    it('covers a whole year', async () => {
      await add(-80, '2026-02-02', { category: 'Avancé' });
      await add(-20, '2026-10-02', { category: 'Avancé' });
      await add(-20, '2025-10-02', { category: 'Avancé' });
      expect((await dataService.getOffBalanceSummary({ year: 2026 })).advances).toBe(100);
    });
  });

  describe('bilan de l’année', () => {
    it('sums the year and averages the expenses over the months gone by', async () => {
      await add(-300, '2026-01-10');
      await add(-100, '2026-10-05');
      await add(2000, '2026-02-01', { category: 'Salaire/Intérêts/Avantages' });
      await add(-50, '2026-11-05', { status: 'prevision' });

      const summary = await dataService.getYearSummary(2026);
      expect(summary.expenses).toBe(400);
      expect(summary.income).toBe(2000);
      expect(summary.monthlyAverage).toBe(40); // 400 over January to October
    });

    it('averages over twelve months for a past year', async () => {
      await add(-1200, '2025-03-10');
      expect((await dataService.getYearSummary(2025)).monthlyAverage).toBe(100);
    });

    it('gives the balances at the end of a past year and today for the current one', async () => {
      await add(-100, '2025-12-31');
      await add(-30, '2026-02-01');
      await add(-20, '2026-03-01', { status: 'non_pointe' });

      const past = await dataService.getYearBalances(2025);
      expect(past.accounts[0]).toMatchObject({ realBalance: 900, pointedBalance: 900 });
      expect(past.total).toEqual({ realBalance: 1400, pointedBalance: 1400 });

      const current = await dataService.getYearBalances(2026);
      expect(current.accounts[0]).toMatchObject({ realBalance: 850, pointedBalance: 870 });
      expect(current.total).toEqual({ realBalance: 1350, pointedBalance: 1370 });
    });
  });
});
