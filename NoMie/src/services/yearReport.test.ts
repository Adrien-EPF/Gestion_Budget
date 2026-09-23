import { createTestDataService } from '../test-utils/createTestDataService';
import { sumBalanceSeries, type DataService, type TransactionStatus } from './dataService';

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
      await record('Restaurant', -100, '2026-05-05', 'flux_comptable');

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

  describe("nombre d'opérations par compte et par mois", () => {
    it('counts every operation of the year, whatever its status, account by account', async () => {
      const livret = (await dataService.createAccount({ name: 'Livret A', initialBalance: 0 })).id;
      await record('Restaurant', -10, '2026-01-05');
      await record('Restaurant', -10, '2026-01-06', 'prevision');
      await record('Restaurant', -10, '2026-01-07', 'flux_comptable');
      await record('Restaurant', -10, '2026-12-31', 'pointe');
      await record('Restaurant', -10, '2025-12-31');
      await record('Salaire/Intérêts/Avantages', 3, '2026-06-30', 'pointe', livret);

      const counts = await dataService.getOperationCountsByMonth(2026);

      expect(counts.map((c) => [c.account.name, c.counts, c.total])).toEqual([
        ['Compte courant', at({ 0: 3, 11: 1 }), 4],
        ['Livret A', at({ 5: 1 }), 1],
      ]);
    });

    it('keeps an archived account only if it had operations that year', async () => {
      const ancien = (await dataService.createAccount({ name: 'Ancien livret', initialBalance: 0 })).id;
      const vide = (await dataService.createAccount({ name: 'Compte fermé', initialBalance: 0 })).id;
      await record('Restaurant', -10, '2026-03-01', 'pointe', ancien);
      await record('Restaurant', -10, '2025-03-01', 'pointe', vide);
      await dataService.archiveAccount(ancien);
      await dataService.archiveAccount(vide);

      const counts = await dataService.getOperationCountsByMonth(2026);

      expect(counts.map((c) => c.account.name)).toEqual(['Compte courant', 'Ancien livret']);
    });
  });

  describe('soldes pointés et réels sur l’année', () => {
    it('gives each account its balances at the end of every month, history included', async () => {
      await record('Salaire/Intérêts/Avantages', 500, '2025-11-20', 'pointe');
      await record('Restaurant', -40, '2026-02-10', 'pointe');
      await record('Restaurant', -25, '2026-02-18');
      await record('Loisir', -100, '2026-04-02', 'prevision');
      await record('Virement', -300, '2026-04-03', 'flux_comptable');

      const [series] = await dataService.getBalanceSeries(2026);

      expect(series.account.name).toBe('Compte courant');
      expect(series.pointed).toEqual([1500, 1460, 1460, 1460, 1460, 1460, 1460, 1460, 1460, 1460, 1460, 1460]);
      expect(series.real).toEqual([1500, 1435, 1435, 1335, 1335, 1335, 1335, 1335, 1335, 1335, 1335, 1335]);
    });

    it('keeps the same accounts as the operation counts', async () => {
      const ancien = (await dataService.createAccount({ name: 'Ancien livret', initialBalance: 50 })).id;
      await dataService.createAccount({ name: 'Compte fermé', initialBalance: 0 }).then((a) =>
        dataService.archiveAccount(a.id)
      );
      await record('Restaurant', -10, '2026-03-01', 'pointe', ancien);
      await dataService.archiveAccount(ancien);

      const series = await dataService.getBalanceSeries(2026);

      expect(series.map((s) => s.account.name)).toEqual(['Compte courant', 'Ancien livret']);
    });
  });

  it('sums several accounts’ balances month by month, to the cent', async () => {
    await dataService.createAccount({ name: 'Livret', initialBalance: 0.2 });
    await record('Restaurant', -0.1, '2026-03-02');

    const total = sumBalanceSeries(await dataService.getBalanceSeries(2026));

    expect(total.real).toEqual([1000.2, 1000.2, 1000.1, ...Array<number>(9).fill(1000.1)]);
    expect(total.pointed).toEqual(Array<number>(12).fill(1000.2));
  });
});
