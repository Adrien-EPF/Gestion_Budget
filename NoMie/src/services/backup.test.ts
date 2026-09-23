import { BACKUP_FORMAT_ID, BACKUP_FORMAT_VERSION } from '../backup/backupFormat';
import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService } from './dataService';

/** Fills a fresh database with one of everything a backup needs to carry. */
async function seed(dataService: DataService) {
  const checking = await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 });
  const savings = await dataService.createAccount({ name: 'Livret A', initialBalance: 0 });
  const categories = await dataService.listCategories();
  const restaurant = categories.find((c) => c.name === 'Restaurant')!;

  const withAdvance = await dataService.createTransaction({
    accountId: checking.id,
    operationDate: '2026-09-10',
    comment: 'Resto avec ; des ", des\nretours',
    amount: -64.5,
    splits: [{ categoryId: restaurant.id, amount: -64.5, advanced: true }],
  });

  const transport = categories.find((c) => c.name === 'Transports autres')!;
  const multiSplit = await dataService.createTransaction({
    accountId: checking.id,
    operationDate: '2026-09-11',
    comment: 'Courses + essence',
    amount: -80,
    splits: [
      { categoryId: restaurant.id, amount: -50 },
      { categoryId: transport.id, amount: -30 },
    ],
  });

  await dataService.createTransaction({
    accountId: checking.id,
    operationDate: '2026-09-05',
    amount: -200,
    categoryId: restaurant.id,
    transferToAccountId: undefined,
  });

  await dataService.createTransaction({
    accountId: checking.id,
    operationDate: '2026-09-12',
    amount: -50,
    categoryId: categories.find((c) => c.name === 'Mouvement inter-compte')!.id,
    transferToAccountId: savings.id,
  });

  const budget = await dataService.createBudget({ categoryId: restaurant.id, amount: 120, carryOver: true });
  const rule = await dataService.createRecurrenceRule({
    name: 'Loyer',
    accountId: checking.id,
    amount: -800,
    frequency: 'monthly',
    referenceDate: '2026-09-01',
  });
  await dataService.setSetting('roundedKeypad', true);

  return { checking, savings, restaurant, transport, withAdvance, multiSplit, budget, rule };
}

