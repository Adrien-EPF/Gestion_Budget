import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService, TransactionStatus } from './dataService';

describe('dataService — transactions and balances', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let accountId: number;
  const SEPT = { year: 2026, month: 8 };

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    accountId = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 }))
      .id;
  });

  afterEach(() => close());

  const add = (
    amount: number,
    status: TransactionStatus,
    operationDate = '2026-09-10',
    extra: { accountId?: number; comment?: string } = {}
  ) =>
    dataService.createTransaction({
      accountId: extra.accountId ?? accountId,
      operationDate,
      amount,
      status,
      comment: extra.comment,
    });

  it('creates a Non Pointé transaction by default and reads it back', async () => {
    const created = await dataService.createTransaction({
      accountId,
      operationDate: '2026-09-11',
      amount: -64.32,
      comment: 'Carrefour Market',
    });

    expect(created.status).toBe('non_pointe');
    expect(await dataService.getTransaction(created.id)).toEqual(created);
    expect(created.bankDate).toBeNull();
    expect(created.categoryId).toBeNull();
  });

  it('computes the pointed balance as initial balance + Σ Pointé only', async () => {
    await add(-100, 'pointe');
    await add(-30, 'non_pointe');
    await add(2000, 'prevision');
    await add(-200, 'flux_comptable');

    const [summary] = await dataService.listAccountSummaries(SEPT);
    expect(summary.pointedBalance).toBe(900);
  });

  it('computes the real balance as initial balance + Σ everything except Flux comptable', async () => {
    await add(-100, 'pointe');
    await add(-30, 'non_pointe');
    await add(2000, 'prevision');
    await add(-200, 'flux_comptable');

    const [summary] = await dataService.listAccountSummaries(SEPT);
    expect(summary.realBalance).toBe(2870);
  });

  it('gives an account without transactions its initial balance for both balances', async () => {
    const [summary] = await dataService.listAccountSummaries(SEPT);
    expect(summary.realBalance).toBe(1000);
    expect(summary.pointedBalance).toBe(1000);
    expect(summary.monthOperationCount).toBe(0);
  });

  it('does not let float drift leak into balances', async () => {
    for (let i = 0; i < 10; i++) await add(-0.1, 'pointe');
    const [summary] = await dataService.listAccountSummaries(SEPT);
    expect(summary.pointedBalance).toBe(999);
  });

  it('counts the operations of the requested month only, whatever their status', async () => {
    await add(-1, 'pointe', '2026-09-01');
    await add(-1, 'prevision', '2026-09-30');
    await add(-1, 'non_pointe', '2026-08-31');
    await add(-1, 'non_pointe', '2026-10-01');

    const [summary] = await dataService.listAccountSummaries(SEPT);
    expect(summary.monthOperationCount).toBe(2);
  });

  it('totals balances over active accounts only', async () => {
    const livret = await dataService.createAccount({ name: 'Livret A', initialBalance: 500 });
    await add(-100, 'pointe');
    await add(50, 'non_pointe', '2026-09-10', { accountId: livret.id });

    expect(await dataService.getBalanceTotals()).toEqual({
      realBalance: 1450,
      pointedBalance: 1400,
    });

    await dataService.archiveAccount(livret.id);
    expect(await dataService.getBalanceTotals()).toEqual({
      realBalance: 900,
      pointedBalance: 900,
    });
  });

  it('marks a Non Pointé transaction as Pointé and back', async () => {
    const t = await add(-10, 'non_pointe');

    await dataService.setPointed(t.id, true);
    expect((await dataService.getTransaction(t.id))?.status).toBe('pointe');

    await dataService.setPointed(t.id, false);
    expect((await dataService.getTransaction(t.id))?.status).toBe('non_pointe');
  });

  it('never changes the status of a Prévision or a Flux comptable', async () => {
    const forecast = await add(2380, 'prevision');
    const flux = await add(-200, 'flux_comptable');

    await dataService.setPointed(forecast.id, true);
    await dataService.setPointed(flux.id, true);
    await dataService.setPointed(forecast.id, false);
    await dataService.setPointed(flux.id, false);

    expect((await dataService.getTransaction(forecast.id))?.status).toBe('prevision');
    expect((await dataService.getTransaction(flux.id))?.status).toBe('flux_comptable');
  });

  it('is idempotent when a transaction is marked Pointé twice', async () => {
    const t = await add(-10, 'non_pointe');
    await dataService.setPointed(t.id, true);
    await dataService.setPointed(t.id, true);
    expect((await dataService.getTransaction(t.id))?.status).toBe('pointe');
  });

  it('moves the balances when a transaction is pointed', async () => {
    const t = await add(-100, 'non_pointe');
    let [summary] = await dataService.listAccountSummaries(SEPT);
    expect(summary.pointedBalance).toBe(1000);

    await dataService.setPointed(t.id, true);
    [summary] = await dataService.listAccountSummaries(SEPT);
    expect(summary.pointedBalance).toBe(900);
    expect(summary.realBalance).toBe(900);
  });

  it('lists what is left to point, newest first, and can filter by account', async () => {
    const livret = await dataService.createAccount({ name: 'Livret A', initialBalance: 0 });
    await add(-1, 'non_pointe', '2026-09-01', { comment: 'ancien' });
    await add(-2, 'non_pointe', '2026-09-12', { comment: 'récent' });
    await add(-3, 'pointe', '2026-09-13', { comment: 'déjà pointé' });
    await add(-4, 'non_pointe', '2026-09-05', { accountId: livret.id, comment: 'livret' });

    const all = await dataService.listTransactionsToPoint();
    expect(all.map((t) => t.comment)).toEqual(['récent', 'livret', 'ancien']);

    const onLivret = await dataService.listTransactionsToPoint({ accountId: livret.id });
    expect(onLivret.map((t) => t.comment)).toEqual(['livret']);
    expect(onLivret[0].accountName).toBe('Livret A');

    expect(await dataService.countToPoint()).toBe(3);
  });

  it('leaves archived accounts out of what is left to point', async () => {
    const old = await dataService.createAccount({ name: 'Ancien', initialBalance: 0 });
    await add(-5, 'non_pointe', '2026-09-05', { accountId: old.id });
    await dataService.archiveAccount(old.id);

    expect(await dataService.listTransactionsToPoint()).toEqual([]);
    expect(await dataService.countToPoint()).toBe(0);
  });

  it('lists the month operations newest first, with their category', async () => {
    const [category] = await dataService.listCategories();
    await dataService.createTransaction({
      accountId,
      operationDate: '2026-09-02',
      amount: -10,
      categoryId: category.id,
      comment: 'a',
    });
    await add(-20, 'pointe', '2026-09-20', { comment: 'b' });
    await add(-30, 'pointe', '2026-08-31', { comment: 'hors mois' });

    const month = await dataService.listMonthTransactions(SEPT);
    expect(month.map((t) => t.comment)).toEqual(['b', 'a']);
    expect(month[1].categoryName).toBe(category.name);
    expect(month[0].categoryName).toBeNull();
  });

  it('summarises the month without Flux comptable and without Prévision', async () => {
    await add(-64.32, 'non_pointe');
    await add(-28.5, 'pointe');
    await add(100, 'pointe');
    await add(-200, 'flux_comptable');
    await add(2380, 'prevision', '2026-09-30', { comment: 'Salaire' });
    await add(-999, 'pointe', '2026-08-15');

    const summary = await dataService.getMonthSummary(SEPT);
    expect(summary.expenses).toBe(92.82);
    expect(summary.income).toBe(100);
    expect(summary.forecastCount).toBe(1);
    expect(summary.firstForecast).toEqual({ comment: 'Salaire', operationDate: '2026-09-30' });
  });

  it('summarises an empty month as zeros with no forecast', async () => {
    expect(await dataService.getMonthSummary(SEPT)).toEqual({
      expenses: 0,
      income: 0,
      forecastCount: 0,
      firstForecast: null,
    });
  });

  it('handles the December → January month boundary', async () => {
    await add(-10, 'pointe', '2026-12-31');
    await add(-20, 'pointe', '2027-01-01');

    expect((await dataService.getMonthSummary({ year: 2026, month: 11 })).expenses).toBe(10);
    expect((await dataService.getMonthSummary({ year: 2027, month: 0 })).expenses).toBe(20);
  });

  it('deletes an account together with its transactions', async () => {
    const other = await dataService.createAccount({ name: 'Autre', initialBalance: 0 });
    const gone = await add(-10, 'non_pointe');
    const kept = await add(-20, 'non_pointe', '2026-09-10', { accountId: other.id });

    await dataService.deleteAccount(accountId);

    expect(await dataService.getTransaction(gone.id)).toBeNull();
    expect(await dataService.getTransaction(kept.id)).not.toBeNull();
  });

  it('picks the oldest active account as the current account for quick entry', async () => {
    expect((await dataService.getCurrentAccount())?.id).toBe(accountId);

    await dataService.archiveAccount(accountId);
    expect(await dataService.getCurrentAccount()).toBeNull();

    const next = await dataService.createAccount({ name: 'Nouveau', initialBalance: 0 });
    expect((await dataService.getCurrentAccount())?.id).toBe(next.id);
  });

  it('notifies subscribers after a write, and stops once unsubscribed', async () => {
    const listener = jest.fn();
    const unsubscribe = dataService.subscribe(listener);

    await add(-1, 'non_pointe');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await add(-1, 'non_pointe');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
