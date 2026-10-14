import { createTestDataService } from '../test-utils/createTestDataService';
import { createDataService, type DataService } from './dataService';

describe('dataService — horloge applicative, date simulée, Prévision → Non pointé', () => {
  let dataService: DataService;
  let db: Awaited<ReturnType<typeof createTestDataService>>['db'];
  let close: () => Promise<void>;
  let courant: number;
  // Noon, 10 September 2026: far from any month boundary and never a DST edge.
  const realNow = () => new Date(2026, 8, 10, 12, 0, 0);

  beforeEach(async () => {
    ({ dataService, db, close } = await createTestDataService({ now: realNow }));
    courant = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
  });

  afterEach(() => close());

  const add = (operationDate: string, status: 'prevision' | 'non_pointe' | 'pointe' | 'fantome', amount = -10) =>
    dataService.createTransaction({ accountId: courant, operationDate, amount, status });

  describe('Prévision → Non pointé', () => {
    it('turns a Prévision dated today or before into a Non pointé, and leaves a future one alone', async () => {
      const past = await add('2026-09-01', 'prevision');
      const today = await add('2026-09-10', 'prevision');
      const future = await add('2026-09-11', 'prevision');

      await dataService.generateRecurrences();

      expect((await dataService.getTransaction(past.id))?.status).toBe('non_pointe');
      expect((await dataService.getTransaction(today.id))?.status).toBe('non_pointe');
      expect((await dataService.getTransaction(future.id))?.status).toBe('prevision');
    });

    it('can then be pointed like any normal operation', async () => {
      const forecast = await add('2026-09-05', 'prevision');
      await dataService.generateRecurrences();

      await dataService.setPointed(forecast.id, true);

      expect((await dataService.getTransaction(forecast.id))?.status).toBe('pointe');
    });

    it('is idempotent, and leaves every other status as it is', async () => {
      const ghost = await add('2026-09-01', 'fantome');
      const pointed = await add('2026-09-01', 'pointe');
      await add('2026-09-01', 'prevision');

      await dataService.generateRecurrences();
      await dataService.generateRecurrences();

      expect((await dataService.getTransaction(ghost.id))?.status).toBe('fantome');
      expect((await dataService.getTransaction(pointed.id))?.status).toBe('pointe');
      expect(await dataService.countToPoint()).toBe(1);
    });

    it('moves an occurrence generated for today straight to Non pointé', async () => {
      await dataService.createRecurrenceRule({
        name: 'Loyer',
        accountId: courant,
        amount: -560,
        frequency: 'monthly',
        referenceDate: '2026-09-10',
        automatic: true,
      });

      const [thisMonth] = (await dataService.listMonthTransactions({ year: 2026, month: 8 })).filter(
        (t) => t.comment === 'Loyer'
      );
      expect(thisMonth.status).toBe('non_pointe');
    });
  });

  describe('date simulée', () => {
    it('reads today from the real clock until a simulation starts', async () => {
      expect(dataService.now().getTime()).toBe(realNow().getTime());
      expect(await dataService.getSimulatedClock()).toEqual({ offsetDays: 0, simulatedDate: null });
    });

    it('moves the app clock forward by N days, and tells the simulated date', async () => {
      await dataService.advanceSimulatedDays(25);

      expect(dataService.now().getDate()).toBe(5);
      expect(dataService.now().getMonth()).toBe(9);
      expect(await dataService.getSimulatedClock()).toEqual({
        offsetDays: 25,
        simulatedDate: '2026-10-05',
      });
    });

    it('adds up successive advances', async () => {
      await dataService.advanceSimulatedDays(10);
      await dataService.advanceSimulatedDays(5);

      expect((await dataService.getSimulatedClock()).simulatedDate).toBe('2026-09-25');
    });

    it('refuses an advance that is not a whole number of days of at least one', async () => {
      await expect(dataService.advanceSimulatedDays(0)).rejects.toThrow();
      await expect(dataService.advanceSimulatedDays(-3)).rejects.toThrow();
      await expect(dataService.advanceSimulatedDays(1.5)).rejects.toThrow();
    });

    it('makes the recurrences produce what the new date calls for, and turns passed forecasts into Non pointé', async () => {
      await dataService.createRecurrenceRule({
        name: 'Loyer',
        accountId: courant,
        amount: -560,
        frequency: 'monthly',
        referenceDate: '2026-09-15',
        automatic: true,
      });
      const loyers = async () =>
        (await dataService.listMonthTransactions({ year: 2026, month: 9 })).filter((t) => t.comment === 'Loyer');
      expect(await loyers()).toHaveLength(1); // 15 October, already generated one month ahead
      expect((await loyers())[0].status).toBe('prevision');

      await dataService.advanceSimulatedDays(40); // 20 October

      expect((await loyers())[0].status).toBe('non_pointe');
      const november = await dataService.listMonthTransactions({ year: 2026, month: 10 });
      expect(november.filter((t) => t.comment === 'Loyer')).toHaveLength(1);
      const december = await dataService.listMonthTransactions({ year: 2026, month: 11 });
      expect(december.filter((t) => t.comment === 'Loyer')).toHaveLength(0);
    });

    it('survives a relaunch: a second service on the same database keeps the offset', async () => {
      await dataService.advanceSimulatedDays(12);

      const relaunched = createDataService(db, { now: realNow });
      await relaunched.initialize();

      expect((await relaunched.getSimulatedClock()).simulatedDate).toBe('2026-09-22');
      expect(relaunched.now().getDate()).toBe(22);
    });

    it('tells its subscribers when the date moves', async () => {
      const listener = jest.fn();
      dataService.subscribe(listener);

      await dataService.advanceSimulatedDays(3);

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('revenir à aujourd’hui', () => {
    it('undoes everything created or changed during the test, and gives the real date back', async () => {
      const before = await add('2026-09-08', 'pointe', -20);
      await dataService.advanceSimulatedDays(30);
      const during = await add('2026-10-01', 'non_pointe', -99);
      await dataService.setPointed(before.id, false);
      await dataService.createAccount({ name: 'Pendant le test', initialBalance: 5 });

      await dataService.resetSimulatedDate();

      expect(await dataService.getTransaction(during.id)).toBeNull();
      expect((await dataService.getTransaction(before.id))?.status).toBe('pointe');
      expect((await dataService.listAccounts()).map((a) => a.name)).toEqual(['Compte courant']);
      expect(await dataService.getSimulatedClock()).toEqual({ offsetDays: 0, simulatedDate: null });
      expect(dataService.now().getTime()).toBe(realNow().getTime());
    });

    it('restores the state from before the first advance, however many advances came after', async () => {
      await dataService.advanceSimulatedDays(5);
      await add('2026-09-16', 'non_pointe');
      await dataService.advanceSimulatedDays(5);
      await add('2026-09-21', 'non_pointe');

      await dataService.resetSimulatedDate();

      expect(await dataService.listMonthTransactions({ year: 2026, month: 8 })).toEqual([]);
    });

    it('lets the test be replayed from the same starting point', async () => {
      await dataService.createRecurrenceRule({
        name: 'Loyer',
        accountId: courant,
        amount: -560,
        frequency: 'monthly',
        referenceDate: '2026-09-15',
        automatic: true,
      });
      const countLoyers = async () => {
        let total = 0;
        for (const month of [9, 10, 11]) {
          total += (await dataService.listMonthTransactions({ year: 2026, month })).filter(
            (t) => t.comment === 'Loyer'
          ).length;
        }
        return total;
      };
      const initial = await countLoyers();

      await dataService.advanceSimulatedDays(60);
      expect(await countLoyers()).not.toBe(initial);
      await dataService.resetSimulatedDate();
      expect(await countLoyers()).toBe(initial);

      await dataService.advanceSimulatedDays(60);
      await dataService.resetSimulatedDate();
      expect(await countLoyers()).toBe(initial);
    });

    it('does nothing when no simulation is running', async () => {
      const kept = await add('2026-09-08', 'pointe');

      await dataService.resetSimulatedDate();

      expect(await dataService.getTransaction(kept.id)).not.toBeNull();
    });

    it('does not take the simulation snapshot into a backup of the data', async () => {
      await dataService.advanceSimulatedDays(2);

      const backup = JSON.stringify(await dataService.createBackup());

      expect(backup).not.toContain('snapshot');
      expect(backup).not.toContain('offset_days');
    });
  });
});
