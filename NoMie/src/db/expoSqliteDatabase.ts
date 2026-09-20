import * as SQLite from 'expo-sqlite';
import type { SqlDatabase } from './types';

/** SqlDatabase backed by expo-sqlite, used by the app at runtime on-device. */
export async function openExpoSqliteDatabase(name: string): Promise<SqlDatabase> {
  const db = await SQLite.openDatabaseAsync(name);

  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const result = await db.runAsync(sql, params as SQLite.SQLiteBindParams);
      return { lastInsertRowId: result.lastInsertRowId, changes: result.changes };
    },
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params as SQLite.SQLiteBindParams),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params as SQLite.SQLiteBindParams),
    transactionAsync: (task) => db.withTransactionAsync(task),
    closeAsync: () => db.closeAsync(),
  };
}
