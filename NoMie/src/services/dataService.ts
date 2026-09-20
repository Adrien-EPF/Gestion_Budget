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
  }

  async function archiveAccount(id: number): Promise<void> {
    await db.runAsync('UPDATE accounts SET archived = 1 WHERE id = ?', [id]);
  }

  async function updateInitialBalance(id: number, initialBalance: number): Promise<void> {
    await db.runAsync('UPDATE accounts SET initial_balance = ? WHERE id = ?', [
      initialBalance,
      id,
    ]);
  }

  async function deleteAccount(id: number): Promise<void> {
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
  }

  return {
    initialize,
    listCategories,
    listAccounts,
    getAccount,
    createAccount,
    renameAccount,
    archiveAccount,
    updateInitialBalance,
    deleteAccount,
  };
}

export type DataService = ReturnType<typeof createDataService>;
