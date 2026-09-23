import {
  BACKUP_FORMAT_ID,
  BACKUP_FORMAT_VERSION,
  parseBackupFile,
  type BackupAccountRow,
  type BackupBudgetRow,
  type BackupCategoryRow,
  type BackupFile,
  type BackupRecurrenceRuleRow,
  type BackupSettingRow,
  type BackupSplitRow,
  type BackupTransactionRow,
} from '../backup/backupFormat';
import { buildCsv, csvBool, formatCsvAmount } from '../backup/csv';
import { DEFAULT_CATEGORIES, TRANSFER_CATEGORY_NAME } from '../data/defaultCategories';
import { COLUMN_MIGRATIONS, SCHEMA_SQL } from '../db/schema';
import type { SqlDatabase } from '../db/types';
import { toIsoDate } from '../utils/dates';
import {
  nextDay,
  nextOccurrenceOnOrAfter,
  occurrencesBetween,
  type RecurrenceFrequency,
} from '../utils/recurrence';
import { FREQUENCY_LABELS } from '../utils/recurrenceCopy';
import { STATUS_LABELS } from '../utils/statusCopy';

export type { RecurrenceFrequency };

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

export interface NewCategory {
  name: string;
  kind: CategoryKind;
  /** One of the fixed palette's hex values; `null`/omitted keeps the placeholder tint. */
  color?: string | null;
}

/** What may be changed on an existing category — never its `kind`, fixed at creation. */
export interface CategoryChanges {
  name?: string;
  color?: string | null;
  hidden?: boolean;
}

