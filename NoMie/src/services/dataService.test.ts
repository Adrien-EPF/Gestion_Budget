import { createTestDataService } from '../test-utils/createTestDataService';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';
import type { DataService } from './dataService';

describe('dataService — categories', () => {
  let dataService: DataService;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
  });

  afterEach(() => close());

  it('pre-loads the 27 default categories on first launch', async () => {
    const categories = await dataService.listCategories();
    expect(categories).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(categories.map((c) => c.name)).toEqual(DEFAULT_CATEGORIES.map((c) => c.name));
  });

  it('does not duplicate categories if initialized twice', async () => {
    await dataService.initialize();
    const categories = await dataService.listCategories();
    expect(categories).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('keeps categories visible by default, ordered as in the old Excel', async () => {
    const categories = await dataService.listCategories();
    expect(categories[0].name).toBe('Alimentation/Entretien essentiel');
    expect(categories[0].hidden).toBe(false);
    expect(categories[0].order).toBe(1);
  });
});

describe('dataService — accounts', () => {
  let dataService: DataService;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
  });

  afterEach(() => close());

  it('starts with no accounts', async () => {
    expect(await dataService.listAccounts()).toEqual([]);
  });

  it('creates an account with an initial balance', async () => {
    const account = await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 });
    expect(account.id).toBeGreaterThan(0);
    expect(account.name).toBe('Compte courant');
    expect(account.initialBalance).toBe(1000);
    expect(account.archived).toBe(false);

    const accounts = await dataService.listAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toEqual(account);
  });

  it('renames an account', async () => {
    const account = await dataService.createAccount({ name: 'Livret', initialBalance: 0 });
    await dataService.renameAccount(account.id, 'Livret A');
    const updated = await dataService.getAccount(account.id);
    expect(updated?.name).toBe('Livret A');
  });

  it('archives an account without deleting it', async () => {
    const account = await dataService.createAccount({ name: 'EdenRed', initialBalance: 50 });
    await dataService.archiveAccount(account.id);

    const active = await dataService.listAccounts({ includeArchived: false });
    expect(active).toHaveLength(0);

    const all = await dataService.listAccounts({ includeArchived: true });
    expect(all).toHaveLength(1);
    expect(all[0].archived).toBe(true);
  });

  it('updates the initial balance of an account', async () => {
    const account = await dataService.createAccount({ name: 'Compte courant', initialBalance: 100 });
    await dataService.updateInitialBalance(account.id, 250.5);
    const updated = await dataService.getAccount(account.id);
    expect(updated?.initialBalance).toBe(250.5);
  });

  it('deletes an account', async () => {
    const account = await dataService.createAccount({ name: 'Compte à supprimer', initialBalance: 0 });
    await dataService.deleteAccount(account.id);
    expect(await dataService.getAccount(account.id)).toBeNull();
  });
});
