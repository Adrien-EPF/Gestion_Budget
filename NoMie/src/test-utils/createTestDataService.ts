import { openNodeSqliteDatabase } from '../db/nodeSqliteDatabase';
import { createDataService, type DataService } from '../services/dataService';

/**
 * Test harness reused as-is by every future ticket (see #4 "Décisions de
 * test"): a fresh, real, in-memory SQLite database behind the data
 * service's public API — never a mock of the service.
 */
export async function createTestDataService(): Promise<{
  dataService: DataService;
  close: () => Promise<void>;
}> {
  const db = openNodeSqliteDatabase();
  const dataService = createDataService(db);
  await dataService.initialize();
  return { dataService, close: () => db.closeAsync() };
}