/** One portion marked Avancé, still waiting to be paid back, as the dedicated screen lists it. */
export interface PendingAdvance {
  splitId: number;
  accountName: string;
  categoryName: string | null;
  /** Absolute value — an advance is always shown as a positive amount owed. */
  amount: number;
  operationDate: string;
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
  /** The recurrence rule that generated it, when it is an occurrence. */
  recurrenceRuleId: number | null;
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

export interface RecurrenceRule {
  id: number;
  /** What the occurrences are called (their comment) — « Loyer ». */
  name: string;
  accountId: number;
  /** Signed like a transaction: negative for an expense. */
  amount: number;
  categoryId: number | null;
  frequency: RecurrenceFrequency;
  /** ISO date of the first occurrence; the day of month / weekday / date of the rest follows it. */
  referenceDate: string;
  /** Explicit opt-in: off, occurrences wait for the user to validate them. */
  automatic: boolean;
  active: boolean;
  /** Last day an occurrence may fall on, when the rule ends. */
  endDate: string | null;
}

/** A rule joined with what its card displays. */
export interface RecurrenceRuleItem extends RecurrenceRule {
  accountName: string;
  categoryName: string | null;
  /** First occurrence dated today or later; `null` once the rule is paused or over. */
  nextOccurrence: string | null;
}

export interface NewRecurrenceRule {
  name: string;
  accountId: number;
  amount: number;
  categoryId?: number | null;
  frequency: RecurrenceFrequency;
  referenceDate: string;
  /** Defaults to off: automation is never on unless asked for. */
  automatic?: boolean;
  endDate?: string | null;
}

/** What may be changed on one generated occurrence, without touching its rule. */
export interface OccurrenceChanges {
  amount?: number;
  operationDate?: string;
  comment?: string;
}

export interface AppSettings {
  pinEnabled: boolean;
  biometricEnabled: boolean;
  checkReminderEnabled: boolean;
  monthlyBudgetReviewEnabled: boolean;
  roundedKeypad: boolean;
}

export type SettingKey = keyof AppSettings;

const DEFAULT_SETTINGS: AppSettings = {
  pinEnabled: false,
  biometricEnabled: false,
  checkReminderEnabled: false,
  monthlyBudgetReviewEnabled: false,
  roundedKeypad: false,
};

export interface StructureSummary {
  activeAccounts: number;
  archivedAccounts: number;
  /** Categories in use (not hidden). */
  categories: number;
  advances: PendingAdvances;
}

export interface ServiceOptions {
  /** The clock, injectable so date-dependent rules are testable. */
  now?: () => Date;
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

/** Where a month stands for a budget on the Bilan annuel: before its start, gone by, or still to come. */
export type BudgetMonthState = 'not_started' | 'realized' | 'upcoming';

/** One month of a budget over a year (§6.7 graphique 3). */
export interface BudgetMonth {
  /** 0-11. */
  month: number;
  state: BudgetMonthState;
  /** 0 before the budget started. */
  spent: number;
  /** `budget.amount` + `carriedOver`; 0 before the budget started. */
  ceiling: number;
  /** What the month before left unspent, when carry-over is on and that month has gone by. */
  carriedOver: number;
}

/** One budget over the twelve months of a year. */
export interface BudgetYear {
  budget: Budget;
  months: BudgetMonth[];
}

export interface BudgetYearOverview {
  /** Last month realized (0-11): December for a past year, the current month for this one; `null` for a year to come. */
  lastMonth: number | null;
  /** Budgets in force during at least one month of the year, in category order. */
  budgets: BudgetYear[];
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

/** Where a year of the Bilan annuel stands (§6.7): the selector's bounds and how much of it has happened. */
export interface YearStatus {
  /** Year of the earliest operation, whatever its status; `null` before the first one. */
  firstYear: number | null;
  currentYear: number;
  /** Last month counted as realized (0-11): December for a past year, the current month for this one; `null` for a year to come. */
  lastMonth: number | null;
  /** At least one operation dated that year, whatever its status. */
  hasOperations: boolean;
}

/** One category's line of the Bilan annuel (#25). Month arrays are indexed 0-11, like `MonthRef.month`. */
export interface CategoryYearFlow {
  categoryId: number | null;
  categoryName: string | null;
  expenses: number[];
  income: number[];
  totalExpenses: number;
  totalIncome: number;
}

/** How many operations one account had each month of the Bilan annuel's year (#25). */
export interface AccountYearCounts {
  account: Account;
  counts: number[];
  total: number;
}

/** One account's balances at the end of each month of the Bilan annuel's year (#25). */
export interface AccountYearBalances {
  account: Account;
  pointed: number[];
  real: number[];
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
  recurrence_rule_id: number | null;
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

interface FullSplitRow extends SplitRow {
  id: number;
  transaction_id: number;
}

interface BudgetRow {
  id: number;
  category_id: number;
  category_name: string;
  amount: number;
  carry_over: number;
  start_month: string;
}

interface RecurrenceRuleRow {
  id: number;
  name: string;
  account_id: number;
  amount: number;
  category_id: number | null;
  frequency: RecurrenceFrequency;
  reference_date: string;
  automatic: number;
  active: number;
  end_date: string | null;
  generated_until: string | null;
}

interface RecurrenceRuleListRow extends RecurrenceRuleRow {
  account_name: string;
  category_name: string | null;
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
    recurrenceRuleId: row.recurrence_rule_id,
  };
}

function toRecurrenceRule(row: RecurrenceRuleRow): RecurrenceRule {
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    amount: row.amount,
    categoryId: row.category_id,
    frequency: row.frequency,
    referenceDate: row.reference_date,
    automatic: row.automatic === 1,
    active: row.active === 1,
    endDate: row.end_date,
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

/** `[1 January, 1 January of next year)` as ISO dates, like `monthBounds` for a whole year. */
function yearBounds(year: number): [string, string] {
  return [`${year}-01-01`, `${year + 1}-01-01`];
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
export function createDataService(db: SqlDatabase, options: ServiceOptions = {}) {
  const now = options.now ?? (() => new Date());
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

  /** Appended at the end of the order, visible, icon derived like the seeded categories (#21). */
  async function createCategory(input: NewCategory): Promise<Category> {
    const name = input.name.trim();
    if (name === '') throw new Error('A category needs a name.');
    const last = await db.getFirstAsync<{ max: number | null }>(
      'SELECT MAX(sort_order) AS max FROM categories'
    );
    const order = (last?.max ?? 0) + 1;
    const icon = deriveInitials(name);
    const color = input.color ?? null;
    const result = await db.runAsync(
      'INSERT INTO categories (name, kind, icon, color, hidden, sort_order) VALUES (?, ?, ?, ?, 0, ?)',
      [name, input.kind, icon, color, order]
    );
    notifyChange();
    return { id: result.lastInsertRowId, name, kind: input.kind, icon, color, hidden: false, order };
  }

  /**
   * Renames, recolors and/or shows or hides a category. Hiding never
   * touches its `kind`, `icon` or existing transactions (#21 story 5) —
   * only the chip pickers filter it out. Renaming recomputes the initials
   * placeholder so it never goes stale.
   */
  async function updateCategory(id: number, changes: CategoryChanges): Promise<void> {
    const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!row) throw new Error(`Category ${id} does not exist.`);

    const name = changes.name !== undefined ? changes.name.trim() : row.name;
    if (name === '') throw new Error('A category needs a name.');
    const icon = changes.name !== undefined ? deriveInitials(name) : row.icon;
    const color = changes.color !== undefined ? changes.color : row.color;
    const hidden = changes.hidden !== undefined ? changes.hidden : row.hidden === 1;

    await db.runAsync('UPDATE categories SET name = ?, icon = ?, color = ?, hidden = ? WHERE id = ?', [
      name,
      icon,
      color,
      hidden ? 1 : 0,
      id,
    ]);
    notifyChange();
  }

  /** Rewrites every `sort_order` from the given, complete order of category ids (#21). */
  async function reorderCategories(orderedIds: number[]): Promise<void> {
    await db.transactionAsync(async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', [i + 1, orderedIds[i]]);
      }
    });
    notifyChange();
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
      await db.runAsync('DELETE FROM recurrence_rules WHERE account_id = ?', [id]);
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

    const fields: Omit<TransactionFields, 'id' | 'mirrorTransactionId' | 'recurrenceRuleId'> = {
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
    return { id, ...fields, mirrorTransactionId, recurrenceRuleId: null, splits };
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
   * The frame of the Bilan annuel (§6.7): its year selector runs from the
   * first year with an operation to the current one, and a year without
   * any operation is shown as a single empty card.
   */
  async function getYearStatus(year: number): Promise<YearStatus> {
    const [start, end] = yearBounds(year);
    const row = await db.getFirstAsync<{ first: string | null; in_year: number }>(
      `SELECT MIN(operation_date) AS first,
         EXISTS (SELECT 1 FROM transactions WHERE operation_date >= ? AND operation_date < ?) AS in_year
       FROM transactions`,
      [start, end]
    );
    return {
      firstYear: row?.first ? Number(row.first.slice(0, 4)) : null,
      currentYear: now().getFullYear(),
      lastMonth: lastCountedMonth(year),
      hasOperations: Boolean(row?.in_year),
    };
  }

  /** December for a past year, the current month for this one, `null` for a year to come. */
  function lastCountedMonth(year: number): number | null {
    const current = now();
    if (year < current.getFullYear()) return 11;
    return year === current.getFullYear() ? current.getMonth() : null;
  }

  /**
   * Dépenses / recettes of `year`, per category and per month (#25) — the
   * Bilan sheet of the old Excel. Real activity only, like the month
   * summary, but on every account: archiving an account later doesn't
   * rewrite the past years' Bilan. A split transaction counts through
   * its portions' categories, an unsplit one through its own. Categories
   * without activity that year are left out; operations without a
   * category come last, under a `null` name.
   */
  async function getCategoryFlowsByMonth(year: number): Promise<CategoryYearFlow[]> {
    const activity = `t.status IN ('non_pointe', 'pointe')
                      AND t.operation_date >= ? AND t.operation_date < ?`;
    const range = yearBounds(year);
    const rows = await db.getAllAsync<{
      category_id: number | null;
      category_name: string | null;
      month: string;
      expenses: number | null;
      income: number | null;
    }>(
      `SELECT p.category_id, c.name AS category_name, p.month,
         SUM(CASE WHEN p.amount < 0 THEN -p.amount END) AS expenses,
         SUM(CASE WHEN p.amount > 0 THEN p.amount END) AS income
       FROM (
         SELECT t.category_id, substr(t.operation_date, 6, 2) AS month, t.amount
         FROM transactions t
         WHERE ${activity}
           AND NOT EXISTS (SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id)
         UNION ALL
         SELECT s.category_id, substr(t.operation_date, 6, 2) AS month, s.amount
         FROM transaction_splits s
         JOIN transactions t ON t.id = s.transaction_id
         WHERE ${activity}
       ) p
       LEFT JOIN categories c ON c.id = p.category_id
       GROUP BY p.category_id, p.month
       ORDER BY c.sort_order IS NULL, c.sort_order ASC`,
      [...range, ...range]
    );

    const flows = new Map<number | null, CategoryYearFlow>();
    for (const row of rows) {
      let flow = flows.get(row.category_id);
      if (!flow) {
        flow = {
          categoryId: row.category_id,
          categoryName: row.category_name,
          expenses: Array<number>(12).fill(0),
          income: Array<number>(12).fill(0),
          totalExpenses: 0,
          totalIncome: 0,
        };
        flows.set(row.category_id, flow);
      }
      const month = Number(row.month) - 1;
      flow.expenses[month] = roundToCents(row.expenses ?? 0);
      flow.income[month] = roundToCents(row.income ?? 0);
    }
    for (const flow of flows.values()) {
      flow.totalExpenses = roundToCents(flow.expenses.reduce((sum, v) => sum + v, 0));
      flow.totalIncome = roundToCents(flow.income.reduce((sum, v) => sum + v, 0));
    }
    return [...flows.values()];
  }

  /**
   * Operations of `year` per account and per month (#25), every status —
   * like `monthOperationCount` on Comptes. An archived account stays in
   * the Bilan of the years it was used, and only those.
   */
  async function getOperationCountsByMonth(year: number): Promise<AccountYearCounts[]> {
    const rows = await db.getAllAsync<AccountRow & { month: string | null; count: number }>(
      `SELECT a.*, substr(t.operation_date, 6, 2) AS month, COUNT(t.id) AS count
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
         AND t.operation_date >= ? AND t.operation_date < ?
       GROUP BY a.id, month
       ORDER BY a.created_at ASC, a.id ASC`,
      yearBounds(year)
    );

    const byAccount = new Map<number, AccountYearCounts>();
    for (const row of rows) {
      let entry = byAccount.get(row.id);
      if (!entry) {
        entry = { account: toAccount(row), counts: Array<number>(12).fill(0), total: 0 };
        byAccount.set(row.id, entry);
      }
      if (row.month !== null) {
        entry.counts[Number(row.month) - 1] = row.count;
        entry.total += row.count;
      }
    }
    return [...byAccount.values()].filter((entry) => !entry.account.archived || entry.total > 0);
  }

  /**
   * Each account's pointé and réel balances at the end of every month of
   * `year` (#25), same rules as `listAccountSummaries` and the same
   * accounts as `getOperationCountsByMonth`. SQL sums the history before
   * the year and each month; only the 12-step running total is done here.
   */
  async function getBalanceSeries(year: number): Promise<AccountYearBalances[]> {
    const [start, end] = yearBounds(year);
    const rows = await db.getAllAsync<
      AccountRow & { month: string | null; real: number | null; pointed: number | null; count: number }
    >(
      `SELECT a.*,
         CASE WHEN t.operation_date < ? THEN NULL ELSE substr(t.operation_date, 6, 2) END AS month,
         SUM(CASE WHEN t.status <> 'flux_comptable' THEN t.amount END) AS real,
         SUM(CASE WHEN t.status = 'pointe' THEN t.amount END) AS pointed,
         COUNT(t.id) AS count
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id AND t.operation_date < ?
       GROUP BY a.id, month
       ORDER BY a.created_at ASC, a.id ASC`,
      [start, end]
    );

    type Sums = { pointed: number; real: number };
    const byAccount = new Map<
      number,
      { account: Account; opening: Sums; monthly: Sums[]; yearCount: number }
    >();
    for (const row of rows) {
      let entry = byAccount.get(row.id);
      if (!entry) {
        entry = {
          account: toAccount(row),
          opening: { pointed: row.initial_balance, real: row.initial_balance },
          monthly: Array.from({ length: 12 }, () => ({ pointed: 0, real: 0 })),
          yearCount: 0,
        };
        byAccount.set(row.id, entry);
      }
      const sums: Sums = { pointed: row.pointed ?? 0, real: row.real ?? 0 };
      if (row.month === null) {
        entry.opening = {
          pointed: entry.opening.pointed + sums.pointed,
          real: entry.opening.real + sums.real,
        };
      } else {
        entry.monthly[Number(row.month) - 1] = sums;
        entry.yearCount += row.count;
      }
    }

    return [...byAccount.values()]
      .filter((entry) => !entry.account.archived || entry.yearCount > 0)
      .map(({ account, opening, monthly }) => {
        let { pointed, real } = opening;
        const series: AccountYearBalances = { account, pointed: [], real: [] };
        for (const month of monthly) {
          pointed += month.pointed;
          real += month.real;
          series.pointed.push(roundToCents(pointed));
          series.real.push(roundToCents(real));
        }
        return series;
      });
  }

  /**
   * Advanced portions waiting to be paid back, over active accounts.
   * Reimbursed portions (`reimbursed_at` set, #21) drop out as soon as
   * they're marked, here and on the dedicated Avances en attente screen.
   */
  async function getPendingAdvances(): Promise<PendingAdvances> {
    const row = await db.getFirstAsync<{ count: number; total: number | null }>(
      `SELECT COUNT(*) AS count, SUM(ABS(s.amount)) AS total
       FROM transaction_splits s
       JOIN transactions t ON t.id = s.transaction_id
       JOIN accounts a ON a.id = t.account_id
       WHERE a.archived = 0 AND s.advanced = 1 AND s.reimbursed_at IS NULL`
    );
    return { count: row?.count ?? 0, total: roundToCents(row?.total ?? 0) };
  }

  /** Every portion behind `getPendingAdvances`'s total, detailed for the Avances en attente screen (#21). */
  async function listPendingAdvances(): Promise<PendingAdvance[]> {
    const rows = await db.getAllAsync<{
      split_id: number;
      account_name: string;
      category_name: string | null;
      amount: number;
      operation_date: string;
    }>(
      `SELECT s.id AS split_id, a.name AS account_name, c.name AS category_name,
         ABS(s.amount) AS amount, t.operation_date AS operation_date
       FROM transaction_splits s
       JOIN transactions t ON t.id = s.transaction_id
       JOIN accounts a ON a.id = t.account_id
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE a.archived = 0 AND s.advanced = 1 AND s.reimbursed_at IS NULL
       ORDER BY t.operation_date DESC, s.id DESC`
    );
    return rows.map((row) => ({
      splitId: row.split_id,
      accountName: row.account_name,
      categoryName: row.category_name,
      amount: roundToCents(row.amount),
      operationDate: row.operation_date,
    }));
  }

  /** Marks one portion paid back, dated today; it leaves the pending list for good (#21, out of scope: undo). */
  async function markAdvanceReimbursed(splitId: number): Promise<void> {
    await db.runAsync('UPDATE transaction_splits SET reimbursed_at = ? WHERE id = ?', [today(), splitId]);
    notifyChange();
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
   * Walks the months from the budget's start through `through`, month by
   * month. With carry-over on, what was left unspent of a month's ceiling
   * (its own carry included, never below zero) is added to the next one's
   * — only from a month gone by when `realizedThrough` is given, since a
   * month to come has left nothing yet.
   */
  function walkBudget(
    budget: Budget,
    spentByMonth: Map<string, number>,
    through: MonthRef,
    realizedThrough?: MonthRef
  ): Map<string, { spent: number; carriedOver: number; ceiling: number }> {
    const walk = new Map<string, { spent: number; carriedOver: number; ceiling: number }>();
    let previous: { key: string; spent: number; ceiling: number } | null = null;
    for (let current = budget.startMonth; monthKey(current) <= monthKey(through); current = nextMonth(current)) {
      const key = monthKey(current);
      const carries =
        budget.carryOver &&
        previous !== null &&
        (realizedThrough === undefined || previous.key <= monthKey(realizedThrough));
      const carriedOver = carries ? roundToCents(Math.max(0, previous!.ceiling - previous!.spent)) : 0;
      const ceiling = roundToCents(budget.amount + carriedOver);
      const spent = spentByMonth.get(key) ?? 0;
      walk.set(key, { spent, carriedOver, ceiling });
      previous = { key, spent, ceiling };
    }
    return walk;
  }

  async function measureBudget(budget: Budget, month: MonthRef): Promise<BudgetProgress> {
    const spentByMonth = await getCategorySpendByMonth(
      budget.categoryId,
      monthBounds(budget.startMonth)[0],
      monthBounds(month)[1]
    );
    const { spent, carriedOver, ceiling } = walkBudget(budget, spentByMonth, month).get(monthKey(month))!;

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

  /** Budgets started by `month`, in category order. */
  async function listBudgetsInForceAt(month: MonthRef): Promise<Budget[]> {
    const rows = await db.getAllAsync<BudgetRow>(
      `SELECT b.*, c.name AS category_name
       FROM budgets b JOIN categories c ON c.id = b.category_id
       WHERE b.start_month <= ?
       ORDER BY c.sort_order ASC`,
      [monthKey(month)]
    );
    return rows.map(toBudget);
  }

  /** Budgets in force during `month`, each measured against that month, in category order. */
  async function getBudgetOverview(month: MonthRef): Promise<BudgetOverview> {
    const budgets = await Promise.all(
      (await listBudgetsInForceAt(month)).map((budget) => measureBudget(budget, month))
    );
    return {
      budgets,
      spent: roundToCents(budgets.reduce((sum, b) => sum + b.spent, 0)),
      planned: roundToCents(budgets.reduce((sum, b) => sum + b.ceiling, 0)),
    };
  }

  /**
   * Budget prévu vs réalisé over `year`, month by month (§6.7 graphique 3):
   * each budget in force that year, its twelve months measured with the
   * same rules as Budgets — carry-over included, from its start even
   * when that was in an earlier year. A month to come has a ceiling but
   * nothing spent yet, and carries nothing over to the next.
   */
  async function getBudgetYear(year: number): Promise<BudgetYearOverview> {
    const lastMonth = lastCountedMonth(year);
    const december: MonthRef = { year, month: 11 };
    const realizedThrough: MonthRef = lastMonth === null ? { year: year - 1, month: 11 } : { year, month: lastMonth };

    const budgets = await Promise.all(
      (await listBudgetsInForceAt(december)).map(async (budget) => {
        const spentByMonth = await getCategorySpendByMonth(
          budget.categoryId,
          monthBounds(budget.startMonth)[0],
          monthBounds(realizedThrough)[1]
        );
        const walk = walkBudget(budget, spentByMonth, december, realizedThrough);
        const months = Array.from({ length: 12 }, (_, month): BudgetMonth => {
          const measured = walk.get(monthKey({ year, month }));
          if (!measured) return { month, state: 'not_started', spent: 0, ceiling: 0, carriedOver: 0 };
          const state = lastMonth !== null && month <= lastMonth ? 'realized' : 'upcoming';
          return { month, state, ...measured };
        });
        return { budget, months };
      })
    );
    return { lastMonth, budgets };
  }

  const today = () => toIsoDate(now());

  /** How far ahead automatic occurrences are created: through the end of next month. */
  function generationHorizon(): string {
    const current = now();
    const month = { year: current.getFullYear(), month: current.getMonth() };
    return monthBounds(nextMonth(nextMonth(month)))[0];
  }

  const RULE_LIST_SELECT = `
    SELECT r.*, a.name AS account_name, c.name AS category_name
    FROM recurrence_rules r
    JOIN accounts a ON a.id = r.account_id
    LEFT JOIN categories c ON c.id = r.category_id`;

  /**
   * Creates the Prévision occurrences of every active rule that is set to
   * automatic, up to the horizon. A rule left on manual never produces
   * anything here: its occurrences wait for the user (#3 « Récurrence »).
   * Each rule remembers how far it has been generated, so an occurrence the
   * user deleted does not come back, and a past date is never backfilled.
   */
  async function generateRecurrences(): Promise<number> {
    const rules = await db.getAllAsync<RecurrenceRuleRow>(
      `SELECT r.* FROM recurrence_rules r JOIN accounts a ON a.id = r.account_id
       WHERE r.active = 1 AND r.automatic = 1 AND a.archived = 0
       ORDER BY r.id ASC`
    );
    const horizon = generationHorizon();
    let created = 0;

    for (const row of rules) {
      const from = row.generated_until && row.generated_until > today() ? row.generated_until : today();
      if (from >= horizon) continue;
      const dates = occurrencesBetween(row.reference_date, row.frequency, from, horizon).filter(
        (date) => !row.end_date || date <= row.end_date
      );
      await db.transactionAsync(async () => {
        for (const date of dates) {
          await db.runAsync(
            `INSERT INTO transactions
               (account_id, operation_date, bank_date, comment, amount, category_id, status, recurrence_rule_id)
             VALUES (?, ?, NULL, ?, ?, ?, 'prevision', ?)`,
            [row.account_id, date, row.name, row.amount, row.category_id, row.id]
          );
        }
        await db.runAsync('UPDATE recurrence_rules SET generated_until = ? WHERE id = ?', [
          horizon,
          row.id,
        ]);
      });
      created += dates.length;
    }
    if (created > 0) notifyChange();
    return created;
  }

  async function createRecurrenceRule(input: NewRecurrenceRule): Promise<RecurrenceRule> {
    const name = input.name.trim();
    if (name === '') throw new Error('A recurrence rule needs a name.');
    if (!Number.isFinite(input.amount) || input.amount === 0) {
      throw new Error('A recurrence rule needs a non-zero amount.');
    }
    if (!(await getAccount(input.accountId))) {
      throw new Error(`Account ${input.accountId} does not exist.`);
    }
    if (input.categoryId != null && input.categoryId === (await getTransferCategoryId())) {
      throw new Error(`« ${TRANSFER_CATEGORY_NAME} » cannot be recurring: it needs a destination account.`);
    }
    if (input.endDate && input.endDate < input.referenceDate) {
      throw new Error('A recurrence rule cannot end before its reference date.');
    }

    const automatic = input.automatic ?? false;
    const result = await db.runAsync(
      `INSERT INTO recurrence_rules
         (name, account_id, amount, category_id, frequency, reference_date, automatic, active, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        name,
        input.accountId,
        input.amount,
        input.categoryId ?? null,
        input.frequency,
        input.referenceDate,
        automatic ? 1 : 0,
        input.endDate ?? null,
      ]
    );
    await generateRecurrences();
    notifyChange();
    return {
      id: result.lastInsertRowId,
      name,
      accountId: input.accountId,
      amount: input.amount,
      categoryId: input.categoryId ?? null,
      frequency: input.frequency,
      referenceDate: input.referenceDate,
      automatic,
      active: true,
      endDate: input.endDate ?? null,
    };
  }

  async function setRecurrenceAutomatic(id: number, automatic: boolean): Promise<void> {
    await db.runAsync('UPDATE recurrence_rules SET automatic = ? WHERE id = ?', [automatic ? 1 : 0, id]);
    await generateRecurrences();
    notifyChange();
  }

  async function setRecurrenceActive(id: number, active: boolean): Promise<void> {
    await db.runAsync('UPDATE recurrence_rules SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    await generateRecurrences();
    notifyChange();
  }

  /** Rules of active accounts in creation order, each with its next occurrence. */
  async function listRecurrenceRules(): Promise<RecurrenceRuleItem[]> {
    const rows = await db.getAllAsync<RecurrenceRuleListRow>(
      `${RULE_LIST_SELECT} WHERE a.archived = 0 ORDER BY r.id ASC`
    );
    return rows.map((row) => {
      const next = nextOccurrenceOnOrAfter(row.reference_date, row.frequency, today());
      return {
        ...toRecurrenceRule(row),
        accountName: row.account_name,
        categoryName: row.category_name,
        nextOccurrence: row.active === 1 && (!row.end_date || next <= row.end_date) ? next : null,
      };
    });
  }

  /** Generated occurrences still to come, soonest first; each is a transaction in its own right. */
  async function listUpcomingOccurrences(): Promise<TransactionListItem[]> {
    const rows = await db.getAllAsync<TransactionListRow>(
      `${LIST_SELECT}
       WHERE a.archived = 0 AND t.recurrence_rule_id IS NOT NULL
         AND t.status = 'prevision' AND t.operation_date >= ?
       ORDER BY t.operation_date ASC, t.id ASC`,
      [today()]
    );
    return rows.map(toTransactionListItem);
  }

  async function requireOccurrence(id: number): Promise<TransactionRow> {
    const row = await db.getFirstAsync<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!row || row.recurrence_rule_id === null) {
      throw new Error(`Transaction ${id} is not a generated occurrence.`);
    }
    return row;
  }

  /** Edits one occurrence only: the rule that generated it, and its other occurrences, stay as they are. */
  async function updateOccurrence(id: number, changes: OccurrenceChanges): Promise<void> {
    const row = await requireOccurrence(id);
    if (changes.amount !== undefined && (!Number.isFinite(changes.amount) || changes.amount === 0)) {
      throw new Error('An occurrence needs a non-zero amount.');
    }
    await db.runAsync(
      'UPDATE transactions SET amount = ?, operation_date = ?, comment = ? WHERE id = ?',
      [
        changes.amount ?? row.amount,
        changes.operationDate ?? row.operation_date,
        changes.comment ?? row.comment,
        id,
      ]
    );
    notifyChange();
  }

  /** Removes one occurrence only; the rule keeps generating the next ones. */
  async function deleteOccurrence(id: number): Promise<void> {
    await requireOccurrence(id);
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    notifyChange();
  }

  async function getSettings(): Promise<AppSettings> {
    const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
    const settings = { ...DEFAULT_SETTINGS };
    for (const { key, value } of rows) {
      if (key in settings) settings[key as SettingKey] = value === '1';
    }
    return settings;
  }

  async function setSetting(key: SettingKey, value: boolean): Promise<void> {
    if (!(key in DEFAULT_SETTINGS)) throw new Error(`Unknown setting « ${key} ».`);
    await db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value ? '1' : '0']
    );
    notifyChange();
  }

  /**
   * Everything needed to restore NoMie to the identical state elsewhere
   * (#12 story 2): every table, ids kept as-is so links stay valid.
   */
  async function createBackup(): Promise<BackupFile> {
    const [accounts, categories, transactions, transactionSplits, budgets, recurrenceRules, settings] =
      await Promise.all([
        db.getAllAsync<BackupAccountRow>('SELECT * FROM accounts'),
        db.getAllAsync<BackupCategoryRow>('SELECT * FROM categories'),
        db.getAllAsync<BackupTransactionRow>('SELECT * FROM transactions'),
        db.getAllAsync<BackupSplitRow>('SELECT * FROM transaction_splits'),
        db.getAllAsync<BackupBudgetRow>('SELECT * FROM budgets'),
        db.getAllAsync<BackupRecurrenceRuleRow>('SELECT * FROM recurrence_rules'),
        db.getAllAsync<BackupSettingRow>('SELECT * FROM settings'),
      ]);
    return {
      format: BACKUP_FORMAT_ID,
      version: BACKUP_FORMAT_VERSION,
      createdAt: now().toISOString(),
      data: { accounts, categories, transactions, transactionSplits, budgets, recurrenceRules, settings },
    };
  }

  /**
   * Import = full replacement (#12 « Implementation Decisions »): the file
   * is fully validated before anything is written, then every table is
   * replaced in one atomic transaction — the existing database is
   * untouched if validation fails, and rolled back if a write does.
   */
  async function restoreBackup(fileContent: string): Promise<void> {
    const result = parseBackupFile(fileContent);
    if (!result.ok) throw new Error(result.reason);
    const { data } = result.file;

    await db.transactionAsync(async () => {
      await db.runAsync('DELETE FROM transaction_splits');
      await db.runAsync('DELETE FROM transactions');
      await db.runAsync('DELETE FROM budgets');
      await db.runAsync('DELETE FROM recurrence_rules');
      await db.runAsync('DELETE FROM categories');
      await db.runAsync('DELETE FROM accounts');
      await db.runAsync('DELETE FROM settings');

      for (const row of data.accounts) {
        await db.runAsync(
          'INSERT INTO accounts (id, name, initial_balance, created_at, archived) VALUES (?, ?, ?, ?, ?)',
          [row.id, row.name, row.initial_balance, row.created_at, row.archived]
        );
      }
      for (const row of data.categories) {
        await db.runAsync(
          'INSERT INTO categories (id, name, kind, icon, color, hidden, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [row.id, row.name, row.kind, row.icon, row.color, row.hidden, row.sort_order]
        );
      }
      for (const row of data.transactions) {
        await db.runAsync(
          `INSERT INTO transactions
             (id, account_id, operation_date, bank_date, comment, amount, category_id, status, mirror_transaction_id, recurrence_rule_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.account_id,
            row.operation_date,
            row.bank_date,
            row.comment,
            row.amount,
            row.category_id,
            row.status,
            row.mirror_transaction_id,
            row.recurrence_rule_id,
          ]
        );
      }
      for (const row of data.transactionSplits) {
        await db.runAsync(
          `INSERT INTO transaction_splits
             (id, transaction_id, category_id, amount, advanced, reimbursed_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.transaction_id, row.category_id, row.amount, row.advanced, row.reimbursed_at ?? null]
        );
      }
      for (const row of data.budgets) {
        await db.runAsync(
          'INSERT INTO budgets (id, category_id, amount, period, carry_over, start_month) VALUES (?, ?, ?, ?, ?, ?)',
          [row.id, row.category_id, row.amount, row.period, row.carry_over, row.start_month]
        );
      }
      for (const row of data.recurrenceRules) {
        await db.runAsync(
          `INSERT INTO recurrence_rules
             (id, name, account_id, amount, category_id, frequency, reference_date, automatic, active, end_date, generated_until)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.name,
            row.account_id,
            row.amount,
            row.category_id,
            row.frequency,
            row.reference_date,
            row.automatic,
            row.active,
            row.end_date,
            row.generated_until,
          ]
        );
      }
      for (const row of data.settings) {
        await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?)', [row.key, row.value]);
      }
    });
    notifyChange();
  }

