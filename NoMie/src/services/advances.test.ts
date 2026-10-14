import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService } from './dataService';

describe('dataService — avances et Hors bilan (#45)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;
  let livret: number;
  let advanceCategory: number;
  let food: number;
  let salary: number;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService({ now: () => new Date('2026-09-20T10:00:00') }));
    courant = (await dataService.createAccount({ name: 'Courant', initialBalance: 1000 })).id;
    livret = (await dataService.createAccount({ name: 'Livret A', initialBalance: 0 })).id;
    const categories = await dataService.listCategories();
    advanceCategory = categories.find((c) => c.systemRole === 'avance')!.id;
    food = categories.find((c) => c.name === 'Restaurant')!.id;
    salary = categories.find((c) => c.name === 'Salaire/Intérêts/Avantages')!.id;
  });

  afterEach(() => close());

  const septembre = { year: 2026, month: 8 };
  const advance = (amount: number, extra: Record<string, unknown> = {}) =>
    dataService.createTransaction({
      accountId: courant,
      operationDate: '2026-09-10',
      amount,
      categoryId: advanceCategory,
      comment: 'Train pro',
      ...extra,
    });

  it('keeps a whole-operation advance out of the bilan, in the balances', async () => {
    const created = await advance(-80, { advanceType: 'en_attente' });

    expect(created.offBalance).toBe(true);
    expect(created.importance).toBeNull();
    expect((await dataService.getBalanceTotals()).realBalance).toBe(920);
    const summary = await dataService.getMonthSummary(septembre);
    expect(summary.expenses).toBe(0);
    expect(summary.income).toBe(0);
  });

  it('lists a whole-operation advance in waiting, next to portions', async () => {
    await advance(-80, { advanceType: 'en_attente' });
    await dataService.createTransaction({
      accountId: courant,
      operationDate: '2026-09-11',
      amount: -50,
      splits: [
        { categoryId: food, amount: -20 },
        { categoryId: advanceCategory, amount: -30, advanceType: 'en_attente' },
      ],
    });

    expect(await dataService.getPendingAdvances()).toEqual({ count: 2, total: 110 });
    const pending = await dataService.listPendingAdvances();
    expect(pending.map((p) => [p.amount, p.operationDate, p.accountName])).toEqual([
      [30, '2026-09-11', 'Courant'],
      [80, '2026-09-10', 'Courant'],
    ]);
  });

  it('does not wait on an advance settled elsewhere', async () => {
    await advance(-80);
    await advance(-40, { advanceType: 'reglee_ailleurs' });
    const [only] = await dataService.listPendingAdvances();
    expect(only.amount).toBe(80);
    expect(await dataService.getPendingAdvances()).toEqual({ count: 1, total: 80 });
  });

  it('does not take an operation whose first portion is Avancé for a whole advance', async () => {
    const split = await dataService.createTransaction({
      accountId: courant,
      operationDate: '2026-09-11',
      amount: -50,
      splits: [
        { categoryId: advanceCategory, amount: -30, advanceType: 'reglee_ailleurs' },
        { categoryId: food, amount: -20 },
      ],
    });
    await dataService.updateTransaction(split.id, { categoryId: advanceCategory });

    expect((await dataService.getTransaction(split.id))!.offBalance).toBe(false);
    expect(await dataService.getPendingAdvances()).toEqual({ count: 0, total: 0 });
  });

  describe('Remboursé', () => {
    it('records an Avancé income, hors bilan and Non pointé, and the advance leaves the list', async () => {
      const created = await advance(-80, { advanceType: 'en_attente' });
      const [pending] = await dataService.listPendingAdvances();

      await dataService.markAdvanceReimbursed(pending.ref);

      expect(await dataService.listPendingAdvances()).toEqual([]);
      const linked = (await dataService.getTransaction(created.id))!;
      const refund = (await dataService.getTransaction(linked.reimbursedById!))!;
      expect(refund).toMatchObject({
        accountId: courant,
        operationDate: '2026-09-20',
        amount: 80,
        categoryId: advanceCategory,
        status: 'non_pointe',
        offBalance: true,
        importance: null,
        advanceType: null,
      });
      expect((await dataService.getBalanceTotals()).realBalance).toBe(1000);
      const summary = await dataService.getMonthSummary(septembre);
      expect(summary.income).toBe(0);
      expect(summary.expenses).toBe(0);
    });

    it('takes the account, the date and the amount the user chose', async () => {
      const created = await advance(-80, { advanceType: 'en_attente' });
      const [pending] = await dataService.listPendingAdvances();

      await dataService.markAdvanceReimbursed(pending.ref, {
        accountId: livret,
        date: '2026-09-25',
        amount: 75.5,
      });

      const refund = (await dataService.getTransaction(
        (await dataService.getTransaction(created.id))!.reimbursedById!
      ))!;
      expect(refund).toMatchObject({ accountId: livret, operationDate: '2026-09-25', amount: 75.5 });
    });

    it('refuses an amount that is not positive', async () => {
      await advance(-80, { advanceType: 'en_attente' });
      const [pending] = await dataService.listPendingAdvances();
      await expect(dataService.markAdvanceReimbursed(pending.ref, { amount: 0 })).rejects.toThrow();
      expect(await dataService.listPendingAdvances()).toHaveLength(1);
    });

    it('reimburses a portion the same way', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -50,
        splits: [
          { categoryId: food, amount: -20 },
          { categoryId: advanceCategory, amount: -30, advanceType: 'en_attente' },
        ],
      });
      const [pending] = await dataService.listPendingAdvances();
      await dataService.markAdvanceReimbursed(pending.ref);

      expect(await dataService.listPendingAdvances()).toEqual([]);
      expect((await dataService.getTransaction(created.id))!.reimbursedById).toBeNull();
      expect((await dataService.getMonthSummary(septembre)).expenses).toBe(20);
    });

    it('puts a whole advance back in the list when its reimbursement is deleted', async () => {
      const created = await advance(-80, { advanceType: 'en_attente' });
      await dataService.markAdvanceReimbursed((await dataService.listPendingAdvances())[0].ref);
      await dataService.deleteTransaction((await dataService.getTransaction(created.id))!.reimbursedById!);

      expect(await dataService.listPendingAdvances()).toHaveLength(1);
    });

    it('does not turn an edited reimbursement into a new pending advance', async () => {
      const created = await advance(-80, { advanceType: 'en_attente' });
      await dataService.markAdvanceReimbursed((await dataService.listPendingAdvances())[0].ref);
      const refundId = (await dataService.getTransaction(created.id))!.reimbursedById!;

      await dataService.updateTransaction(refundId, { comment: 'Remboursé par la boîte' });

      expect(await dataService.listPendingAdvances()).toEqual([]);
    });
  });

  describe('Hors bilan libre', () => {
    it('takes an ordinary operation out of the bilan while keeping it in the balances', async () => {
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-10',
        amount: -60,
        categoryId: food,
        offBalance: true,
      });
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: 100,
        categoryId: salary,
        offBalance: true,
      });

      expect((await dataService.getBalanceTotals()).realBalance).toBe(1040);
      const summary = await dataService.getMonthSummary(septembre);
      expect(summary.expenses).toBe(0);
      expect(summary.income).toBe(0);
    });

    it('refuses Hors bilan on a Fantôme', async () => {
      await expect(
        dataService.createTransaction({
          accountId: courant,
          operationDate: '2026-09-10',
          amount: -60,
          categoryId: food,
          status: 'fantome',
          offBalance: true,
        })
      ).rejects.toThrow();
    });
  });
});
