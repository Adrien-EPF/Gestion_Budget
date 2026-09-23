import { act, screen, within } from '@testing-library/react-native';
import type { DataService } from '../services/dataService';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp } from '../test-utils/renderWithApp';

const year = new Date().getFullYear();

async function openYearReport() {
  await press(screen.getByRole('button', { name: 'Bilan annuel' }));
  await screen.findByTestId('year-report-title');
}

describe('Écran Bilan annuel (#25)', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;
  let accountId: number;
  const cat: Record<string, number> = {};

  beforeEach(async () => {
    app = await renderApp();
    await act(async () => {
      accountId = (await app.dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
      for (const category of await app.dataService.listCategories()) cat[category.name] = category.id;
    });
  });

  afterEach(() => app.teardown());

  const record = (category: string, amount: number, date: string, dataService: DataService = app.dataService) =>
    act(async () => {
      await dataService.createTransaction({
        accountId,
        operationDate: date,
        amount,
        categoryId: cat[category],
        status: 'pointe',
      });
    });

  it('opens from Accueil on the year being viewed, and closes back to it', async () => {
    await openYearReport();

    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year));

    await press(screen.getByLabelText('Fermer'));
    expect(screen.queryByTestId('year-report-title')).toBeNull();
    expect(screen.getByText('Solde réel · tous comptes')).toBeTruthy();
  });

  it('opens on the year of the month chosen on Accueil', async () => {
    for (let i = 0; i <= new Date().getMonth(); i++) {
      await press(screen.getByLabelText('Mois précédent'));
    }
    await openYearReport();

    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year - 1));
  });

  it('details expenses and income by category and month, with their annual total', async () => {
    await record('Restaurant', -30, `${year}-01-12`);
    await record('Restaurant', -12.5, `${year}-03-02`);
    await record('Salaire/Intérêts/Avantages', 2000, `${year}-01-28`);
    await openYearReport();

    const restaurant = within(screen.getByTestId('year-expenses-row-Restaurant'));
    expect(restaurant.getByText('Restaurant')).toBeTruthy();
    expect(restaurant.getByText(plain(formatAmount(30)))).toBeTruthy();
    expect(restaurant.getByText(plain(formatAmount(12.5)))).toBeTruthy();
    expect(restaurant.getByText(plain(formatAmount(42.5)))).toBeTruthy();

    const salary = within(screen.getByTestId('year-income-row-Salaire/Intérêts/Avantages'));
    expect(salary.getAllByText(plain(formatAmount(2000)))).toHaveLength(2);
    expect(screen.queryByTestId('year-income-row-Restaurant')).toBeNull();
  });

  it('shows operation counts per account and end-of-month balances', async () => {
    await record('Restaurant', -40, `${year}-01-10`);
    await record('Restaurant', -10, `${year}-01-20`);
    await openYearReport();

    const counts = within(screen.getByTestId('year-counts-row-Compte courant'));
    expect(counts.getAllByText('2')).toHaveLength(2); // January and the annual total

    const real = within(screen.getByTestId('year-balances-row-Compte courant-real'));
    expect(real.getAllByText(plain(formatAmount(950)))).toHaveLength(12);
    const pointed = within(screen.getByTestId('year-balances-row-Compte courant-pointed'));
    expect(pointed.getAllByText(plain(formatAmount(950)))).toHaveLength(12);
  });

  it('charts the spending of the year by category, largest first (#28)', async () => {
    await record('Loisir', -25, `${year}-02-03`);
    await record('Restaurant', -30, `${year}-01-12`);
    await record('Restaurant', -45, `${year}-05-12`);
    await record('Salaire/Intérêts/Avantages', 2000, `${year}-01-28`);
    await openYearReport();

    const chart = within(screen.getByTestId('expense-breakdown'));
    const restaurant = within(chart.getByTestId('expense-breakdown-slice-0'));
    expect(restaurant.getByText('Restaurant')).toBeTruthy();
    expect(restaurant.getByText(plain(formatAmount(75)))).toBeTruthy();
    expect(restaurant.getByText('75 %')).toBeTruthy();
    const loisir = within(chart.getByTestId('expense-breakdown-slice-1'));
    expect(loisir.getByText('Loisir')).toBeTruthy();
    expect(loisir.getByText('25 %')).toBeTruthy();
    expect(chart.queryByText('Salaire/Intérêts/Avantages')).toBeNull();
  });

  it('charts the balance over the year, for every account together or one at a time (#28)', async () => {
    await act(async () => {
      await app.dataService.createAccount({ name: 'Livret', initialBalance: 500 });
    });
    await record('Restaurant', -50, `${year}-01-10`);
    await openYearReport();

    const chart = () => screen.getByTestId('balance-chart');
    expect(chart().props.accessibilityLabel).toBe(
      `Solde réel de tous les comptes : ${formatAmount(1450)} fin janvier, ${formatAmount(1450)} fin décembre`
    );

    await press(screen.getByRole('button', { name: 'Livret' }));
    expect(chart().props.accessibilityLabel).toBe(
      `Solde réel de Livret : ${formatAmount(500)} fin janvier, ${formatAmount(500)} fin décembre`
    );

    await press(screen.getByRole('button', { name: 'Tous les comptes' }));
    expect(chart().props.accessibilityLabel).toContain('tous les comptes');
  });

  it('compares each budget planned so far this year with what was spent (#29)', async () => {
    await act(async () => {
      await app.dataService.createBudget({
        categoryId: cat['Restaurant'],
        amount: 100,
        startMonth: { year, month: 0 },
      });
    });
    await record('Restaurant', -30, `${year}-01-12`);
    await openYearReport();

    const monthsSoFar = new Date().getMonth() + 1;
    const restaurant = within(screen.getByTestId('budget-comparison-row-Restaurant'));
    expect(restaurant.getByText(plain(formatAmount(30)))).toBeTruthy();
    expect(restaurant.getByText(`sur ${plain(formatAmount(100 * monthsSoFar))} prévus`)).toBeTruthy();

    await press(screen.getByLabelText('Année suivante'));
    expect(screen.getByText('Pas encore de budget à comparer sur cette année.')).toBeTruthy();
  });

  it('switches year with the selector', async () => {
    await record('Restaurant', -30, `${year - 1}-06-12`);
    await openYearReport();
    expect(screen.getByText('Aucune dépense cette année.')).toBeTruthy();

    await press(screen.getByLabelText('Année précédente'));

    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year - 1));
    expect(screen.getByTestId('year-expenses-row-Restaurant')).toBeTruthy();

    await press(screen.getByLabelText('Année suivante'));
    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year));
  });
});
