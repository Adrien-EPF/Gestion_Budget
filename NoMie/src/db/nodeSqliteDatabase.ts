import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from './types';

/**
 * SqlDatabase backed by Node's built-in `node:sqlite`, used only by the
 * Jest test harness. Runs real SQL against a real in-memory SQLite
 * engine — the test harness never mocks the data service, only swaps
 * which native SQLite binding runs underneath it (expo-sqlite has no
 * Node/Jest runtime, and a compiled native module like better-sqlite3
 * needs build tools this machine doesn't have).
 */
export function openNodeSqliteDatabase(): SqlDatabase {
  const db = new DatabaseSync(':memory:');
  // One connection can only hold one open transaction: queue them.
  let queue: Promise<unknown> = Promise.resolve();

  return {
    execAsync: async (sql) => {
      db.exec(sql);
    },
    runAsync: async (sql, params = []) => {
      const result = db.prepare(sql).run(...(params as never[]));
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
    },
    getAllAsync: async <T>(sql: string, params: unknown[] = []) =>
      db.prepare(sql).all(...(params as never[])) as T[],
    getFirstAsync: async <T>(sql: string, params: unknown[] = []) =>
      (db.prepare(sql).get(...(params as never[])) as T | undefined) ?? null,
    transactionAsync: (task) => {
      const run = async () => {
        db.exec('BEGIN');
        try {
          await task();
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      };
      const result = queue.then(run, run);
      queue = result.catch(() => undefined);
      return result;
    },
    closeAsync: async () => {
      db.close();
    },
  };
}