  /**
   * One CSV per table, columns made readable — names instead of ids,
   * French labels and formats (#12 stories 8-9). Not meant to be
   * reimported: the technical backup covers that (`createBackup`).
   */
  async function exportCsv(): Promise<{ filename: string; content: string }[]> {
    const [accounts, categories, transactions, splits, budgetRows, ruleRows] = await Promise.all([
      listAccounts(),
      listCategories(),
      db.getAllAsync<TransactionRow>('SELECT * FROM transactions ORDER BY id ASC'),
      db.getAllAsync<FullSplitRow>('SELECT * FROM transaction_splits ORDER BY id ASC'),
      db.getAllAsync<BudgetRow>(
        'SELECT b.*, c.name AS category_name FROM budgets b JOIN categories c ON c.id = b.category_id ORDER BY b.id ASC'
      ),
      db.getAllAsync<RecurrenceRuleListRow>(`${RULE_LIST_SELECT} ORDER BY r.id ASC`),
    ]);

    const accountName = new Map(accounts.map((a) => [a.id, a.name]));
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));

    const accountsCsv = buildCsv(
      ['Id', 'Nom', 'Solde initial', 'Créé le', 'Archivé'],
      accounts.map((a) => [
        String(a.id),
        a.name,
        formatCsvAmount(a.initialBalance),
        a.createdAt.slice(0, 10),
        csvBool(a.archived),
      ])
    );

