import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService } from './dataService';

describe('dataService — récurrences', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let accountId: number;
  let clock: Date;
  const cat: Record<string, number> = {};

  beforeEach(async () => {
    clock = new Date(2026, 8, 20, 12); // 20 sept. 2026 — the horizon is 1 Nov (exclusive)
    ({ dataService, close } = await createTestDataService({ now: () => clock }));
    accountId = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    for (const category of await dataService.listCategories()) cat[category.name] = category.id;
  });

  afterEach(() => close());

  const rent = (extra: Partial<Parameters<DataService['createRecurrenceRule']>[0]> = {}) =>
    dataService.createRecurrenceRule({
      name: 'Loyer',
      accountId,
      amount: -780,
      categoryId: cat['Logement'],
      frequency: 'monthly',
      referenceDate: '2026-01-25',
      ...extra,
    });

  const upcomingDates = async () =>
    (await dataService.listUpcomingOccurrences()).map((o) => o.operationDate);

  describe('création automatique : opt-in explicite', () => {
    it('is off by default, and a manual rule generates nothing', async () => {
      const rule = await rent();
      expect(rule.automatic).toBe(false);

      expect(await dataService.generateRecurrences()).toBe(0);
      expect(await dataService.listUpcomingOccurrences()).toEqual([]);
    });

    it('generates Prévision occurrences from the moment a rule is set to automatic', async () => {
      const rule = await rent();
      await dataService.setRecurrenceAutomatic(rule.id, true);

      const occurrences = await dataService.listUpcomingOccurrences();
      expect(occurrences.map((o) => o.operationDate)).toEqual(['2026-09-25', '2026-10-25']);
      expect(occurrences[0]).toMatchObject({
        status: 'prevision',
        comment: 'Loyer',
        amount: -780,
        accountId,
        categoryId: cat['Logement'],
        recurrenceRuleId: rule.id,
        bankDate: null,
      });
    });

    it('generates straight away when the rule is created as automatic', async () => {
      await rent({ automatic: true });
      expect(await dataService.listUpcomingOccurrences()).toHaveLength(2);
    });

    it('does not generate twice, however often it runs', async () => {
      await rent({ automatic: true });
      expect(await dataService.generateRecurrences()).toBe(0);
      expect(await dataService.listUpcomingOccurrences()).toHaveLength(2);
    });

    it('stops generating when switched back to manual, and keeps what already exists', async () => {
      const rule = await rent({ automatic: true });
      await dataService.setRecurrenceAutomatic(rule.id, false);

      clock = new Date(2026, 9, 20, 12); // a month later: the horizon reaches 1 Dec
      expect(await dataService.generateRecurrences()).toBe(0);
      expect(await upcomingDates()).toEqual(['2026-10-25']);
    });

    it('catches up with the calendar as time passes', async () => {
      await rent({ automatic: true });

      clock = new Date(2026, 9, 20, 12);
      expect(await dataService.generateRecurrences()).toBe(1);
      expect(await upcomingDates()).toEqual(['2026-10-25', '2026-11-25']);
    });

    it('never backfills the past when an old rule is switched on', async () => {
      await rent({ referenceDate: '2024-03-25', automatic: true });
      expect(await upcomingDates()).toEqual(['2026-09-25', '2026-10-25']);
    });

    it('waits for a reference date in the future', async () => {
      await rent({ referenceDate: '2026-10-05', automatic: true });
      expect(await upcomingDates()).toEqual(['2026-10-05']);
    });

    it('produces nothing for a paused rule, and resumes when it is reactivated', async () => {
      const rule = await rent({ automatic: true });
      await dataService.setRecurrenceActive(rule.id, false);
      clock = new Date(2026, 9, 20, 12);
      expect(await dataService.generateRecurrences()).toBe(0);

      await dataService.setRecurrenceActive(rule.id, true);
      expect(await upcomingDates()).toContain('2026-11-25');
    });

    it('stops at the end date', async () => {
      await rent({ automatic: true, endDate: '2026-09-30' });
      expect(await upcomingDates()).toEqual(['2026-09-25']);
      expect((await dataService.listRecurrenceRules())[0].nextOccurrence).toBe('2026-09-25');

      clock = new Date(2026, 9, 1, 12);
      expect((await dataService.listRecurrenceRules())[0].nextOccurrence).toBeNull();
    });

    it('handles weekly and yearly rules', async () => {
      await dataService.createRecurrenceRule({
        name: 'Marché',
        accountId,
        amount: -30,
        frequency: 'weekly',
        referenceDate: '2026-01-05', // a Monday
        automatic: true,
      });
      await dataService.createRecurrenceRule({
        name: 'Cotisation club',
        accountId,
        amount: -180,
        frequency: 'yearly',
        referenceDate: '2020-10-12',
        automatic: true,
      });
      const occurrences = await dataService.listUpcomingOccurrences();
      expect(occurrences.filter((o) => o.comment === 'Marché').map((o) => o.operationDate)).toEqual([
        '2026-09-21',
        '2026-09-28',
        '2026-10-05',
        '2026-10-12',
        '2026-10-19',
        '2026-10-26',
      ]);
      expect(
        occurrences.filter((o) => o.comment === 'Cotisation club').map((o) => o.operationDate)
      ).toEqual(['2026-10-12']);
    });

    it('counts generated Prévisions in the real balance but not in the pointed one', async () => {
      await rent({ automatic: true });
      const [summary] = await dataService.listAccountSummaries({ year: 2026, month: 8 });
      expect(summary.realBalance).toBe(1000 - 780 * 2);
      expect(summary.pointedBalance).toBe(1000);
    });
  });

  describe('prochaine occurrence', () => {
    it('is computed for a manual rule too, as a reminder', async () => {
      await rent({ referenceDate: '2026-01-05' });
      const [item] = await dataService.listRecurrenceRules();
      expect(item).toMatchObject({
        name: 'Loyer',
        accountName: 'Compte courant',
        categoryName: 'Logement',
        automatic: false,
        nextOccurrence: '2026-10-05',
      });
    });

    it('is null for a paused rule', async () => {
      const rule = await rent();
      await dataService.setRecurrenceActive(rule.id, false);
      expect((await dataService.listRecurrenceRules())[0].nextOccurrence).toBeNull();
    });
  });

  describe('une occurrence est une transaction à part entière', () => {
    it('can be edited without touching its rule or its siblings', async () => {
      const rule = await rent({ automatic: true });
      const [first, second] = await dataService.listUpcomingOccurrences();

      await dataService.updateOccurrence(first.id, {
        amount: -812.5,
        operationDate: '2026-09-27',
        comment: 'Loyer + charges',
      });

      expect(await dataService.getTransaction(first.id)).toMatchObject({
        amount: -812.5,
        operationDate: '2026-09-27',
        comment: 'Loyer + charges',
        status: 'prevision',
        recurrenceRuleId: rule.id,
      });
      expect(await dataService.getTransaction(second.id)).toMatchObject({
        amount: -780,
        comment: 'Loyer',
      });
      expect((await dataService.listRecurrenceRules())[0]).toMatchObject({
        amount: -780,
        name: 'Loyer',
      });
    });

    it('can be deleted without touching its rule, and is not generated again', async () => {
      await rent({ automatic: true });
      const [first, second] = await dataService.listUpcomingOccurrences();

      await dataService.deleteOccurrence(first.id);
      await dataService.generateRecurrences();

      const remaining = await dataService.listUpcomingOccurrences();
      expect(remaining.map((o) => o.id)).toEqual([second.id]);
      expect(await dataService.listRecurrenceRules()).toHaveLength(1);
    });

    it('is left alone when its rule changes mode', async () => {
      const rule = await rent({ automatic: true });
      await dataService.setRecurrenceAutomatic(rule.id, false);
      expect(await dataService.listUpcomingOccurrences()).toHaveLength(2);
    });

    it('refuses to edit or delete a transaction that is not an occurrence', async () => {
      const manual = await dataService.createTransaction({
        accountId,
        operationDate: '2026-09-21',
        amount: -10,
      });
      await expect(dataService.updateOccurrence(manual.id, { amount: -20 })).rejects.toThrow(
        /not a generated occurrence/
      );
      await expect(dataService.deleteOccurrence(manual.id)).rejects.toThrow(
        /not a generated occurrence/
      );
      await expect(dataService.deleteOccurrence(9999)).rejects.toThrow(/not a generated occurrence/);
      expect((await dataService.getTransaction(manual.id))?.amount).toBe(-10);
    });

    it('refuses a zero amount', async () => {
      await rent({ automatic: true });
      const [first] = await dataService.listUpcomingOccurrences();
      await expect(dataService.updateOccurrence(first.id, { amount: 0 })).rejects.toThrow(/non-zero/);
    });
  });

  describe('validation', () => {
    it('refuses a rule without name, without amount, on an unknown account, or ending before it starts', async () => {
      await expect(rent({ name: '  ' })).rejects.toThrow(/name/);
      await expect(rent({ amount: 0 })).rejects.toThrow(/non-zero/);
      await expect(rent({ accountId: 999 })).rejects.toThrow(/does not exist/);
      await expect(rent({ endDate: '2025-12-31' })).rejects.toThrow(/end before/);
      expect(await dataService.listRecurrenceRules()).toEqual([]);
    });

    it('refuses the inter-account category, which needs a destination', async () => {
      await expect(rent({ categoryId: cat['Mouvement inter-compte'] })).rejects.toThrow(/destination/);
    });
  });

  describe('comptes', () => {
    it('drops the rules of a deleted account', async () => {
      const other = await dataService.createAccount({ name: 'Livret A', initialBalance: 0 });
      await rent({ accountId: other.id, automatic: true });
      await dataService.deleteAccount(other.id);
      expect(await dataService.listRecurrenceRules()).toEqual([]);
      expect(await dataService.listUpcomingOccurrences()).toEqual([]);
    });

    it('hides the rules and occurrences of an archived account', async () => {
      const other = await dataService.createAccount({ name: 'Livret A', initialBalance: 0 });
      await rent({ accountId: other.id, automatic: true });
      await dataService.archiveAccount(other.id);
      expect(await dataService.listRecurrenceRules()).toEqual([]);
      expect(await dataService.listUpcomingOccurrences()).toEqual([]);
    });
  });
});
