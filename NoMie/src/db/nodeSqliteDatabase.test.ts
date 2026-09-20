import { openNodeSqliteDatabase } from './nodeSqliteDatabase';
import type { SqlDatabase } from './types';

describe('nodeSqliteDatabase.transactionAsync', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = openNodeSqliteDatabase();
    await db.execAsync('CREATE TABLE t (n INTEGER)');
  });

  afterEach(() => db.closeAsync());

  const count = async () => (await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM t'))!.c;

  it('commits every write of the task together', async () => {
    await db.transactionAsync(async () => {
      await db.runAsync('INSERT INTO t VALUES (1)');
      await db.runAsync('INSERT INTO t VALUES (2)');
    });
    expect(await count()).toBe(2);
  });

  it('rolls everything back when the task throws, and rethrows', async () => {
    await expect(
      db.transactionAsync(async () => {
        await db.runAsync('INSERT INTO t VALUES (1)');
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    expect(await count()).toBe(0);
  });

  it('runs overlapping transactions one after the other', async () => {
    const slow = db.transactionAsync(async () => {
      await db.runAsync('INSERT INTO t VALUES (1)');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await db.runAsync('INSERT INTO t VALUES (2)');
    });
    const failing = db.transactionAsync(async () => {
      await db.runAsync('INSERT INTO t VALUES (3)');
      throw new Error('nope');
    });
    await slow;
    await expect(failing).rejects.toThrow('nope');
    // The failed one rolled back only its own write; the earlier one is intact.
    expect(await count()).toBe(2);
  });
});