describe('dataService — sauvegarde (createBackup / restoreBackup)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
  });

  afterEach(() => close());

  it('carries every table, ids and links intact', async () => {
    const { checking, savings, restaurant, transport, withAdvance, multiSplit, budget, rule } =
      await seed(dataService);
    const backup = await dataService.createBackup();

    expect(backup.format).toBe(BACKUP_FORMAT_ID);
    expect(backup.version).toBe(BACKUP_FORMAT_VERSION);
    expect(typeof backup.createdAt).toBe('string');

    expect(backup.data.accounts.map((a) => a.id).sort()).toEqual([checking.id, savings.id].sort());
    expect(backup.data.categories).toHaveLength(27);
    expect(backup.data.transactions.length).toBeGreaterThanOrEqual(5); // 4 created + 1 transfer mirror
    expect(backup.data.transactionSplits).toHaveLength(3); // 1 for withAdvance + 2 for multiSplit
    expect(backup.data.transactionSplits[0]).toMatchObject({
      transaction_id: withAdvance.id,
      category_id: restaurant.id,
      advanced: 1,
    });
    expect(
      backup.data.transactionSplits.filter((s) => s.transaction_id === multiSplit.id).map((s) => s.category_id)
    ).toEqual([restaurant.id, transport.id]);
    expect(backup.data.budgets).toHaveLength(1);
    expect(backup.data.budgets[0]).toMatchObject({ id: budget.id, category_id: restaurant.id, carry_over: 1 });
    expect(backup.data.recurrenceRules).toHaveLength(1);
    expect(backup.data.recurrenceRules[0]).toMatchObject({ id: rule.id, name: 'Loyer' });
    expect(backup.data.settings).toContainEqual({ key: 'roundedKeypad', value: '1' });
  });

  it('restores into an empty database with everything identical', async () => {
    await seed(dataService);
    const backup = await dataService.createBackup();

    const target = await createTestDataService();
    await target.dataService.restoreBackup(JSON.stringify(backup));

    expect(await target.dataService.listAccounts()).toEqual(await dataService.listAccounts());
    expect(await target.dataService.listCategories()).toEqual(await dataService.listCategories());
    expect(await target.dataService.getBalanceTotals()).toEqual(await dataService.getBalanceTotals());
    expect(await target.dataService.listMonthTransactions({ year: 2026, month: 8 })).toEqual(
      await dataService.listMonthTransactions({ year: 2026, month: 8 })
    );
    expect(await target.dataService.getPendingAdvances()).toEqual(await dataService.getPendingAdvances());
    expect(await target.dataService.getSettings()).toEqual(await dataService.getSettings());
    expect(await target.dataService.listRecurrenceRules()).toEqual(await dataService.listRecurrenceRules());

    await target.close();
  });

  it('carries a reimbursed advance through so it does not come back as pending (#21)', async () => {
    await seed(dataService);
    const [pending] = await dataService.listPendingAdvances();
    expect(pending).toBeDefined();
    await dataService.markAdvanceReimbursed(pending.splitId);
    expect(await dataService.getPendingAdvances()).toEqual({ count: 0, total: 0 });

    const backup = await dataService.createBackup();
    const target = await createTestDataService();
    await target.dataService.restoreBackup(JSON.stringify(backup));

    expect(await target.dataService.getPendingAdvances()).toEqual({ count: 0, total: 0 });
    expect(await target.dataService.listPendingAdvances()).toEqual([]);

    await target.close();
  });

  it('overwrites a non-empty database entirely', async () => {
    await dataService.createAccount({ name: 'À écraser', initialBalance: 500 });

    const source = await createTestDataService();
    await seed(source.dataService);
    const backup = await source.dataService.createBackup();

    await dataService.restoreBackup(JSON.stringify(backup));

    const accounts = await dataService.listAccounts();
    expect(accounts.map((a) => a.name).sort()).toEqual(['Compte courant', 'Livret A']);

    await source.close();
  });

  it('notifies subscribers after a successful import', async () => {
    const backup = await dataService.createBackup();
    const listener = jest.fn();
    dataService.subscribe(listener);

    await dataService.restoreBackup(JSON.stringify(backup));

    expect(listener).toHaveBeenCalled();
  });

  describe('refuses a bad file and leaves the database untouched', () => {
    const accountCountBefore = async () => (await dataService.listAccounts()).length;

    it('rejects text that is not JSON', async () => {
      const before = await accountCountBefore();
      await expect(dataService.restoreBackup('not json at all')).rejects.toThrow();
      expect(await accountCountBefore()).toBe(before);
    });

    it('rejects the wrong format identifier', async () => {
      const before = await accountCountBefore();
      const bad = { format: 'something-else', version: 1, createdAt: 'x', data: {} };
      await expect(dataService.restoreBackup(JSON.stringify(bad))).rejects.toThrow();
      expect(await accountCountBefore()).toBe(before);
    });

    it('rejects a format version newer than the app understands', async () => {
      const backup = await dataService.createBackup();
      const before = await accountCountBefore();
      const tooNew = { ...backup, version: BACKUP_FORMAT_VERSION + 1 };
      await expect(dataService.restoreBackup(JSON.stringify(tooNew))).rejects.toThrow(/plus récente/);
      expect(await accountCountBefore()).toBe(before);
    });

    it('rejects a file missing one of the expected tables', async () => {
      const backup = await dataService.createBackup();
      const before = await accountCountBefore();
      const missing = { ...backup, data: { ...backup.data, budgets: undefined } };
      await expect(dataService.restoreBackup(JSON.stringify(missing))).rejects.toThrow();
      expect(await accountCountBefore()).toBe(before);
    });

    it('rejects a file with an invalid transaction reference', async () => {
      await seed(dataService);
      const backup = await dataService.createBackup();
      const before = await accountCountBefore();
      const broken = {
        ...backup,
        data: {
          ...backup.data,
          transactions: [
            ...backup.data.transactions,
            {
              id: 999999,
              account_id: 999999,
              operation_date: '2026-01-01',
              bank_date: null,
              comment: '',
              amount: -1,
              category_id: null,
              status: 'non_pointe',
              mirror_transaction_id: null,
              recurrence_rule_id: null,
            },
          ],
        },
      };
      await expect(dataService.restoreBackup(JSON.stringify(broken))).rejects.toThrow();
      expect(await accountCountBefore()).toBe(before);
    });

    it('rejects a file with a budget pointing at a non-existent category', async () => {
      await seed(dataService);
      const backup = await dataService.createBackup();
      const before = await accountCountBefore();
      const broken = {
        ...backup,
        data: {
          ...backup.data,
          budgets: [
            ...backup.data.budgets,
            { id: 999999, category_id: 999999, amount: 10, period: 'monthly', carry_over: 0, start_month: '2026-09' },
          ],
        },
      };
      await expect(dataService.restoreBackup(JSON.stringify(broken))).rejects.toThrow();
      expect(await accountCountBefore()).toBe(before);
    });

    it('rejects a file with a recurrence rule pointing at a non-existent account', async () => {
      await seed(dataService);
      const backup = await dataService.createBackup();
      const before = await accountCountBefore();
      const broken = {
        ...backup,
        data: {
          ...backup.data,
          recurrenceRules: [
            ...backup.data.recurrenceRules,
            {
              id: 999999,
              name: 'Règle fantôme',
              account_id: 999999,
              amount: -10,
              category_id: null,
              frequency: 'monthly',
              reference_date: '2026-09-01',
              automatic: 0,
              active: 1,
              end_date: null,
              generated_until: null,
            },
          ],
        },
      };
      await expect(dataService.restoreBackup(JSON.stringify(broken))).rejects.toThrow();
      expect(await accountCountBefore()).toBe(before);
    });
  });
});

