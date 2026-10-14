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

  it('splits the year’s bilan expenses per importance', async () => {
    await act(async () => {
      for (const [amount, importance, date] of [
        [-30, 'essentiel', `${year}-01-10`],
        [-10, 'secondaire_superflu', `${year}-01-20`],
      ] as const) {
        await app.dataService.createTransaction({ accountId, operationDate: date, amount, importance, status: 'pointe' });
      }
    });
    await openYearReport();

    const card = await screen.findByTestId('year-importance');
    expect(within(card).getByLabelText(`Essentiel, ${formatAmount(30)}`)).toBeTruthy();
    expect(within(card).getByLabelText(`Secondaire superflu, ${formatAmount(10)}`)).toBeTruthy();
    expect(within(card).getByText('75 %')).toBeTruthy();
  });

  it('opens on the year of the month chosen on Accueil', async () => {
    for (let i = 0; i <= new Date().getMonth(); i++) {
      await press(screen.getByLabelText('Mois précédent'));
    }
    await openYearReport();

    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year - 1));
  });

  it('opens the Comptable section on dépenses, recettes and the monthly average of the expenses', async () => {
    await record('Restaurant', -30, `${year}-01-12`);
    await record('Restaurant', -12.5, `${year}-01-20`);
    await record('Salaire/Intérêts/Avantages', 2000, `${year}-01-28`);
    await act(async () => {
      await app.dataService.createTransaction({
        accountId,
        operationDate: `${year}-01-30`,
        amount: -500,
        status: 'prevision',
      });
    });
    await openYearReport();

    expect(screen.getByTestId('year-summary-expenses').props.children).toBe(formatAmount(42.5));
    expect(screen.getByTestId('year-summary-income').props.children).toBe(formatAmount(2000));
    // 42,50 € over the months gone by: January up to the current month.
    expect(screen.getByTestId('year-summary-average').props.children).toBe(
      formatAmount(Math.round((42.5 / (new Date().getMonth() + 1)) * 100) / 100)
    );
  });

  it('shows the balances of the Trésorerie section per account and in total, réel and pointé', async () => {
    await act(async () => {
      await app.dataService.createAccount({ name: 'Livret', initialBalance: 500 });
    });
    await record('Restaurant', -40, `${year}-01-10`);
    await act(async () => {
      await app.dataService.createTransaction({
        accountId,
        operationDate: `${year}-01-11`,
        amount: -10,
        status: 'non_pointe',
      });
    });
    await openYearReport();

    const courant = within(screen.getByTestId(`year-treasury-account-${accountId}`));
    expect(courant.getByText('Compte courant')).toBeTruthy();
    expect(courant.getByText(plain(formatAmount(950)))).toBeTruthy();
    expect(courant.getByText(plain(`Pointé ${formatAmount(960)}`))).toBeTruthy();
    const total = within(screen.getByTestId('year-treasury-total'));
    expect(total.getByText(plain(formatAmount(1450)))).toBeTruthy();
    expect(total.getByText(plain(`Pointé ${formatAmount(1460)}`))).toBeTruthy();
    expect(screen.getByText('Aujourd’hui')).toBeTruthy();
  });

  it('reads the balances at the end of a past year', async () => {
    await record('Restaurant', -40, `${year - 1}-06-10`);
    await record('Restaurant', -10, `${year}-01-10`);
    await openYearReport();
    await press(screen.getByLabelText('Année précédente'));

    expect(screen.getByText(`Au 31 décembre ${year - 1}`)).toBeTruthy();
    const total = within(screen.getByTestId('year-treasury-total'));
    expect(total.getByText(plain(formatAmount(960)))).toBeTruthy();
  });

  it('gathers advances, reimbursements and movements between accounts in a Hors bilan block', async () => {
    let livretId = 0;
    await act(async () => {
      livretId = (await app.dataService.createAccount({ name: 'Livret', initialBalance: 0 })).id;
    });
    await record('Avancé', -80, `${year}-01-12`);
    await act(async () => {
      await app.dataService.createTransaction({
        accountId,
        operationDate: `${year}-01-13`,
        amount: -200,
        categoryId: cat['Mouvement inter-compte'],
        transferToAccountId: livretId,
      });
    });
    await openYearReport();

    const block = within(screen.getByTestId('year-off-balance'));
    expect(block.getByLabelText(`Avances versées, ${formatAmount(80)}`)).toBeTruthy();
    expect(block.getByLabelText(`Mouvements entre comptes, ${formatAmount(200)}`)).toBeTruthy();
    expect(block.queryByText('Remboursements reçus')).toBeNull();
  });

  it('has no Hors bilan block, and no removed section, when there is nothing to show', async () => {
    await record('Restaurant', -30, `${year}-01-12`);
    await openYearReport();

    expect(screen.queryByTestId('year-off-balance')).toBeNull();
    expect(screen.queryByTestId('balance-chart')).toBeNull();
    expect(screen.queryByTestId('year-balances')).toBeNull();
    expect(screen.queryByText('Recettes par catégorie')).toBeNull();
    expect(screen.queryByText('Opérations par compte')).toBeNull();
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

  it('leaves the budgets section out when no budget is followed that year', async () => {
    await record('Restaurant', -30, `${year}-01-12`);
    await openYearReport();

    expect(screen.queryByText('Budgets · prévu et réalisé')).toBeNull();
    expect(screen.queryByText('Aucun budget suivi cette année.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Créer un budget' })).toBeNull();
  });

  it('switches year with the selector', async () => {
    await record('Restaurant', -30, `${year - 1}-06-12`);
    await record('Salaire/Intérêts/Avantages', 2000, `${year}-01-28`);
    await openYearReport();
    expect(screen.getByText('Aucune dépense cette année.')).toBeTruthy();

    await press(screen.getByLabelText('Année précédente'));

    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year - 1));
    expect(screen.getByTestId('expense-breakdown-row-Restaurant')).toBeTruthy();

    await press(screen.getByLabelText('Année suivante'));
    expect(screen.getByTestId('year-report-year').props.children).toBe(String(year));
  });

  describe('structure de l’écran (§6.7)', () => {
    // Accueil stays mounted behind the Modal and has its own Trésorerie and Comptable.
    const report = () => within(screen.getByTestId('year-report'));
    const sectionTitles = () => report().getAllByRole('header').map((h) => h.props.children);
    const isDisabled = (label: string) => screen.getByLabelText(label).props.accessibilityState?.disabled;

    it('shows the Trésorerie first, then the Comptable with its blocks', async () => {
      await record('Restaurant', -30, `${year}-01-12`);
      await act(async () => {
        await app.dataService.createBudget({ categoryId: cat['Restaurant'], amount: 100, startMonth: { year, month: 0 } });
      });
      await record('Avancé', -10, `${year}-01-13`);
      await openYearReport();

      expect(sectionTitles()).toEqual([
        'Trésorerie',
        'Comptable',
        'Dépenses par importance',
        'Dépenses par catégorie',
        'Budgets · prévu et réalisé',
        'Hors bilan',
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
      expect(report().queryAllByRole('header')).toHaveLength(0);

      await press(screen.getByRole('button', { name: `Voir ${year}` }));

      expect(screen.getByTestId('year-report-year').props.children).toBe(String(year));
      expect(sectionTitles()).toEqual(['Trésorerie', 'Comptable', 'Dépenses par importance', 'Dépenses par catégorie']);
    });

    it('lists the 6 main categories, then « Autres », then « Sans catégorie »', async () => {
      const spending = ['Restaurant', 'Loisir', 'Culture', 'Cadeaux', 'Voiture', 'Santé', 'Habillement', 'Logement', 'Don'];
      for (const [i, name] of spending.entries()) {
        await record(name, -(100 - i), `${year}-01-0${i + 1}`);
      }
      await act(async () => {
        await app.dataService.createTransaction({ accountId, operationDate: `${year}-01-20`, amount: -3 });
      });
      await openYearReport();

      const list = within(screen.getByTestId('expense-breakdown'));
      expect(list.getByText('Santé')).toBeTruthy();
      expect(list.queryByText('Habillement')).toBeNull();
      expect(list.getByText('Autres (3)')).toBeTruthy();
      expect(list.getByText('Sans catégorie')).toBeTruthy();
    });
  });
});
