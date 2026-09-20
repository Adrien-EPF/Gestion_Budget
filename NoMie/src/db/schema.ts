/**
 * Schema owned entirely by the data service — see CONTEXT.md §6. Every
 * statement is idempotent so a database created by an earlier version
 * upgrades in place on the next launch; columns added to an existing
 * table are handled separately by `COLUMN_MIGRATIONS`, since SQLite has
 * no `ADD COLUMN IF NOT EXISTS`. RecurrenceRule is added by a later
 * ticket without touching the existing tables.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income', 'both')),
  icon TEXT,
  color TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  initial_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  operation_date TEXT NOT NULL,
  bank_date TEXT,
  comment TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL,
  category_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('non_pointe', 'pointe', 'prevision', 'flux_comptable'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (operation_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);

-- Répartition of a transaction. Amounts are signed like the transaction they belong to.
CREATE TABLE IF NOT EXISTS transaction_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  category_id INTEGER,
  amount REAL NOT NULL,
  advanced INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_splits_transaction ON transaction_splits (transaction_id);
CREATE INDEX IF NOT EXISTS idx_splits_category ON transaction_splits (category_id);

-- One monthly ceiling per category. start_month ('YYYY-MM') bounds the carry-over chain.
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL UNIQUE,
  amount REAL NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly')),
  carry_over INTEGER NOT NULL DEFAULT 0,
  start_month TEXT NOT NULL
);
`;

export interface ColumnMigration {
  table: string;
  column: string;
  definition: string;
}

/** Columns added after a table first shipped; applied on launch when missing. */
export const COLUMN_MIGRATIONS: ColumnMigration[] = [
  { table: 'transactions', column: 'mirror_transaction_id', definition: 'INTEGER' },
];
