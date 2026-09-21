import { createTestDataService } from '../test-utils/createTestDataService';
import { createInMemoryScheduler } from './inMemoryScheduler';
import { reconcileNotifications, setNotificationSetting } from './reconcile';

describe('Réconciliation des notifications', () => {
  let service: Awaited<ReturnType<typeof createTestDataService>>;

  beforeEach(async () => {
    service = await createTestDataService();
  });

  afterEach(() => service.close());

  const scheduledIds = async (scheduler: ReturnType<typeof createInMemoryScheduler>) =>
    (await scheduler.listScheduled()).map((spec) => spec.id).sort();

  it('plans nothing while both switches are off', async () => {
    const scheduler = createInMemoryScheduler({ granted: true });

    await reconcileNotifications(service.dataService, scheduler);

    expect(await scheduledIds(scheduler)).toEqual([]);
  });

  it('plans the reminder when its switch is turned on, and cancels it when turned off', async () => {
    const scheduler = createInMemoryScheduler({ granted: true });

    expect(await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', true)).toBe(true);
    expect(await scheduledIds(scheduler)).toEqual(['check-reminder']);
    expect((await service.dataService.getSettings()).checkReminderEnabled).toBe(true);

    await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', false);
    expect(await scheduledIds(scheduler)).toEqual([]);
    expect((await service.dataService.getSettings()).checkReminderEnabled).toBe(false);
  });

  it('plans the reminder weekly, on Sunday at 18:00, with its relaxed text, aimed at « À pointer »', async () => {
    const scheduler = createInMemoryScheduler({ granted: true });

    await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', true);

    expect(await scheduler.listScheduled()).toEqual([
      {
        id: 'check-reminder',
        title: 'NoMie',
        body: 'Un petit moment pour pointer tes opérations ?',
        trigger: { type: 'weekly', weekday: 1, hour: 18, minute: 0 },
        data: { destination: { screen: 'Comptes' } },
      },
    ]);
  });

  it('plans and cancels the monthly review independently of the reminder', async () => {
    const scheduler = createInMemoryScheduler({ granted: true });
    await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', true);

    await setNotificationSetting(service.dataService, scheduler, 'monthlyBudgetReviewEnabled', true);
    expect(await scheduledIds(scheduler)).toEqual(['check-reminder', 'monthly-budget-review']);

    await setNotificationSetting(service.dataService, scheduler, 'monthlyBudgetReviewEnabled', false);
    expect(await scheduledIds(scheduler)).toEqual(['check-reminder']);
  });

  it('asks for the permission when it was not given yet', async () => {
    const scheduler = createInMemoryScheduler({ granted: false, answer: true });

    await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', true);

    expect(scheduler.promptCount).toBe(1);
    expect(await scheduledIds(scheduler)).toEqual(['check-reminder']);
  });

  it('plans nothing and leaves the switch off when the permission is refused', async () => {
    const scheduler = createInMemoryScheduler({ granted: false, answer: false });

    expect(await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', true)).toBe(false);

    expect(await scheduledIds(scheduler)).toEqual([]);
    expect((await service.dataService.getSettings()).checkReminderEnabled).toBe(false);
  });

  it('does not ask again once the permission is granted', async () => {
    const scheduler = createInMemoryScheduler({ granted: false, answer: true });

    await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', true);
    await setNotificationSetting(service.dataService, scheduler, 'monthlyBudgetReviewEnabled', true);

    expect(scheduler.promptCount).toBe(1);
  });

  describe('au lancement de l’app, avec un état incohérent', () => {
    it('plans what a switch turned on but the system lost', async () => {
      await service.dataService.setSetting('checkReminderEnabled', true);
      await service.dataService.setSetting('monthlyBudgetReviewEnabled', true);
      const scheduler = createInMemoryScheduler({ granted: true });

      await reconcileNotifications(service.dataService, scheduler);

      expect(await scheduledIds(scheduler)).toEqual(['check-reminder', 'monthly-budget-review']);
    });

    it('cancels what is still planned for a switch that is off', async () => {
      const scheduler = createInMemoryScheduler({ granted: true });
      await setNotificationSetting(service.dataService, scheduler, 'checkReminderEnabled', true);
      await service.dataService.setSetting('checkReminderEnabled', false);

      await reconcileNotifications(service.dataService, scheduler);

      expect(await scheduledIds(scheduler)).toEqual([]);
    });

    it('replaces a planned notification that no longer matches what is wanted', async () => {
      await service.dataService.setSetting('checkReminderEnabled', true);
      const scheduler = createInMemoryScheduler({ granted: true });
      await scheduler.schedule({
        id: 'check-reminder',
        title: 'Ancien texte',
        body: 'Ancien texte',
        trigger: { type: 'weekly', weekday: 3, hour: 7, minute: 0 },
      });

      await reconcileNotifications(service.dataService, scheduler);

      const [spec] = await scheduler.listScheduled();
      expect(spec.title).not.toBe('Ancien texte');
      expect(spec.trigger).toEqual({ type: 'weekly', weekday: 1, hour: 18, minute: 0 });
    });

    it('switches off a setting whose permission was taken back in the system settings', async () => {
      await service.dataService.setSetting('checkReminderEnabled', true);
      const scheduler = createInMemoryScheduler({ granted: false });

      await reconcileNotifications(service.dataService, scheduler);

      expect(await scheduledIds(scheduler)).toEqual([]);
      expect((await service.dataService.getSettings()).checkReminderEnabled).toBe(false);
    });
  });
});
