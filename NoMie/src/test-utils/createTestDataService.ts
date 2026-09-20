import { openNodeSqliteDatabase } from '../db/nodeSqliteDatabase';
import type { SqlDatabase } from '../db/types';
import { createDataService, type DataService, type ServiceOptions } from '../services/dataService';

/**
 * Test harness reused as-is by every future ticket (see #4 "Décisions de
 * test"): a fresh, real, in-memory SQLite database behind the data
 * service's public API — never a mock of the service.
 */
export async function createTestDataService(options?: ServiceOptions): Promise<{
  dataService: DataService;
  /** The underlying database, to open a second service on it and prove what persisted. */
  db: SqlDatabase;
  close: () => Promise<void>;
}> {
  const db = openNodeSqliteDatabase();
  const dataService = createDataService(db, options);
  await dataService.initialize();
  return { dataService, db, close: () => db.closeAsync() };
}
