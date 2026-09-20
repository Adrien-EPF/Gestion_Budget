import { DEFAULT_CATEGORIES, TRANSFER_CATEGORY_NAME } from '../data/defaultCategories';
import { COLUMN_MIGRATIONS, SCHEMA_SQL } from '../db/schema';
import type { SqlDatabase } from '../db/types';

export type CategoryKind = 'expense' | 'income' | 'both';

export interface Category {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  hidden: boolean;
  order: number;
}

export interface Account {
  id: number;
  name: string;
  initialBalance: number;
  createdAt: string;
  archived: boolean;
}

export type TransactionStatus = 'non_pointe' | 'pointe' | 'prevision' | 'flux_comptable';

/** One portion of a transaction's répartition. */
export interface SplitLine {
  categoryId: number | null;
  /** Signed like the transaction it belongs to. */
  amount: number;
  /** Money advanced for someone else, waiting to be paid back. */
  advanced: boolean;
}

/**
 * A portion as the caller writes it: a fixed `amount` or a `percent` of
 * the transaction total, never both. Stored as an amount either way.
 */
export interface NewSplitLine {
  categoryId?: number | null;
  amount?: number;
  percent?: number;
  advanced?: boolean;
}

interface TransactionFields {
  id: number;
  accountId: number;
  /** ISO calendar date, `YYYY-MM-DD`. */
  operationDate: string;
  bankDate: string | null;
  comment: string;
  /** Signed: negative for an expense, positive for an income. */
  amount: number;
  categoryId: number | null;
  status: TransactionStatus;
  /** The other leg of an inter-account movement, when this is one. */
  mirrorTransactionId: number | null;
}

export interface Transaction extends TransactionFields {
  /** Empty when the transaction isn't split. */
  splits: SplitLine[];
}

/** A transaction joined with what a list row needs to display it. */
export interface TransactionListItem extends TransactionFields {
  accountName: string;
  categoryName: string | null;
  categoryIcon: string | null;
  /** Absolute total of the portions marked Avancé; 0 when there are none. */
  advancedAmount: number;
}

export interface NewTransaction {
  accountId: number;
  operationDate: string;
  bankDate?: string | null;
  comment?: string;
  amount: number;
  categoryId?: number | null;
  /** Defaults to Non Pointé, the status of anything freshly entered by hand. */
  status?: TransactionStatus;
  /**
   * Répartition over several categories. The portions must add up to
   * `amount` (or to 100 %) — checked before anything is written.
   */
  splits?: NewSplitLine[];
  /**
   * Required with the « Mouvement inter-compte » category, and only then:
   * the account that receives the money. Its mirror transaction is
   * created in the same write.
   */
  transferToAccountId?: number;
}

export interface PendingAdvances {
  /** Number of portions marked Avancé. */
  count: number;
  total: number;
}

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  /** Monthly ceiling, before any carry-over. */
  amount: number;
  carryOver: boolean;
  /** First month the budget applies to; carry-over never reaches back before it. */
  startMonth: MonthRef;
}

export interface NewBudget {
  categoryId: number;
  amount: number;
  carryOver?: boolean;
  /** Defaults to the current month. */
  startMonth?: MonthRef;
}

/** A budget measured against one month of activity. */
export interface BudgetProgress {
  budget: Budget;
  spent: number;
  /** Unconsumed balance of the previous month, when carry-over is on. */
  carriedOver: number;
  /** `budget.amount` + `carriedOver`. */
  ceiling: number;
  /** `ceiling - spent`; negative once exceeded. */
  remaining: number;
  /** `spent / ceiling` capped to [0, 1] — the bar never grows past its track. */
  fillRatio: number;
  exceeded: boolean;
  /** Past 85 % of the ceiling: the bar switches to the « à surveiller » tint. */
  watch: boolean;
}

export interface BudgetOverview {
  budgets: BudgetProgress[];
  /** Σ spent over the listed budgets. */
  spent: number;
  /** Σ ceilings over the listed budgets. */
  planned: number;
}

/** Above this share of its ceiling a budget is tinted « à surveiller » (handoff §6.3). */
export const BUDGET_WATCH_THRESHOLD = 0.85;

export interface MonthRef {
  year: number;
  /** 0-11, like `Date#getMonth`. */
  month: number;
}