    const categoriesCsv = buildCsv(
      ['Id', 'Nom', 'Type', 'Couleur', 'Masquée', 'Ordre'],
      categories.map((c) => [String(c.id), c.name, c.kind, c.color ?? '', csvBool(c.hidden), String(c.order)])
    );

    const transactionsCsv = buildCsv(
      ['Id', 'Compte', 'Date opération', 'Date banque', 'Commentaire', 'Montant', 'Catégorie', 'Statut'],
      transactions.map((t) => [
        String(t.id),
        accountName.get(t.account_id) ?? '',
        t.operation_date,
        t.bank_date ?? '',
        t.comment,
        formatCsvAmount(t.amount),
        t.category_id !== null ? (categoryName.get(t.category_id) ?? '') : '',
        STATUS_LABELS[t.status],
      ])
    );

    const splitsCsv = buildCsv(
      ['Id', 'Opération', 'Catégorie', 'Montant', 'Avancé'],
      splits.map((s) => [
        String(s.id),
        String(s.transaction_id),
        s.category_id !== null ? (categoryName.get(s.category_id) ?? '') : '',
        formatCsvAmount(s.amount),
        csvBool(s.advanced === 1),
      ])
    );

    const budgetsCsv = buildCsv(
      ['Id', 'Catégorie', 'Montant', 'Report', 'Premier mois'],
      budgetRows.map((b) => [
        String(b.id),
        b.category_name,
        formatCsvAmount(b.amount),
        csvBool(b.carry_over === 1),
        b.start_month,
      ])
    );

