/**
 * Schema owned entirely by the data service — see CONTEXT.md §6. V2 starts
 * on an empty database (ADR 0003), so the tables are written whole rather
 * than stacked from column migrations. Every statement is idempotent so a
 * database created by this version reopens untouched; columns added to an
 * existing table from now on are handled by `COLUMN_MIGRATIONS`, since
 * SQLite has no `ADD COLUMN IF NOT EXISTS`.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income', 'both')),
  icon TEXT,
  color TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL,
  -- Role that replaces detection by name; such a category can be neither hidden nor deleted.
  system_role TEXT CHECK (system_role IN ('virement', 'avance'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  initial_balance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  is_savings INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  operation_date TEXT NOT NULL,
  bank_date TEXT,
  comment TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL,
  category_id INTEGER,
  status TEXT NOT NULL CHECK (status IN ('non_pointe', 'pointe', 'prevision', 'fantome')),
  mirror_transaction_id INTEGER,
  recurrence_rule_id INTEGER,
  -- Spending level of an expense that counts in the bilan; null otherwise.
  importance TEXT CHECK (importance IN ('essentiel', 'secondaire_important', 'secondaire_superflu', 'exceptionnel')),
  -- Trésorerie only: in the balances, out of the bilan.
  off_balance INTEGER NOT NULL DEFAULT 0,
  -- Symmetric link between a Fantôme and its contrepartie.
  counterpart_transaction_id INTEGER,
  -- Set on an operation in the Avancé category.
  advance_type TEXT CHECK (advance_type IN ('reglee_ailleurs', 'en_attente')),
  -- The income recorded when the advance was paid back.
  reimbursed_by_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (operation_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);

-- Répartition of a transaction. Amounts are signed like the transaction they belong to.
-- A portion in the Avancé category carries advance_type and, once paid back, reimbursed_by_id.
CREATE TABLE IF NOT EXISTS transaction_splits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL,
  category_id INTEGER,
  amount REAL NOT NULL,
  advance_type TEXT CHECK (advance_type IN ('reglee_ailleurs', 'en_attente')),
  reimbursed_by_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_splits_transaction ON transaction_splits (transaction_id);
CREATE INDEX IF NOT EXISTS idx_splits_category ON transaction_splits (category_id);

-- One monthly ceiling per category or per importance level, exactly one of the two.
-- start_month ('YYYY-MM') bounds the carry-over chain.
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER UNIQUE,
  importance TEXT UNIQUE CHECK (importance IN ('essentiel', 'secondaire_important', 'secondaire_superflu', 'exceptionnel')),
  amount REAL NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly')),
  carry_over INTEGER NOT NULL DEFAULT 0,
  start_month TEXT NOT NULL,
  CHECK ((category_id IS NULL) <> (importance IS NULL))
);

-- generated_until: exclusive ISO date up to which occurrences were already created, so a
-- deleted occurrence is never generated again.
CREATE TABLE IF NOT EXISTS recurrence_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  category_id INTEGER,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'yearly')),
  reference_date TEXT NOT NULL,
  automatic INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  end_date TEXT,
  generated_until TEXT
);

-- Boolean switches of the Réglages screen, stored as '1' / '0'.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export interface ColumnMigration {
  table: string;
  column: string;
  definition: string;
}

/** Columns added after V2's schema first shipped; applied on launch when missing. */
export const COLUMN_MIGRATIONS: ColumnMigration[] = [];
