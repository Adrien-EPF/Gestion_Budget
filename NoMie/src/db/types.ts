/**
 * Minimal async SQL driver contract. The data service is written only
 * against this interface, never against `expo-sqlite` or `better-sqlite3`
 * directly — that's what lets the same service run against a real SQLite
 * engine both on-device (expo-sqlite) and in the Jest test harness
 * (better-sqlite3, in-memory), with no mocking of the service itself.
 */
export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  closeAsync(): Promise<void>;
}