    const recurrenceCsv = buildCsv(
      [
        'Id',
        'Nom',
        'Compte',
        'Montant',
        'Catégorie',
        'Fréquence',
        'Date de référence',
        'Automatique',
        'Active',
        'Date de fin',
      ],
      ruleRows.map((r) => [
        String(r.id),
        r.name,
        r.account_name,
        formatCsvAmount(r.amount),
        r.category_name ?? '',
        FREQUENCY_LABELS[r.frequency],
        r.reference_date,
        csvBool(r.automatic === 1),
        csvBool(r.active === 1),
        r.end_date ?? '',
      ])
    );

    return [
      { filename: 'transactions.csv', content: transactionsCsv },
      { filename: 'splits.csv', content: splitsCsv },
      { filename: 'comptes.csv', content: accountsCsv },
      { filename: 'categories.csv', content: categoriesCsv },
      { filename: 'budgets.csv', content: budgetsCsv },
      { filename: 'recurrences.csv', content: recurrenceCsv },
    ];
  }

  /** The counts shown under the STRUCTURE links of Réglages. */
  async function getStructureSummary(): Promise<StructureSummary> {
    const accounts = await db.getFirstAsync<{ active: number | null; archived: number | null }>(
      'SELECT SUM(archived = 0) AS active, SUM(archived = 1) AS archived FROM accounts'
    );
    const categories = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM categories WHERE hidden = 0'
    );
    return {
      activeAccounts: accounts?.active ?? 0,
      archivedAccounts: accounts?.archived ?? 0,
      categories: categories?.count ?? 0,
      advances: await getPendingAdvances(),
    };
  }

  return {
    initialize,
    subscribe,
    listCategories,
    createCategory,
    updateCategory,
    reorderCategories,
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
    getYearStatus,
    getCategoryFlowsByMonth,
    getOperationCountsByMonth,
    getBalanceSeries,
    getPendingAdvances,
    listPendingAdvances,
    markAdvanceReimbursed,
    listCategoriesWithoutBudget,
    createBudget,
    setBudgetCarryOver,
    getBudgetOverview,
    getBudgetYear,
    generateRecurrences,
    createRecurrenceRule,
    setRecurrenceAutomatic,
    setRecurrenceActive,
    listRecurrenceRules,
    listUpcomingOccurrences,
    updateOccurrence,
    deleteOccurrence,
    getSettings,
    setSetting,
    getStructureSummary,
    createBackup,
    restoreBackup,
    exportCsv,
  };
}

export type DataService = ReturnType<typeof createDataService>;
