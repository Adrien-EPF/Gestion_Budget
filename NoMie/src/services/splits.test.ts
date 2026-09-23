import { openNodeSqliteDatabase } from '../db/nodeSqliteDatabase';
import { createTestDataService } from '../test-utils/createTestDataService';
import { createDataService, type DataService } from './dataService';

describe('dataService — split, inter-account movements, advances', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;
  let livret: number;
  let edenred: number;
  const categoryIds: Record<string, number> = {};
  const SEPT = { year: 2026, month: 8 };

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    courant = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    livret = (await dataService.createAccount({ name: 'Livret A', initialBalance: 500 })).id;
    edenred = (await dataService.createAccount({ name: 'EdenRed', initialBalance: 100 })).id;
    for (const category of await dataService.listCategories()) categoryIds[category.name] = category.id;
  });

  afterEach(() => close());

  const transactionCount = async () => (await dataService.listMonthTransactions(SEPT)).length;

  describe('split', () => {
    it('stores portions in amounts and reads them back in order', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -28.5,
        splits: [
          { categoryId: categoryIds['Restaurant'], amount: -14.25 },
          { categoryId: categoryIds['Avancé'], amount: -14.25, advanced: true },
        ],
      });

      const read = await dataService.getTransaction(created.id);
      expect(read?.splits).toEqual([
        { categoryId: categoryIds['Restaurant'], amount: -14.25, advanced: false },
        { categoryId: categoryIds['Avancé'], amount: -14.25, advanced: true },
      ]);
      expect(read).toEqual(created);
    });

    it('accepts any number of portions', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -100,
        splits: Array.from({ length: 10 }, () => ({ categoryId: categoryIds['Loisir'], amount: -10 })),
      });
      expect(created.splits).toHaveLength(10);
    });

    it('refuses portions that do not add up to the total, and writes nothing', async () => {
      await expect(
        dataService.createTransaction({
          accountId: courant,
          operationDate: '2026-09-11',
          amount: -28.5,
          splits: [{ amount: -14.25 }, { amount: -14 }],
        })
      ).rejects.toThrow(/add up/);
      expect(await transactionCount()).toBe(0);
    });

    it('is not fooled by float sums: 0.1 + 0.2 makes 0.3', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -0.3,
        splits: [{ amount: -0.1 }, { amount: -0.2 }],
      });
      expect(created.splits).toHaveLength(2);
    });

    it('turns percentages into amounts of the total', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -80,
        splits: [
          { categoryId: categoryIds['Restaurant'], percent: 25 },
          { categoryId: categoryIds['Sorties/bières'], percent: 75 },
        ],
      });
      expect(created.splits.map((s) => s.amount)).toEqual([-20, -60]);
    });

    it('lets the last portion absorb the cent lost to rounding percentages', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -10,
        splits: [{ percent: 33.33 }, { percent: 33.33 }, { percent: 33.34 }],
      });
      expect(created.splits.map((s) => s.amount)).toEqual([-3.33, -3.33, -3.34]);
    });

    it('refuses percentages that do not make 100', async () => {
      await expect(
        dataService.createTransaction({
          accountId: courant,
          operationDate: '2026-09-11',
          amount: -10,
          splits: [{ percent: 50 }, { percent: 40 }],
        })
      ).rejects.toThrow(/100/);
      expect(await transactionCount()).toBe(0);
    });

    it('accepts a mix of fixed amounts and percentages when they add up', async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -100,
        splits: [{ amount: -40 }, { percent: 60 }],
      });
      expect(created.splits.map((s) => s.amount)).toEqual([-40, -60]);
    });

    it('refuses a portion that gives both an amount and a percentage, or neither', async () => {
      const attempt = (splits: { amount?: number; percent?: number }[]) =>
        dataService.createTransaction({
          accountId: courant,
          operationDate: '2026-09-11',
          amount: -10,
          splits,
        });
      await expect(attempt([{ amount: -10, percent: 100 }])).rejects.toThrow(/exactly one/);
      await expect(attempt([{}])).rejects.toThrow(/exactly one/);
    });

    it("takes the first portion's category as the principal one when none is given", async () => {
      const created = await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -30,
        splits: [{ categoryId: categoryIds['Santé'], amount: -30 }],
      });
      expect(created.categoryId).toBe(categoryIds['Santé']);
    });

    it('does not change balances: they follow the transaction total', async () => {
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -28.5,
        status: 'pointe',
        splits: [{ amount: -14.25 }, { amount: -14.25, advanced: true }],
      });
      const [summary] = await dataService.listAccountSummaries(SEPT);
      expect(summary.realBalance).toBe(971.5);
      expect(summary.pointedBalance).toBe(971.5);
    });
  });

  describe('inter-account movement', () => {
    const transfer = (extra: Partial<Parameters<DataService['createTransaction']>[0]> = {}) =>
      dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-12',
        amount: -200,
        comment: 'Vers Livret A',
        categoryId: categoryIds['Mouvement inter-compte'],
        transferToAccountId: livret,
        ...extra,
      });

    it('creates the mirror on the destination account in the same call, linked both ways', async () => {
      const created = await transfer();

      expect(created.mirrorTransactionId).not.toBeNull();
      const mirror = await dataService.getTransaction(created.mirrorTransactionId as number);
      expect(mirror).toMatchObject({
        accountId: livret,
        amount: 200,
        operationDate: '2026-09-12',
        comment: 'Vers Livret A',
        categoryId: categoryIds['Mouvement inter-compte'],
        status: 'non_pointe',
        mirrorTransactionId: created.id,
      });
      expect((await dataService.getTransaction(created.id))?.mirrorTransactionId).toBe(mirror?.id);
    });

    it('moves the money: source down, destination up, total unchanged', async () => {
      await transfer();
      const summaries = await dataService.listAccountSummaries(SEPT);
      const balance = (id: number) => summaries.find((s) => s.account.id === id)?.realBalance;
      expect(balance(courant)).toBe(800);
      expect(balance(livret)).toBe(700);
      expect((await dataService.getBalanceTotals()).realBalance).toBe(1600);
    });

    it('gives the mirror the status the transfer was entered with', async () => {
      const created = await transfer({ status: 'prevision' });
      const mirror = await dataService.getTransaction(created.mirrorTransactionId as number);
      expect(mirror?.status).toBe('prevision');
    });

    it('lets each leg be pointed on its own', async () => {
      const created = await transfer();
      await dataService.setPointed(created.mirrorTransactionId as number, true);
      expect((await dataService.getTransaction(created.id))?.status).toBe('non_pointe');
      expect((await dataService.getTransaction(created.mirrorTransactionId as number))?.status).toBe(
        'pointe'
      );
    });

    it('needs a destination, a different account that exists, and no split', async () => {
      await expect(transfer({ transferToAccountId: undefined })).rejects.toThrow(/destination/);
      await expect(transfer({ transferToAccountId: courant })).rejects.toThrow(/two different/);
      await expect(transfer({ transferToAccountId: 999 })).rejects.toThrow(/does not exist/);
      await expect(transfer({ splits: [{ amount: -200 }] })).rejects.toThrow(/cannot be split/);
      expect(await transactionCount()).toBe(0);
    });

    it('refuses a destination account on an ordinary category', async () => {
      await expect(
        dataService.createTransaction({
          accountId: courant,
          operationDate: '2026-09-12',
          amount: -20,
          categoryId: categoryIds['Restaurant'],
          transferToAccountId: livret,
        })
      ).rejects.toThrow(/only goes with/);
      expect(await transactionCount()).toBe(0);
    });

    it('deleting an account takes its split rows with it', async () => {
      const split = await dataService.createTransaction({
        accountId: livret,
        operationDate: '2026-09-13',
        amount: -10,
        splits: [{ amount: -4 }, { amount: -6, advanced: true }],
      });

      await dataService.deleteAccount(livret);

      expect(await dataService.getTransaction(split.id)).toBeNull();
      expect(await dataService.getPendingAdvances()).toEqual({ count: 0, total: 0 });
    });

    it('keeps the surviving leg of a deleted account, without a dangling link', async () => {
      const created = await transfer();
      await dataService.deleteAccount(courant);
      const survivor = await dataService.getTransaction(created.mirrorTransactionId as number);
      expect(survivor?.amount).toBe(200);
      expect(survivor?.mirrorTransactionId).toBeNull();
    });
  });

  describe('advances', () => {
    const advance = (accountId: number, amount: number, month = '2026-09') =>
      dataService.createTransaction({
        accountId,
        operationDate: `${month}-11`,
        amount: -amount * 2,
        comment: 'Le Comptoir',
        splits: [
          { categoryId: categoryIds['Restaurant'], amount: -amount },
          { categoryId: categoryIds['Avancé'], amount: -amount, advanced: true },
        ],
      });

    it('can be marked on any account, not only EdenRed', async () => {
      await advance(courant, 10);
      await advance(livret, 20);
      await advance(edenred, 5);
      expect(await dataService.getPendingAdvances()).toEqual({ count: 3, total: 35 });
    });

    it('counts portions, not transactions', async () => {
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-11',
        amount: -60,
        splits: [{ amount: -20, advanced: true }, { amount: -20, advanced: true }, { amount: -20 }],
      });
      expect(await dataService.getPendingAdvances()).toEqual({ count: 2, total: 40 });
    });

    it('has nothing pending when no portion is marked', async () => {
      await dataService.createTransaction({ accountId: courant, operationDate: '2026-09-11', amount: -5 });
      expect(await dataService.getPendingAdvances()).toEqual({ count: 0, total: 0 });
    });

    it('leaves archived accounts out, like every other total', async () => {
      await advance(courant, 10);
      await advance(livret, 20);
      await dataService.archiveAccount(livret);
      expect(await dataService.getPendingAdvances()).toEqual({ count: 1, total: 10 });
    });

    it('exposes the advanced amount on list rows, 0 when there is none', async () => {
      await advance(courant, 14.25);
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-09-12',
        amount: -5,
        comment: 'Café',
      });

      const rows = await dataService.listMonthTransactions(SEPT);
      expect(rows.find((r) => r.comment === 'Le Comptoir')?.advancedAmount).toBe(14.25);
      expect(rows.find((r) => r.comment === 'Café')?.advancedAmount).toBe(0);
      const toPoint = await dataService.listTransactionsToPoint();
      expect(toPoint.find((r) => r.comment === 'Le Comptoir')?.advancedAmount).toBe(14.25);
    });

    describe('remboursement (#21, #27)', () => {
      it('lists each pending portion with its account, category, amount and operation date', async () => {
        await advance(courant, 10, '2026-09');
        await advance(livret, 20, '2026-08');

        const pending = await dataService.listPendingAdvances();
        expect(pending).toEqual([
          {
            splitId: expect.any(Number),
            accountName: 'Compte courant',
            categoryName: 'Avancé',
            amount: 10,
            operationDate: '2026-09-11',
          },
          {
            splitId: expect.any(Number),
            accountName: 'Livret A',
            categoryName: 'Avancé',
            amount: 20,
            operationDate: '2026-08-11',
          },
        ]);
      });

      it('marking a portion reimbursed removes it from the list and from the pending total', async () => {
        await advance(courant, 10);
        await advance(livret, 20);
        const [first] = await dataService.listPendingAdvances();

        await dataService.markAdvanceReimbursed(first.splitId);

        const pending = await dataService.listPendingAdvances();
        expect(pending).toHaveLength(1);
        expect(pending.find((p) => p.splitId === first.splitId)).toBeUndefined();
        expect(await dataService.getPendingAdvances()).toEqual({ count: 1, total: 30 - first.amount });
      });

      it('does not affect other portions of the same split transaction', async () => {
        await dataService.createTransaction({
          accountId: courant,
          operationDate: '2026-09-11',
          amount: -40,
          splits: [{ amount: -20, advanced: true }, { amount: -20, advanced: true }],
        });
        const [first, second] = await dataService.listPendingAdvances();

        await dataService.markAdvanceReimbursed(first.splitId);

        const pending = await dataService.listPendingAdvances();
        expect(pending).toEqual([expect.objectContaining({ splitId: second.splitId })]);
      });

      it('notifies subscribers so Accueil and the pending total refresh', async () => {
        await advance(courant, 10);
        const [pending] = await dataService.listPendingAdvances();
        const listener = jest.fn();
        dataService.subscribe(listener);

        await dataService.markAdvanceReimbursed(pending.splitId);

        expect(listener).toHaveBeenCalled();
      });
    });
  });

  describe('upgrading a database created before this ticket', () => {
    it('adds the mirror column in place and keeps existing transactions', async () => {
      const db = openNodeSqliteDatabase();
      await db.execAsync(`
        CREATE TABLE accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
          initial_balance REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL,
          operation_date TEXT NOT NULL, bank_date TEXT, comment TEXT NOT NULL DEFAULT '',
          amount REAL NOT NULL, category_id INTEGER, status TEXT NOT NULL);
        INSERT INTO accounts (name, initial_balance, created_at) VALUES ('Ancien', 10, '2026-01-01');
        INSERT INTO transactions (account_id, operation_date, amount, status) VALUES (1, '2026-09-01', -3, 'pointe');
      `);
      const upgraded = createDataService(db);
      await upgraded.initialize();
      await upgraded.initialize(); // relaunching is harmless

      expect((await upgraded.getTransaction(1))?.mirrorTransactionId).toBeNull();
      const transferCategory = (await upgraded.listCategories()).find(
        (c) => c.name === 'Mouvement inter-compte'
      )!;
      const second = (await upgraded.createAccount({ name: 'Neuf', initialBalance: 0 })).id;
      const moved = await upgraded.createTransaction({
        accountId: 1,
        operationDate: '2026-09-02',
        amount: -1,
        categoryId: transferCategory.id,
        transferToAccountId: second,
      });
      expect(moved.mirrorTransactionId).not.toBeNull();
      await db.closeAsync();
    });
  });
});