export interface AccountSummary {
  account: Account;
  realBalance: number;
  pointedBalance: number;
  /** Operations dated within the requested month (every status). */
  monthOperationCount: number;
}

export interface BalanceTotals {
  realBalance: number;
  pointedBalance: number;
}

export interface MonthSummary {
  expenses: number;
  income: number;
  forecastCount: number;
  /** Earliest Prévision of the month, for the factual note on Accueil. */
  firstForecast: { comment: string; operationDate: string } | null;
}

interface CategoryRow {
  id: number;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  hidden: number;
  sort_order: number;
}

interface AccountRow {
  id: number;
  name: string;
  initial_balance: number;
  created_at: string;
  archived: number;
}

interface TransactionRow {
  id: number;
  account_id: number;
  operation_date: string;
  bank_date: string | null;
  comment: string;
  amount: number;
  category_id: number | null;
  status: TransactionStatus;
  mirror_transaction_id: number | null;
}

interface TransactionListRow extends TransactionRow {
  account_name: string;
  category_name: string | null;
  category_icon: string | null;
  advanced_amount: number;
}

interface SplitRow {
  category_id: number | null;
  amount: number;
  advanced: number;
}

interface BudgetRow {
  id: number;
  category_id: number;
  category_name: string;
  amount: number;
  carry_over: number;
  start_month: string;
}

interface AccountSummaryRow extends AccountRow {
  real_balance: number;
  pointed_balance: number;
  month_count: number;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    icon: row.icon,
    color: row.color,
    hidden: row.hidden === 1,
    order: row.sort_order,
  };
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    initialBalance: row.initial_balance,
    createdAt: row.created_at,
    archived: row.archived === 1,
  };
}

function toTransactionFields(row: TransactionRow): TransactionFields {
  return {
    id: row.id,
    accountId: row.account_id,
    operationDate: row.operation_date,
    bankDate: row.bank_date,
    comment: row.comment,
    amount: row.amount,
    categoryId: row.category_id,
    status: row.status,
    mirrorTransactionId: row.mirror_transaction_id,
  };
}

function toTransactionListItem(row: TransactionListRow): TransactionListItem {
  return {
    ...toTransactionFields(row),
    accountName: row.account_name,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    advancedAmount: roundToCents(row.advanced_amount),
  };
}

function toSplitLine(row: SplitRow): SplitLine {
  return { categoryId: row.category_id, amount: row.amount, advanced: row.advanced === 1 };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

function monthKey({ year, month }: MonthRef): string {
  return `${year}-${pad2(month + 1)}`;
}

function parseMonthKey(key: string): MonthRef {
  const [year, month] = key.split('-').map(Number);
  return { year, month: month - 1 };
}

function nextMonth({ year, month }: MonthRef): MonthRef {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    amount: row.amount,
    carryOver: row.carry_over === 1,
    startMonth: parseMonthKey(row.start_month),
  };
}

const toCents = (value: number) => Math.round(value * 100);

/**
 * Turns what the caller wrote into stored portions and enforces the
 * split rule up front: the parts always add up to the total, or nothing
 * is written (#3 « Split »).
 */
function resolveSplits(total: number, lines: NewSplitLine[]): SplitLine[] {
  if (lines.length === 0) return [];

  for (const line of lines) {
    const given = [line.amount, line.percent].filter((v) => v !== undefined);
    if (given.length !== 1 || !Number.isFinite(given[0])) {
      throw new Error('Each split portion needs exactly one of `amount` or `percent`.');
    }
  }

  let amounts: number[];
  if (lines.every((line) => line.percent !== undefined)) {
    const percentSum = lines.reduce((sum, line) => sum + (line.percent as number), 0);
    if (toCents(percentSum) !== 10000) {
      throw new Error(`Split percentages must add up to 100 (got ${percentSum}).`);
    }
    amounts = lines.map((line) => roundToCents((total * (line.percent as number)) / 100));
    // Rounding each share can leave a cent over or under; the last portion absorbs it.
    const drift = roundToCents(total - amounts.reduce((sum, a) => sum + a, 0));
    amounts[amounts.length - 1] = roundToCents(amounts[amounts.length - 1] + drift);
  } else {
    amounts = lines.map((line) =>
      line.amount !== undefined ? line.amount : roundToCents((total * (line.percent as number)) / 100)
    );
    const sum = amounts.reduce((acc, a) => acc + a, 0);
    if (toCents(sum) !== toCents(total)) {
      throw new Error(`Split portions must add up to the total ${total} (got ${roundToCents(sum)}).`);
    }
  }

  return lines.map((line, i) => ({
    categoryId: line.categoryId ?? null,
    amount: amounts[i],
    advanced: line.advanced ?? false,
  }));
}