describe('dataService — export CSV (exportCsv)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
  });

  afterEach(() => close());

  it('produces one CSV per table with readable, French-formatted content', async () => {
    const { multiSplit } = await seed(dataService);
    const files = await dataService.exportCsv();

    expect(files.map((f) => f.filename)).toEqual([
      'transactions.csv',
      'splits.csv',
      'comptes.csv',
      'categories.csv',
      'budgets.csv',
      'recurrences.csv',
    ]);

    for (const file of files) {
      expect(file.content.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
    }

    const transactions = files.find((f) => f.filename === 'transactions.csv')!.content;
    const transactionLines = transactions.replace('﻿', '').trim().split('\r\n');
    expect(transactionLines[0]).toBe('Id;Compte;Date opération;Date banque;Commentaire;Montant;Catégorie;Statut');
    // Account and category names replace ids, amount uses a comma, date stays AAAA-MM-JJ, and status is a French label.
    expect(transactionLines.some((line) => line.includes('Compte courant') && line.includes('2026-09-05'))).toBe(
      true
    );
    expect(transactions).toContain('−200,00'.replace('−', '-')); // sign kept, comma decimal
    expect(transactions).toContain('Non pointé');
    // The comment with `;`, `"` and a newline is quoted and its quotes doubled.
    expect(transactions).toContain('"Resto avec ; des "", des\nretours"');

    const splits = files.find((f) => f.filename === 'splits.csv')!.content;
    expect(splits).toContain('Restaurant');
    expect(splits).toContain('Oui'); // advanced
    // A split transaction lands on multiple CSV rows, one per portion, sharing the same transaction id.
    const splitLines = splits.replace('﻿', '').trim().split('\r\n').slice(1);
    expect(splitLines).toHaveLength(3);
    const multiSplitLines = splitLines.filter((line) => line.split(';')[1] === String(multiSplit.id));
    expect(multiSplitLines).toHaveLength(2);
    expect(multiSplitLines.map((line) => line.split(';')[2]).sort()).toEqual(
      ['Restaurant', 'Transports autres'].sort()
    );

    const budgets = files.find((f) => f.filename === 'budgets.csv')!.content;
    expect(budgets).toContain('Restaurant');
    expect(budgets).toContain('Oui'); // carry-over

    const recurrences = files.find((f) => f.filename === 'recurrences.csv')!.content;
    expect(recurrences).toContain('Loyer');
    expect(recurrences).toContain('Mensuelle');
    expect(recurrences).toContain('Non'); // automatic defaults to off

    const comptes = files.find((f) => f.filename === 'comptes.csv')!.content;
    expect(comptes).toContain('Compte courant');
    expect(comptes).toContain('1000,00');

    const categoriesCsv = files.find((f) => f.filename === 'categories.csv')!.content;
    expect(categoriesCsv).toContain('Restaurant');
  });

  it('produces an empty-but-headered CSV when there is nothing to export', async () => {
    const files = await dataService.exportCsv();
    const transactions = files.find((f) => f.filename === 'transactions.csv')!.content;
    expect(transactions.replace('﻿', '').trim()).toBe(
      'Id;Compte;Date opération;Date banque;Commentaire;Montant;Catégorie;Statut'
    );
  });
});
