import { DEFAULT_CATEGORIES } from '../data/defaultCategories';
import { SCHEMA_SQL } from '../db/schema';
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

/** Transaction without split — split arrives with the "Split + inter-account moves" ticket (#7). */
export interface Transaction {
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
}

/** A transaction joined with what a list row needs to display it. */
export interface TransactionListItem extends Transaction {
  accountName: string;
  categoryName: string | null;
  categoryIcon: string | null;
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
}

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
}

interface TransactionListRow extends TransactionRow {
  account_name: string;
  category_name: string | null;
  category_icon: string | null;
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

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    operationDate: row.operation_date,
    bankDate: row.bank_date,
    comment: row.comment,
    amount: row.amount,
    categoryId: row.category_id,
    status: row.status,
  };
}

function toTransactionListItem(row: TransactionListRow): TransactionListItem {
  return {
    ...toTransaction(row),
    accountName: row.account_name,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
  };
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
  SELECT t.*, a.name AS account_name, c.name AS category_name, c.icon AS category_icon
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
    await db.runAsync('DELETE FROM transactions WHERE account_id = ?', [id]);
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
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

  async function createTransaction(input: NewTransaction): Promise<Transaction> {
    const transaction: Omit<Transaction, 'id'> = {
      accountId: input.accountId,
      operationDate: input.operationDate,
      bankDate: input.bankDate ?? null,
      comment: input.comment ?? '',
      amount: input.amount,
      categoryId: input.categoryId ?? null,
      status: input.status ?? 'non_pointe',
    };
    const result = await db.runAsync(
      `INSERT INTO transactions
         (account_id, operation_date, bank_date, comment, amount, category_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction.accountId,
        transaction.operationDate,
        transaction.bankDate,
        transaction.comment,
        transaction.amount,
        transaction.categoryId,
        transaction.status,
      ]
    );
    notifyChange();
    return { id: result.lastInsertRowId, ...transaction };
  }

  async function getTransaction(id: number): Promise<Transaction | null> {
    const row = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [
      id,
    ]);
    return row ? toTransaction(row) : null;
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
  };
}

export type DataService = ReturnType<typeof createDataService>;
