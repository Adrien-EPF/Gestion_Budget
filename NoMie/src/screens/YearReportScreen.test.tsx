import { act, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import { monthName } from '../navigation/formatMonthLabel';
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

    expect(within(screen.getByTestId('year-expenses-label-Restaurant')).getByText('Restaurant')).toBeTruthy();
    const restaurant = within(screen.getByTestId('year-expenses-row-Restaurant'));
    expect(restaurant.getByText(plain(formatAmount(30)))).toBeTruthy();
    expect(restaurant.getByText(plain(formatAmount(12.5)))).toBeTruthy();
    expect(restaurant.getByText(plain(formatAmount(42.5)))).toBeTruthy();

    const salary = within(screen.getByTestId('year-income-row-Salaire/Intérêts/Avantages'));
    expect(salary.getAllByText(plain(formatAmount(2000)))).toHaveLength(2);
    expect(screen.queryByTestId('year-income-row-Restaurant')).toBeNull();
  });

  it('shows operation counts per account and end-of-month real balances', async () => {
    await record('Restaurant', -40, `${year}-01-10`);
    await record('Restaurant', -10, `${year}-01-20`);
    await openYearReport();

    const counts = within(screen.getByTestId('year-counts-row-Compte courant'));
    expect(counts.getAllByText('2')).toHaveLength(2); // January and the annual total

    const real = within(screen.getByTestId('year-balances-row-Compte courant'));
    expect(real.getAllByText(plain(formatAmount(950)))).toHaveLength(12);
  });

  it('charts the spending of the year by category, largest first, the first one unfolded (§6.7)', async () => {
    await record('Loisir', -25, `${year}-02-03`);
    await record('Restaurant', -30, `${year}-01-12`);
    await record('Restaurant', -45, `${year}-05-12`);
    await record('Salaire/Intérêts/Avantages', 2000, `${year}-01-28`);
    await openYearReport();

    const chart = within(screen.getByTestId('expense-breakdown'));
    const restaurant = within(chart.getByTestId('expense-breakdown-row-Restaurant'));
    expect(restaurant.getByText('Restaurant')).toBeTruthy();
    expect(restaurant.getByText(plain(formatAmount(75)))).toBeTruthy();
    expect(restaurant.getByText('75 %')).toBeTruthy();
    const loisir = within(chart.getByTestId('expense-breakdown-row-Loisir'));
    expect(loisir.getByText('Loisir')).toBeTruthy();
    expect(loisir.getByText('25 %')).toBeTruthy();
    expect(chart.queryByText('Salaire/Intérêts/Avantages')).toBeNull();
    expect(chart.getByTestId('expense-breakdown-months-Restaurant')).toBeTruthy();
  });



  it('charts each account’s balance and reads the current month under the chart (§6.7)', async () => {
    let livretId = 0;
    await act(async () => {
      livretId = (await app.dataService.createAccount({ name: 'Livret', initialBalance: 500 })).id;
    });
    await record('Restaurant', -50, `${year}-01-10`);
    await openYearReport();

    const chart = within(screen.getByTestId('balance-chart'));
    expect(chart.getByText(`Fin ${monthName(new Date().getMonth()).toLowerCase()}`)).toBeTruthy();
    const courant = within(chart.getByTestId(`balance-chart-reading-${accountId}`));
    expect(courant.getByText(plain(formatAmount(950)))).toBeTruthy();
    expect(courant.getByText(`Pointé ${plain(formatAmount(950))}`)).toBeTruthy();

    await press(chart.getByRole('button', { name: 'Livret' }));

    expect(chart.queryByTestId(`balance-chart-reading-${accountId}`)).toBeNull();
    expect(chart.getByTestId(`balance-chart-reading-${livretId}`)).toBeTruthy();
  });

  it('compares one budget at a time, month by month, picked from its chip (§6.7)', async () => {
    await act(async () => {
      for (const [category, amount] of [['Restaurant', 100], ['Loisir', 50]] as const) {
        await app.dataService.createBudget({ categoryId: cat[category], amount, startMonth: { year, month: 0 } });
      }
    });
    await record('Restaurant', -130, `${year}-01-12`);
    await openYearReport();

    const chart = () => within(screen.getByTestId('budget-year'));
    // Budgets come in category order: Loisir first.
    expect(chart().getByRole('button', { name: 'Loisir' }).props.accessibilityState.selected).toBe(true);
    expect(chart().getByText('Rien de dépensé ici cette année.')).toBeTruthy();

    await press(chart().getByRole('button', { name: 'Restaurant' }));

    expect(chart().getByRole('button', { name: 'Restaurant' }).props.accessibilityState.selected).toBe(true);
    expect(StyleSheet.flatten(chart().getByTestId('budget-year-bar-0').props.style).backgroundColor).toBe(
      colors.budgetWatch
    );
  });

  it('offers to create a budget when none is followed that year', async () => {
    await record('Restaurant', -30, `${year}-01-12`);
    await openYearReport();
    expect(screen.getByText('Aucun budget suivi cette année.')).toBeTruthy();

    await press(screen.getByRole('button', { name: 'Créer un budget' }));

    expect(screen.queryByTestId('year-report-title')).toBeNull();
    expect(screen.getByRole('button', { name: '+ Ajouter un budget' })).toBeTruthy();
  });

  it('switches year with the selector', async () => {
    await record('Restaurant', -30, `${year - 1}-06-12`);
    await record('Salaire/Intérêts/Avantages', 2000, `${year}-01-28`);
    await openYearReport();
    expect(screen.getByText('Aucune dépense cette année.')).toBeTruthy();

    await press(screen.getByLabelText('Année précédente'));

    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year - 1));
    expect(screen.getByTestId('year-expenses-row-Restaurant')).toBeTruthy();

    await press(screen.getByLabelText('Année suivante'));
    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year));
  });

  describe('structure de l’écran (§6.7)', () => {
    const sectionTitles = () => screen.getAllByRole('header').map((h) => h.props.children);
    const isDisabled = (label: string) => screen.getByLabelText(label).props.accessibilityState?.disabled;

    it('shows the balances first, then spending, budgets, income and operations', async () => {
      await record('Restaurant', -30, `${year}-01-12`);
      await openYearReport();

      expect(sectionTitles()).toEqual([
        'Soldes en fin de mois',
        'Dépenses par catégorie',
        'Budgets · prévu et réalisé',
        'Recettes par catégorie',
        'Opérations par compte',
      ]);
    });

    it('moves between the first year with an operation and the current year, no further', async () => {
      await record('Restaurant', -30, `${year - 1}-06-12`);
      await openYearReport();
      expect(screen.getByText(/^Année en cours · réalisé jusqu’à fin /)).toBeTruthy();
      expect(isDisabled('Année suivante')).toBe(true);
      expect(isDisabled('Année précédente')).toBe(false);

      await press(screen.getByLabelText('Année précédente'));

      expect(screen.getByTestId('year-report-year').props.children).toBe(String(year - 1));
      expect(screen.getByText('Année complète')).toBeTruthy();
      expect(isDisabled('Année précédente')).toBe(true);
      await press(screen.getByLabelText('Année précédente'));
      expect(screen.getByTestId('year-report-year').props.children).toBe(String(year - 1));
    });

    it('replaces the sections with a single card for a year without any operation', async () => {
      await record('Restaurant', -30, `${year}-01-12`);
      for (let i = 0; i <= new Date().getMonth(); i++) {
        await press(screen.getByLabelText('Mois précédent'));
      }
      await openYearReport();

      expect(screen.getByText(`Aucune opération en ${year - 1}.`)).toBeTruthy();
      expect(screen.queryAllByRole('header')).toHaveLength(0);

      await press(screen.getByRole('button', { name: `Voir ${year}` }));

      expect(screen.getByTestId('year-report-year').props.children).toBe(String(year));
      expect(sectionTitles()).toHaveLength(5);
    });

    it('groups the spending table exactly like its chart, with a total line', async () => {
      const spending = ['Restaurant', 'Loisir', 'Culture', 'Cadeaux', 'Voiture', 'Santé', 'Habillement', 'Logement', 'Don'];
      for (const [i, name] of spending.entries()) {
        await record(name, -(100 - i), `${year}-01-0${i + 1}`);
      }
      await act(async () => {
        await app.dataService.createTransaction({ accountId, operationDate: `${year}-01-20`, amount: -3 });
      });
      await openYearReport();

      const labels = within(screen.getByTestId('year-expenses'));
      expect(labels.getByText('Habillement')).toBeTruthy();
      expect(labels.queryByText('Logement')).toBeNull();
      expect(within(screen.getByTestId('year-expenses-label-others')).getByText('Autres (2)')).toBeTruthy();
      expect(within(screen.getByTestId('year-expenses-label-uncategorized')).getByText('Sans catégorie')).toBeTruthy();
      expect(screen.getByTestId('year-expenses-label-total')).toBeTruthy();
    });
  });
});
