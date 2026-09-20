import { createTestDataService } from '../test-utils/createTestDataService';
import { createDataService, type DataService, type SettingKey } from './dataService';

describe('dataService — réglages', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let db: Awaited<ReturnType<typeof createTestDataService>>['db'];

  beforeEach(async () => {
    ({ dataService, close, db } = await createTestDataService());
  });

  afterEach(() => close());

  it('starts with every switch off', async () => {
    expect(await dataService.getSettings()).toEqual({
      pinEnabled: false,
      biometricEnabled: false,
      checkReminderEnabled: false,
      monthlyBudgetReviewEnabled: false,
      roundedKeypad: false,
    });
  });

  it.each<SettingKey>([
    'pinEnabled',
    'biometricEnabled',
    'checkReminderEnabled',
    'monthlyBudgetReviewEnabled',
    'roundedKeypad',
  ])('persists %s, and only that one', async (key) => {
    await dataService.setSetting(key, true);

    const settings = await dataService.getSettings();
    expect(settings[key]).toBe(true);
    expect(Object.values(settings).filter(Boolean)).toHaveLength(1);

    await dataService.setSetting(key, false);
    expect((await dataService.getSettings())[key]).toBe(false);
  });

  it('keeps its values when the app is reopened on the same database', async () => {
    await dataService.setSetting('pinEnabled', true);
    await dataService.setSetting('roundedKeypad', true);
    await dataService.setSetting('roundedKeypad', false);

    const reopened = createDataService(db);
    await reopened.initialize();

    expect(await reopened.getSettings()).toMatchObject({ pinEnabled: true, roundedKeypad: false });
  });

  it('notifies subscribers, so an open screen re-reads', async () => {
    const listener = jest.fn();
    dataService.subscribe(listener);
    await dataService.setSetting('pinEnabled', true);
    expect(listener).toHaveBeenCalled();
  });

  it('rejects a setting it does not know', async () => {
    await expect(dataService.setSetting('nope' as SettingKey, true)).rejects.toThrow(
      /Unknown setting/
    );
  });

  describe('structure summary', () => {
    it('counts accounts, categories and pending advances', async () => {
      const first = await dataService.createAccount({ name: 'Compte courant', initialBalance: 0 });
      await dataService.createAccount({ name: 'Livret A', initialBalance: 0 });
      const old = await dataService.createAccount({ name: 'Ancien', initialBalance: 0 });
      await dataService.archiveAccount(old.id);
      await dataService.createTransaction({
        accountId: first.id,
        operationDate: '2026-09-10',
        amount: -64.5,
        splits: [{ amount: -64.5, advanced: true }],
      });

      expect(await dataService.getStructureSummary()).toEqual({
        activeAccounts: 2,
        archivedAccounts: 1,
        categories: 27,
        advances: { count: 1, total: 64.5 },
      });
    });

    it('reads zero on a blank app', async () => {
      expect(await dataService.getStructureSummary()).toMatchObject({
        activeAccounts: 0,
        archivedAccounts: 0,
        advances: { count: 0, total: 0 },
      });
    });
  });
});
