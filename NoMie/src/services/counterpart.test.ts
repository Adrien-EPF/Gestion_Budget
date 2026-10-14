import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService } from './dataService';

describe('dataService — fantôme et contrepartie (#46)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;
  let taxes: number;
  let salary: number;
  let gifts: number;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService({ now: () => new Date('2026-09-20T10:00:00') }));
    courant = (await dataService.createAccount({ name: 'Courant', initialBalance: 1000 })).id;
    const categories = await dataService.listCategories();
    taxes = categories.find((c) => c.name === 'Impôts')!.id;
    salary = categories.find((c) => c.name === 'Salaire/Intérêts/Avantages')!.id;
    gifts = categories.find((c) => c.name === 'Cadeaux')!.id;
  });

  afterEach(() => close());

  const septembre = { year: 2026, month: 8 };
  const withholding = (extra: Record<string, unknown> = {}) =>
    dataService.createTransaction({
      accountId: courant,
      operationDate: '2026-09-05',
      amount: -250,
      categoryId: taxes,
      comment: 'Impôt à la source',
      status: 'fantome',
      ...extra,
    });

  it('creates a linked Fantôme of opposite sign, same account and date, in Salaire by default', async () => {
    const tax = await withholding({ counterpart: {} });

    const other = (await dataService.getTransaction(tax.counterpartTransactionId!))!;
    expect(other).toMatchObject({
      accountId: courant,
      operationDate: '2026-09-05',
      amount: 250,
      categoryId: salary,
      status: 'fantome',
      counterpartTransactionId: tax.id,
      offBalance: false,
    });
    expect((await dataService.getTransaction(tax.id))!.counterpartTransactionId).toBe(other.id);
  });

  it('takes the category the user chose for the counterpart', async () => {
    const tax = await withholding({ counterpart: { categoryId: gifts } });
    expect((await dataService.getTransaction(tax.counterpartTransactionId!))!.categoryId).toBe(gifts);
  });

  it('is optional: without it, nothing is linked', async () => {
    const tax = await withholding();
    expect(tax.counterpartTransactionId).toBeNull();
  });

  it('only goes with a Fantôme', async () => {
    await expect(withholding({ status: 'non_pointe', counterpart: {} })).rejects.toThrow();
  });

  it('counts in the bilan, never in the balances', async () => {
    await withholding({ counterpart: {} });

    const totals = await dataService.getBalanceTotals();
    expect(totals.realBalance).toBe(1000);
    expect(totals.pointedBalance).toBe(1000);
    const summary = await dataService.getMonthSummary(septembre);
    expect(summary.expenses).toBe(250);
    expect(summary.income).toBe(250);
  });

  it('never offers a Fantôme for pointage', async () => {
    await withholding({ counterpart: {} });
    expect(await dataService.listTransactionsToPoint()).toEqual([]);
    expect(await dataService.countToPoint()).toBe(0);
  });

  it('carries a change of amount and date over to the other side, from either side', async () => {
    const tax = await withholding({ counterpart: {} });

    await dataService.updateTransaction(tax.id, { amount: -300, operationDate: '2026-09-06' });
    expect(await dataService.getTransaction(tax.counterpartTransactionId!)).toMatchObject({
      amount: 300,
      operationDate: '2026-09-06',
    });

    await dataService.updateTransaction(tax.counterpartTransactionId!, { amount: 280 });
    expect(await dataService.getTransaction(tax.id)).toMatchObject({ amount: -280, operationDate: '2026-09-06' });
  });

  it('keeps the other side’s category when only the amount changes', async () => {
    const tax = await withholding({ counterpart: { categoryId: gifts } });
    await dataService.updateTransaction(tax.id, { amount: -300 });
    expect((await dataService.getTransaction(tax.counterpartTransactionId!))!.categoryId).toBe(gifts);
  });

  it('refuses to leave Fantôme while a counterpart is linked', async () => {
    const tax = await withholding({ counterpart: {} });
    await expect(dataService.updateTransaction(tax.id, { status: 'non_pointe' })).rejects.toThrow();
  });

  it('adds the counterpart to a Fantôme saved without one', async () => {
    const tax = await withholding();
    await dataService.updateTransaction(tax.id, { counterpart: {} });

    const linked = (await dataService.getTransaction(tax.id))!;
    expect((await dataService.getTransaction(linked.counterpartTransactionId!))!.amount).toBe(250);
  });

  it('deletes both from either side', async () => {
    const tax = await withholding({ counterpart: {} });
    await dataService.deleteTransaction(tax.counterpartTransactionId!);

    expect(await dataService.getTransaction(tax.id)).toBeNull();
    expect(await dataService.getTransaction(tax.counterpartTransactionId!)).toBeNull();
    expect((await dataService.getMonthSummary(septembre)).expenses).toBe(0);
  });

  it('a Fantôme paid by someone else counts in the bilan without a counterpart', async () => {
    await withholding({ amount: -40, categoryId: gifts, comment: 'Offert par Léa' });

    expect((await dataService.getBalanceTotals()).realBalance).toBe(1000);
    expect((await dataService.getMonthSummary(septembre)).expenses).toBe(40);
  });

  it('follows the Fantôme to another account, and its importance follows the sign', async () => {
    const livret = (await dataService.createAccount({ name: 'Livret A', initialBalance: 0 })).id;
    const tax = await withholding({ counterpart: {} });

    await dataService.updateTransaction(tax.id, { accountId: livret, amount: 250 });

    const other = (await dataService.getTransaction(tax.counterpartTransactionId!))!;
    expect(other).toMatchObject({ accountId: livret, amount: -250, importance: 'essentiel' });
    await dataService.updateTransaction(tax.id, { amount: -250 });
    expect((await dataService.getTransaction(tax.counterpartTransactionId!))!.importance).toBeNull();
  });

  it('leaves the category empty for an expense counterpart rather than a salary one', async () => {
    const income = await withholding({ amount: 250, categoryId: salary, counterpart: {} });
    expect((await dataService.getTransaction(income.counterpartTransactionId!))!.categoryId).toBeNull();
  });
});