/** Amounts are stored as REAL; summing many of them drifts by fractions of a cent. */
function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** `[first day, first day of next month)` as ISO dates, for range filtering on `operation_date`. */
function monthBounds({ year, month }: MonthRef): [string, string] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${year}-${pad(month + 1)}-01`;
  const end = month === 11 ? `${year + 1}-01-01` : `${year}-${pad(month + 2)}-01`;
  return [start, end];
}

const LIST_SELECT = `
  SELECT t.*, a.name AS account_name, c.name AS category_name, c.icon AS category_icon,
    COALESCE((SELECT SUM(ABS(s.amount)) FROM transaction_splits s
              WHERE s.transaction_id = t.id AND s.advanced = 1), 0) AS advanced_amount
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  LEFT JOIN categories c ON c.id = t.category_id`;

/** Two-letter placeholder initials for a category, per DESIGN.md's circle-with-initials icon placeholder. */
function deriveInitials(name: string): string {
  const tokens = name.split(/[\s/]+/).filter(Boolean);
  if (tokens.length >= 2) {
    return (tokens[0][0] + tokens[1][0]).toUpperCase();
  }
  return tokens[0].slice(0, 2).toUpperCase();
}

/**
 * The single entry point for all reads/writes. No screen or component may
 * touch the SQL driver directly (see #4 / #3 "Testing Decisions") — this
 * is the app's one seam of test.
 */
export function createDataService(db: SqlDatabase) {
  const listeners = new Set<() => void>();

  /** Screens stay mounted across tab switches, so they re-read whenever a write lands. */
  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function notifyChange(): void {
    listeners.forEach((listener) => listener());
  }

  async function initialize(): Promise<void> {
    await db.execAsync(SCHEMA_SQL);

    for (const { table, column, definition } of COLUMN_MIGRATIONS) {
      const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
      if (!columns.some((c) => c.name === column)) {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    }

    const existing = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );
    if (existing && existing.count === 0) {
      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const seed = DEFAULT_CATEGORIES[i];
        await db.runAsync(
          'INSERT INTO categories (name, kind, icon, color, hidden, sort_order) VALUES (?, ?, ?, ?, 0, ?)',
          [seed.name, seed.kind, deriveInitials(seed.name), null, i + 1]
        );
      }
    }
  }

  async function listCategories(): Promise<Category[]> {
    const rows = await db.getAllAsync<CategoryRow>(
      'SELECT * FROM categories ORDER BY sort_order ASC'
    );
    return rows.map(toCategory);
  }

  async function listAccounts(options?: { includeArchived?: boolean }): Promise<Account[]> {
    const includeArchived = options?.includeArchived ?? true;
    const rows = await db.getAllAsync<AccountRow>(
      includeArchived
        ? 'SELECT * FROM accounts ORDER BY created_at ASC'
        : 'SELECT * FROM accounts WHERE archived = 0 ORDER BY created_at ASC'
    );
    return rows.map(toAccount);
  }

  async function getAccount(id: number): Promise<Account | null> {
    const row = await db.getFirstAsync<AccountRow>('SELECT * FROM accounts WHERE id = ?', [id]);
    return row ? toAccount(row) : null;
  }

  async function createAccount(input: { name: string; initialBalance: number }): Promise<Account> {
    const createdAt = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO accounts (name, initial_balance, created_at, archived) VALUES (?, ?, ?, 0)',
      [input.name, input.initialBalance, createdAt]
    );
    notifyChange();
    return {
      id: result.lastInsertRowId,
      name: input.name,
      initialBalance: input.initialBalance,
      createdAt,
      archived: false,
    };
  }

  async function renameAccount(id: number, name: string): Promise<void> {
    await db.runAsync('UPDATE accounts SET name = ? WHERE id = ?', [name, id]);
    notifyChange();
  }

  async function archiveAccount(id: number): Promise<void> {
    await db.runAsync('UPDATE accounts SET archived = 1 WHERE id = ?', [id]);
    notifyChange();
  }

  async function updateInitialBalance(id: number, initialBalance: number): Promise<void> {
    await db.runAsync('UPDATE accounts SET initial_balance = ? WHERE id = ?', [
      initialBalance,
      id,
    ]);
    notifyChange();
  }

  /** Deleting an account takes its transactions with it — an account that never existed has no history. */
  async function deleteAccount(id: number): Promise<void> {
    await db.transactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM transaction_splits
         WHERE transaction_id IN (SELECT id FROM transactions WHERE account_id = ?)`,
        [id]
      );
      // The other leg of a transfer stays on its own account, no longer linked to a deleted twin.
      await db.runAsync(
        `UPDATE transactions SET mirror_transaction_id = NULL
         WHERE mirror_transaction_id IN (SELECT id FROM transactions WHERE account_id = ?)`,
        [id]
      );
      await db.runAsync('DELETE FROM transactions WHERE account_id = ?', [id]);
      await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
    });
    notifyChange();
  }

  /**
   * The account a quick entry lands on: the oldest active one. There is no
   * "selected account" notion in the UI yet, and the first account a user
   * creates is the one they live in day to day.
   */
  async function getCurrentAccount(): Promise<Account | null> {
    const row = await db.getFirstAsync<AccountRow>(
      'SELECT * FROM accounts WHERE archived = 0 ORDER BY created_at ASC, id ASC LIMIT 1'
    );
    return row ? toAccount(row) : null;
  }

  async function getTransferCategoryId(): Promise<number | null> {
    const row = await db.getFirstAsync<{ id: number }>('SELECT id FROM categories WHERE name = ?', [
      TRANSFER_CATEGORY_NAME,
    ]);
    return row?.id ?? null;
  }

  /**
   * Every rule about what a transaction may look like is checked here,
   * before the first row is written; the rows themselves (the transaction,
   * its portions, a transfer's mirror) land in one atomic write.
   */
  async function createTransaction(input: NewTransaction): Promise<Transaction> {
    const splits = resolveSplits(input.amount, input.splits ?? []);
    const isTransfer =
      input.categoryId != null && input.categoryId === (await getTransferCategoryId());

    if (isTransfer) {
      if (input.transferToAccountId === undefined) {
        throw new Error(`« ${TRANSFER_CATEGORY_NAME} » needs a destination account.`);
      }
      if (input.transferToAccountId === input.accountId) {
        throw new Error('A transfer needs two different accounts.');
      }
      if (splits.length > 0) {
        throw new Error('An inter-account movement cannot be split.');
      }
      if (!(await getAccount(input.transferToAccountId))) {
        throw new Error(`Destination account ${input.transferToAccountId} does not exist.`);
      }
    } else if (input.transferToAccountId !== undefined) {
      throw new Error(`A destination account only goes with « ${TRANSFER_CATEGORY_NAME} ».`);
    }

    const fields: Omit<TransactionFields, 'id' | 'mirrorTransactionId'> = {
      accountId: input.accountId,
      operationDate: input.operationDate,
      bankDate: input.bankDate ?? null,
      comment: input.comment ?? '',
      amount: input.amount,
      categoryId: input.categoryId ?? splits[0]?.categoryId ?? null,
      status: input.status ?? 'non_pointe',
    };

    const insert = async (values: typeof fields) =>
      (
        await db.runAsync(
          `INSERT INTO transactions
             (account_id, operation_date, bank_date, comment, amount, category_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            values.accountId,
            values.operationDate,
            values.bankDate,
            values.comment,
            values.amount,
            values.categoryId,
            values.status,
          ]
        )
      ).lastInsertRowId;

    let id = 0;
    let mirrorTransactionId: number | null = null;
    await db.transactionAsync(async () => {
      id = await insert(fields);
      for (const line of splits) {
        await db.runAsync(
          'INSERT INTO transaction_splits (transaction_id, category_id, amount, advanced) VALUES (?, ?, ?, ?)',
          [id, line.categoryId, line.amount, line.advanced ? 1 : 0]
        );
      }
      if (isTransfer) {
        mirrorTransactionId = await insert({
          ...fields,
          accountId: input.transferToAccountId as number,
          amount: -input.amount,
        });
        await db.runAsync('UPDATE transactions SET mirror_transaction_id = ? WHERE id = ?', [
          mirrorTransactionId,
          id,
        ]);
        await db.runAsync('UPDATE transactions SET mirror_transaction_id = ? WHERE id = ?', [
          id,
          mirrorTransactionId,
        ]);
      }
    });
    notifyChange();
    return { id, ...fields, mirrorTransactionId, splits };
  }

  async function getTransaction(id: number): Promise<Transaction | null> {
    const row = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [
      id,
    ]);
    if (!row) return null;
    const splitRows = await db.getAllAsync<SplitRow>(
      'SELECT category_id, amount, advanced FROM transaction_splits WHERE transaction_id = ? ORDER BY id ASC',
      [id]
    );
    return { ...toTransactionFields(row), splits: splitRows.map(toSplitLine) };
  }

  /**
   * Pointage only moves between Non Pointé and Pointé. Prévision and Flux
   * comptable are left untouched (handoff §7), which is why this is a
   * conditional UPDATE rather than a read-then-write: it stays correct
   * when a row is tapped twice in quick succession.
   */
  async function setPointed(id: number, pointed: boolean): Promise<void> {
    const [from, to] = pointed ? ['non_pointe', 'pointe'] : ['pointe', 'non_pointe'];
    const result = await db.runAsync(
      'UPDATE transactions SET status = ? WHERE id = ? AND status = ?',
      [to, id, from]
    );
    if (result.changes > 0) notifyChange();
  }

  /** Every operation dated in `month`, newest first, on active accounts. */
  async function listMonthTransactions(month: MonthRef): Promise<TransactionListItem[]> {
    const [start, end] = monthBounds(month);
    const rows = await db.getAllAsync<TransactionListRow>(
      `${LIST_SELECT}
       WHERE a.archived = 0 AND t.operation_date >= ? AND t.operation_date < ?
       ORDER BY t.operation_date DESC, t.id DESC`,
      [start, end]
    );
    return rows.map(toTransactionListItem);
  }

  /** Non Pointé operations of active accounts, optionally for one account, newest first. */
  async function listTransactionsToPoint(options?: {
    accountId?: number;
  }): Promise<TransactionListItem[]> {
    const accountId = options?.accountId;
    const rows = await db.getAllAsync<TransactionListRow>(
      `${LIST_SELECT}
       WHERE a.archived = 0 AND t.status = 'non_pointe'
         ${accountId === undefined ? '' : 'AND t.account_id = ?'}
       ORDER BY t.operation_date DESC, t.id DESC`,
      accountId === undefined ? [] : [accountId]
    );
    return rows.map(toTransactionListItem);
  }

  async function countToPoint(): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE a.archived = 0 AND t.status = 'non_pointe'`
    );
    return row?.count ?? 0;
  }

  /**
   * Balances are computed in SQL, not folded in memory by the UI, so they
   * stay cheap with years of history (#3 story 63).
   *  - pointé = initial balance + Σ Pointé
   *  - réel   = initial balance + Σ everything except Flux comptable
   */
  async function listAccountSummaries(month: MonthRef): Promise<AccountSummary[]> {
    const [start, end] = monthBounds(month);
    const rows = await db.getAllAsync<AccountSummaryRow>(
      `SELECT a.*,
         a.initial_balance
           + COALESCE(SUM(CASE WHEN t.status <> 'flux_comptable' THEN t.amount END), 0) AS real_balance,
         a.initial_balance
           + COALESCE(SUM(CASE WHEN t.status = 'pointe' THEN t.amount END), 0) AS pointed_balance,
         COUNT(CASE WHEN t.operation_date >= ? AND t.operation_date < ? THEN 1 END) AS month_count
       FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
       GROUP BY a.id
       ORDER BY a.created_at ASC, a.id ASC`,
      [start, end]
    );
    return rows.map((row) => ({
      account: toAccount(row),
      realBalance: roundToCents(row.real_balance),
      pointedBalance: roundToCents(row.pointed_balance),
      monthOperationCount: row.month_count,
    }));
  }

  /** Total across active accounts; archived accounts keep their own balance but leave the total. */
  async function getBalanceTotals(): Promise<BalanceTotals> {
    const summaries = await listAccountSummaries({ year: 1970, month: 0 });
    const active = summaries.filter((s) => !s.account.archived);
    return {
      realBalance: roundToCents(active.reduce((sum, s) => sum + s.realBalance, 0)),
      pointedBalance: roundToCents(active.reduce((sum, s) => sum + s.pointedBalance, 0)),
    };
  }

  /** Dépenses / recettes of the month: real activity only, so no Flux comptable and no Prévision. */
  async function getMonthSummary(month: MonthRef): Promise<MonthSummary> {
    const [start, end] = monthBounds(month);
    const range = 'a.archived = 0 AND t.operation_date >= ? AND t.operation_date < ?';

    const totals = await db.getFirstAsync<{ expenses: number | null; income: number | null }>(
      `SELECT
         SUM(CASE WHEN t.amount < 0 THEN -t.amount END) AS expenses,
         SUM(CASE WHEN t.amount > 0 THEN t.amount END) AS income
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE ${range} AND t.status IN ('non_pointe', 'pointe')`,
      [start, end]
    );
    const forecasts = await db.getAllAsync<{ comment: string; operation_date: string }>(
      `SELECT t.comment, t.operation_date
       FROM transactions t JOIN accounts a ON a.id = t.account_id
       WHERE ${range} AND t.status = 'prevision'
       ORDER BY t.operation_date ASC, t.id ASC`,
      [start, end]
    );

    return {
      expenses: roundToCents(totals?.expenses ?? 0),
      income: roundToCents(totals?.income ?? 0),
      forecastCount: forecasts.length,
      firstForecast: forecasts[0]
        ? { comment: forecasts[0].comment, operationDate: forecasts[0].operation_date }
        : null,
    };
  }

  /**
   * Advanced portions waiting to be paid back, over active accounts. There
   * is no reimbursement flow yet (the dedicated view is out of scope in
   * #3), so every portion marked Avancé counts as pending.
   */
  async function getPendingAdvances(): Promise<PendingAdvances> {
    const row = await db.getFirstAsync<{ count: number; total: number | null }>(
      `SELECT COUNT(*) AS count, SUM(ABS(s.amount)) AS total
       FROM transaction_splits s
       JOIN transactions t ON t.id = s.transaction_id
       JOIN accounts a ON a.id = t.account_id
       WHERE a.archived = 0 AND s.advanced = 1`
    );
    return { count: row?.count ?? 0, total: roundToCents(row?.total ?? 0) };
  }

  /** Categories a budget can still be created for: visible, able to carry an expense, not yet budgeted. */
  async function listCategoriesWithoutBudget(): Promise<Category[]> {
    const rows = await db.getAllAsync<CategoryRow>(
      `SELECT * FROM categories
       WHERE hidden = 0 AND kind IN ('expense', 'both')
         AND id NOT IN (SELECT category_id FROM budgets)
       ORDER BY sort_order ASC`
    );
    return rows.map(toCategory);
  }

  async function createBudget(input: NewBudget): Promise<Budget> {
    if (!(input.amount > 0)) throw new Error('A budget ceiling must be greater than zero.');
    const category = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', [
      input.categoryId,
    ]);
    if (!category) throw new Error(`Category ${input.categoryId} does not exist.`);
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM budgets WHERE category_id = ?',
      [input.categoryId]
    );
    if (existing) throw new Error(`« ${category.name} » already has a budget.`);

    const now = new Date();
    const startMonth = input.startMonth ?? { year: now.getFullYear(), month: now.getMonth() };
    const carryOver = input.carryOver ?? false;
    const result = await db.runAsync(
      'INSERT INTO budgets (category_id, amount, period, carry_over, start_month) VALUES (?, ?, ?, ?, ?)',
      [input.categoryId, input.amount, 'monthly', carryOver ? 1 : 0, monthKey(startMonth)]
    );
    notifyChange();
    return {
      id: result.lastInsertRowId,
      categoryId: input.categoryId,
      categoryName: category.name,
      amount: input.amount,
      carryOver,
      startMonth,
    };
  }

  async function setBudgetCarryOver(id: number, carryOver: boolean): Promise<void> {
    await db.runAsync('UPDATE budgets SET carry_over = ? WHERE id = ?', [carryOver ? 1 : 0, id]);
    notifyChange();
  }

  /**
   * Net spend of one category per month on `[from, to)`, as `YYYY-MM` -> amount.
   * Real activity only — Non Pointé and Pointé, like the month summary — on
   * active accounts. A split transaction counts through its portions'
   * categories, an unsplit one through its own; a refund offsets spending.
   */
  async function getCategorySpendByMonth(
    categoryId: number,
    from: string,
    to: string
  ): Promise<Map<string, number>> {
    const real = `a.archived = 0 AND t.status IN ('non_pointe', 'pointe')
                  AND t.operation_date >= ? AND t.operation_date < ?`;
    const rows = await db.getAllAsync<{ ym: string; net: number }>(
      `SELECT ym, SUM(amount) AS net FROM (
         SELECT substr(t.operation_date, 1, 7) AS ym, t.amount AS amount
         FROM transactions t JOIN accounts a ON a.id = t.account_id
         WHERE ${real} AND t.category_id = ?
           AND NOT EXISTS (SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id)
         UNION ALL
         SELECT substr(t.operation_date, 1, 7) AS ym, s.amount AS amount
         FROM transaction_splits s
         JOIN transactions t ON t.id = s.transaction_id
         JOIN accounts a ON a.id = t.account_id
         WHERE ${real} AND s.category_id = ?
       ) GROUP BY ym`,
      [from, to, categoryId, from, to, categoryId]
    );
    return new Map(rows.map((row) => [row.ym, Math.max(0, roundToCents(-row.net))]));
  }

  /**
   * Walks the months from the budget's start to `month`. With carry-over
   * on, what was left unspent of last month's ceiling (its own carry
   * included, never below zero) is added to this month's.
   */
  async function measureBudget(budget: Budget, month: MonthRef): Promise<BudgetProgress> {
    const spentByMonth = await getCategorySpendByMonth(
      budget.categoryId,
      monthBounds(budget.startMonth)[0],
      monthBounds(month)[1]
    );

    let carriedOver = 0;
    let ceiling = budget.amount;
    let spent = spentByMonth.get(monthKey(budget.startMonth)) ?? 0;
    for (
      let current = nextMonth(budget.startMonth);
      monthKey(current) <= monthKey(month);
      current = nextMonth(current)
    ) {
      carriedOver = budget.carryOver ? roundToCents(Math.max(0, ceiling - spent)) : 0;
      ceiling = roundToCents(budget.amount + carriedOver);
      spent = spentByMonth.get(monthKey(current)) ?? 0;
    }

    return {
      budget,
      spent,
      carriedOver,
      ceiling,
      remaining: roundToCents(ceiling - spent),
      fillRatio: ceiling > 0 ? Math.min(1, spent / ceiling) : spent > 0 ? 1 : 0,
      exceeded: spent > ceiling,
      watch: spent > ceiling * BUDGET_WATCH_THRESHOLD,
    };
  }

  /** Budgets in force during `month`, each measured against that month, in category order. */
  async function getBudgetOverview(month: MonthRef): Promise<BudgetOverview> {
    const rows = await db.getAllAsync<BudgetRow>(
      `SELECT b.*, c.name AS category_name
       FROM budgets b JOIN categories c ON c.id = b.category_id
       WHERE b.start_month <= ?
       ORDER BY c.sort_order ASC`,
      [monthKey(month)]
    );
    const budgets = await Promise.all(rows.map((row) => measureBudget(toBudget(row), month)));
    return {
      budgets,
      spent: roundToCents(budgets.reduce((sum, b) => sum + b.spent, 0)),
      planned: roundToCents(budgets.reduce((sum, b) => sum + b.ceiling, 0)),
    };
  }

  return {
    initialize,
    subscribe,
    listCategories,
    listAccounts,
    getAccount,
    createAccount,
    renameAccount,
    archiveAccount,
    updateInitialBalance,
    deleteAccount,
    getCurrentAccount,
    createTransaction,
    getTransaction,
    setPointed,
    listMonthTransactions,
    listTransactionsToPoint,
    countToPoint,
    listAccountSummaries,
    getBalanceTotals,
    getMonthSummary,
    getPendingAdvances,
    listCategoriesWithoutBudget,
    createBudget,
    setBudgetCarryOver,
    getBudgetOverview,
  };
}

export type DataService = ReturnType<typeof createDataService>;
