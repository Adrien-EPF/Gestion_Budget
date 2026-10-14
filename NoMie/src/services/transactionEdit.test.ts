import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService } from './dataService';

describe('dataService — editing and deleting a transaction', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;
  let livret: number;
  let transferCategory: number;
  let advanceCategory: number;
  let food: number;
  let fun: number;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    courant = (await dataService.createAccount({ name: 'Courant', initialBalance: 1000 })).id;
    livret = (await dataService.createAccount({ name: 'Livret A', initialBalance: 0 })).id;
    const categories = await dataService.listCategories();
    transferCategory = categories.find((c) => c.systemRole === 'virement')!.id;
    advanceCategory = categories.find((c) => c.systemRole === 'avance')!.id;
    const expenses = categories.filter((c) => c.kind === 'expense');
    food = expenses[0].id;
    fun = expenses[1].id;
  });

  afterEach(() => close());

  const spend = (amount: number, extra: Record<string, unknown> = {}) =>
    dataService.createTransaction({
      accountId: courant,
      operationDate: '2026-09-10',
      amount,
      categoryId: food,
      ...extra,
    });

  const transfer = (amount = -200) =>
    dataService.createTransaction({
      accountId: courant,
      operationDate: '2026-09-10',
      amount,
      categoryId: transferCategory,
      transferToAccountId: livret,
    });

  it('edits every field and keeps what it was not told about', async () => {
    const created = await spend(-40, { comment: 'Cinéma', importance: 'secondaire_superflu' });

    await dataService.updateTransaction(created.id, {
      accountId: livret,
      operationDate: '2026-09-12',
      bankDate: '2026-09-13',
      comment: 'Théâtre',
      amount: -55.5,
      categoryId: fun,
      status: 'pointe',
    });

    expect(await dataService.getTransaction(created.id)).toMatchObject({
      accountId: livret,
      operationDate: '2026-09-12',
      bankDate: '2026-09-13',
      comment: 'Théâtre',
      amount: -55.5,
      categoryId: fun,
      status: 'pointe',
      importance: 'secondaire_superflu',
    });
    expect((await dataService.getBalanceTotals()).realBalance).toBe(1000 - 55.5);
  });

  it('replaces the répartition and refuses portions that do not add up, writing nothing', async () => {
    const created = await spend(-100);

    await expect(
      dataService.updateTransaction(created.id, {
        splits: [
          { categoryId: food, amount: -30 },
          { categoryId: fun, amount: -60 },
        ],
      })
    ).rejects.toThrow();
    expect((await dataService.getTransaction(created.id))!.splits).toEqual([]);

    await dataService.updateTransaction(created.id, {
      splits: [
        { categoryId: food, amount: -30 },
        { categoryId: advanceCategory, amount: -70, advanceType: 'reglee_ailleurs' },
      ],
    });
    expect((await dataService.getTransaction(created.id))!.splits.map((s) => s.amount)).toEqual([
      -30, -70,
    ]);

    await dataService.updateTransaction(created.id, { splits: [] });
    expect((await dataService.getTransaction(created.id))!.splits).toEqual([]);
  });

  it('edits both legs of an inter-account movement from either side', async () => {
    const out = await transfer();
    const mirrorId = out.mirrorTransactionId!;

    await dataService.updateTransaction(out.id, {
      amount: -250,
      operationDate: '2026-09-11',
      comment: 'Épargne',
    });
    expect(await dataService.getTransaction(mirrorId)).toMatchObject({
      accountId: livret,
      amount: 250,
      operationDate: '2026-09-11',
      comment: 'Épargne',
      offBalance: true,
    });

    await dataService.updateTransaction(mirrorId, { amount: 300 });
    expect((await dataService.getTransaction(out.id))!.amount).toBe(-300);
  });

  it('can redirect a movement to another destination account', async () => {
    const third = (await dataService.createAccount({ name: 'PEL', initialBalance: 0 })).id;
    const out = await transfer();
    await dataService.updateTransaction(out.id, { transferToAccountId: third });
    expect((await dataService.getTransaction(out.mirrorTransactionId!))!.accountId).toBe(third);
  });

  it('refuses to turn a movement into a plain operation, or the reverse', async () => {
    const out = await transfer();
    await expect(dataService.updateTransaction(out.id, { categoryId: food })).rejects.toThrow();

    const plain = await spend(-20);
    await expect(
      dataService.updateTransaction(plain.id, {
        categoryId: transferCategory,
        transferToAccountId: livret,
      })
    ).rejects.toThrow();
  });

  it('applies the creation rules: Avancé is out of the bilan, a Fantôme cannot be', async () => {
    const created = await spend(-20);
    await dataService.updateTransaction(created.id, { categoryId: advanceCategory });
    expect(await dataService.getTransaction(created.id)).toMatchObject({
      offBalance: true,
      importance: null,
      advanceType: 'en_attente',
    });

    // Leaving Avancé frees the box again.
    await dataService.updateTransaction(created.id, { categoryId: food });
    expect(await dataService.getTransaction(created.id)).toMatchObject({
      offBalance: false,
      importance: 'essentiel',
      advanceType: null,
    });

    await expect(
      dataService.updateTransaction(created.id, { status: 'fantome', offBalance: true })
    ).rejects.toThrow();
  });

  it('deletes a transaction with its portions and moves the balances', async () => {
    const created = await spend(-100, {
      categoryId: null,
      splits: [
        { categoryId: food, amount: -40 },
        { categoryId: fun, amount: -60 },
      ],
    });
    await dataService.deleteTransaction(created.id);
    expect(await dataService.getTransaction(created.id)).toBeNull();
    expect((await dataService.getBalanceTotals()).realBalance).toBe(1000);
  });

  it('deletes both legs of an inter-account movement from either side', async () => {
    const out = await transfer();
    await dataService.deleteTransaction(out.mirrorTransactionId!);
    expect(await dataService.getTransaction(out.id)).toBeNull();
    expect(await dataService.getTransaction(out.mirrorTransactionId!)).toBeNull();
  });

  it('puts an advance back in the pending list when its reimbursement is deleted', async () => {
    await spend(-50, {
      categoryId: null,
      splits: [
        { categoryId: food, amount: -20 },
        { categoryId: advanceCategory, amount: -30, advanceType: 'en_attente' },
      ],
    });
    const [pending] = await dataService.listPendingAdvances();
    await dataService.markAdvanceReimbursed(pending.ref);
    expect(await dataService.listPendingAdvances()).toHaveLength(0);

    const [income] = (
      await dataService.listMonthTransactions({
        year: dataService.now().getFullYear(),
        month: dataService.now().getMonth(),
      })
    ).filter((t) => t.comment === 'Remboursement');
    await dataService.deleteTransaction(income.id);
    expect(await dataService.listPendingAdvances()).toHaveLength(1);
  });
});
