import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService, TransactionStatus } from './dataService';

const zeros = () => Array<number>(12).fill(0);
const at = (entries: Record<number, number>) => {
  const values = zeros();
  for (const [month, value] of Object.entries(entries)) values[Number(month)] = value;
  return values;
};

describe('dataService — bilan annuel (#25)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;
  const cat: Record<string, number> = {};

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    courant = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    for (const category of await dataService.listCategories()) cat[category.name] = category.id;
  });

  afterEach(() => close());

  const record = (
    category: string,
    amount: number,
    date: string,
    status: TransactionStatus = 'non_pointe',
    accountId = courant
  ) =>
    dataService.createTransaction({
      accountId,
      operationDate: date,
      amount,
      categoryId: cat[category],
      status,
    });

  describe('dépenses et recettes par catégorie et par mois', () => {
    it('details each category month by month, with its annual total', async () => {
      await record('Restaurant', -30, '2026-01-12');
      await record('Restaurant', -20, '2026-01-25');
      await record('Restaurant', -15.5, '2026-03-02');
      await record('Salaire/Intérêts/Avantages', 2000, '2026-01-28');

      const flows = await dataService.getCategoryFlowsByMonth(2026);

      expect(flows).toEqual([
        {
          categoryId: cat['Restaurant'],
          categoryName: 'Restaurant',
          expenses: at({ 0: 50, 2: 15.5 }),
          income: zeros(),
          totalExpenses: 65.5,
          totalIncome: 0,
        },
        {
          categoryId: cat['Salaire/Intérêts/Avantages'],
          categoryName: 'Salaire/Intérêts/Avantages',
          expenses: zeros(),
          income: at({ 0: 2000 }),
          totalExpenses: 0,
          totalIncome: 2000,
        },
      ]);
    });

    it('counts a split transaction through the categories of its portions', async () => {
      await dataService.createTransaction({
        accountId: courant,
        operationDate: '2026-02-14',
        amount: -80,
        categoryId: cat['Alimentation/Entretien essentiel'],
        splits: [
          { categoryId: cat['Alimentation/Entretien essentiel'], amount: -60 },
          { categoryId: cat['Cadeaux'], amount: -20 },
        ],
      });

      const flows = await dataService.getCategoryFlowsByMonth(2026);

      expect(flows.map((f) => [f.categoryName, f.expenses[1]])).toEqual([
        ['Alimentation/Entretien essentiel', 60],
        ['Cadeaux', 20],
      ]);
    });

    it('keeps real activity of the year only', async () => {
      await record('Restaurant', -10, '2026-05-03');
      await record('Restaurant', -100, '2025-12-31');
      await record('Restaurant', -100, '2027-01-01');
      await record('Restaurant', -100, '2026-05-04', 'prevision');

      const flows = await dataService.getCategoryFlowsByMonth(2026);

      expect(flows).toHaveLength(1);
      expect(flows[0].totalExpenses).toBe(10);
    });

    it('still counts what an account archived since then spent that year', async () => {
      const ancien = (await dataService.createAccount({ name: 'Ancien livret', initialBalance: 0 })).id;
      await record('Restaurant', -10, '2026-05-03');
      await record('Restaurant', -25, '2026-05-06', 'pointe', ancien);
      await dataService.archiveAccount(ancien);

      const flows = await dataService.getCategoryFlowsByMonth(2026);

      expect(flows[0].totalExpenses).toBe(35);
    });

    it('lists operations without a category last, under no name', async () => {
      await dataService.createTransaction({ accountId: courant, operationDate: '2026-04-01', amount: -5 });
      await record('Restaurant', -10, '2026-04-02');

      const flows = await dataService.getCategoryFlowsByMonth(2026);

      expect(flows.map((f) => f.categoryName)).toEqual(['Restaurant', null]);
    });
  });

  describe('soldes de l’année', () => {
    it('keeps an archived account only if it had operations that year', async () => {
      const ancien = (await dataService.createAccount({ name: 'Ancien livret', initialBalance: 50 })).id;
      await dataService.createAccount({ name: 'Compte fermé', initialBalance: 0 }).then((a) =>
        dataService.archiveAccount(a.id)
      );
      await record('Restaurant', -10, '2025-03-01', 'pointe', ancien);
      await dataService.archiveAccount(ancien);

      const past = await dataService.getYearBalances(2025);
      expect(past.accounts.map((a) => [a.account.name, a.realBalance])).toEqual([
        ['Compte courant', 1000],
        ['Ancien livret', 40],
      ]);
      expect(past.total.realBalance).toBe(1040);

      // An archived account is out of today's balances, like the total of Accueil.
      const current = await dataService.getYearBalances(new Date().getFullYear());
      expect(current.accounts.map((a) => a.account.name)).toEqual(['Compte courant']);
    });

    it('leaves a Fantôme out of both balances and counts a Prévision in the real one only', async () => {
      await record('Restaurant', -40, '2025-02-10', 'pointe');
      await record('Loisir', -100, '2025-04-02', 'prevision');
      await record('Virement', -300, '2025-04-03', 'fantome');

      const [account] = (await dataService.getYearBalances(2025)).accounts;
      expect(account.pointedBalance).toBe(960);
      expect(account.realBalance).toBe(860);
    });
  });

});

describe('dataService — cadre du bilan annuel (§6.7)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let courant: number;

  beforeEach(async () => {
    // Mid-September 2026.
    ({ dataService, close } = await createTestDataService({ now: () => new Date(2026, 8, 15) }));
    courant = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 0 })).id;
  });

  afterEach(() => close());

  const record = (date: string, status: TransactionStatus = 'pointe') =>
    dataService.createTransaction({ accountId: courant, operationDate: date, amount: -10, status });

  it('bounds the year selector from the first year with an operation to the current year', async () => {
    await record('2024-11-02');
    await record('2025-03-01', 'prevision');

    expect(await dataService.getYearStatus(2025)).toEqual({
      firstYear: 2024,
      currentYear: 2026,
      lastMonth: 11,
      hasOperations: true,
    });
  });

  it('counts the current year up to the current month, and a year to come not at all', async () => {
    expect((await dataService.getYearStatus(2026)).lastMonth).toBe(8);
    expect((await dataService.getYearStatus(2027)).lastMonth).toBeNull();
  });

  it('knows a year without any operation, whatever the status', async () => {
    await record('2026-12-24', 'prevision');

    expect(await dataService.getYearStatus(2025)).toMatchObject({ firstYear: 2026, hasOperations: false });
    expect((await dataService.getYearStatus(2026)).hasOperations).toBe(true);
  });

  it('has no first year before the first operation', async () => {
    expect((await dataService.getYearStatus(2026)).firstYear).toBeNull();
  });
});
