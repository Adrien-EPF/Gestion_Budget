/**
 * Schema owned entirely by the data service — see CONTEXT.md §6 and
 * issues #4 and #5. Category, Account and Transaction (without split)
 * exist at this stage; Budget and RecurrenceRule are added by later
 * tickets without touching this file's existing tables. Every statement
 * is idempotent so a database created by an earlier version upgrades in
 * place on the next launch.
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
`;
