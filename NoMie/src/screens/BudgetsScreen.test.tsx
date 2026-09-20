import { act, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '../theme/tokens';
import type { DataService } from '../services/dataService';
import { toIsoDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp, typeInto } from '../test-utils/renderWithApp';

const now = new Date();
const today = toIsoDate(now);
const THIS_MONTH = { year: now.getFullYear(), month: now.getMonth() };
const LAST_MONTH =
  now.getMonth() === 0
    ? { year: now.getFullYear() - 1, month: 11 }
    : { year: now.getFullYear(), month: now.getMonth() - 1 };
const lastMonthDate = toIsoDate(new Date(LAST_MONTH.year, LAST_MONTH.month, 15));

const fillColor = (id: number) =>
  StyleSheet.flatten(screen.getByTestId(`budget-bar-${id}`).props.style).backgroundColor;

describe('Écran Budgets', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;
  let accountId: number;
  const cat: Record<string, number> = {};

  beforeEach(async () => {
    app = await renderApp();
    await act(async () => {
      accountId = (await app.dataService.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
      for (const c of await app.dataService.listCategories()) cat[c.name] = c.id;
    });
  });

  afterEach(() => app.teardown());

  const seed = (fn: (s: DataService) => Promise<unknown>) =>
    act(async () => {
      await fn(app.dataService);
    });

  const createBudget = async (name: string, amount: number, extra: { carryOver?: boolean; startMonth?: typeof THIS_MONTH } = {}) => {
    let id = 0;
    await seed(async (s) => {
      id = (await s.createBudget({ categoryId: cat[name], amount, ...extra })).id;
    });
    return id;
  };

  const spend = (name: string, amount: number, date = today) =>
    seed((s) =>
      s.createTransaction({ accountId, operationDate: date, amount: -amount, categoryId: cat[name] })
    );

  async function openBudgets() {
    await press(screen.getByLabelText('Budgets'));
    await screen.findByText('+ Ajouter un budget');
  }

  it('invites, calmly, to add a first budget when there is none', async () => {
    await openBudgets();
    expect(screen.getByText(/Aucun budget pour ce mois-ci/)).toBeTruthy();
    expect(screen.queryByTestId('budgets-spent')).toBeNull();
  });

  describe('ajout d’un budget', () => {
    it('creates a budget from a category and a monthly amount, then shows its card', async () => {
      await openBudgets();

      await press(screen.getByText('+ Ajouter un budget'));
      await press(screen.getByLabelText('Restaurant'));
      await typeInto(screen.getByLabelText('Montant prévu par mois'), '120');
      await press(screen.getByLabelText('Ajouter'));

      const { budgets } = await app.dataService.getBudgetOverview(THIS_MONTH);
      expect(budgets).toHaveLength(1);
      expect(budgets[0].budget).toMatchObject({ categoryName: 'Restaurant', amount: 120, carryOver: false });

      expect(await screen.findByText(plain('0 / 120 €'))).toBeTruthy();
      expect(screen.getByTestId('budgets-planned').props.children).toBe(formatAmount(120));
      // The category is taken: it is no longer offered.
      await press(screen.getByText('+ Ajouter un budget'));
      expect(screen.queryByLabelText('Restaurant')).toBeNull();
    });

    it('asks for a category and a valid amount, without creating anything', async () => {
      await openBudgets();
      await press(screen.getByText('+ Ajouter un budget'));

      await press(screen.getByLabelText('Ajouter'));
      expect(screen.getByText('Choisis la catégorie à suivre.')).toBeTruthy();
      expect(screen.getByText(/doit être un nombre supérieur à zéro/)).toBeTruthy();

      await press(screen.getByLabelText('Loisir'));
      await typeInto(screen.getByLabelText('Montant prévu par mois'), '0');
      await press(screen.getByLabelText('Ajouter'));
      expect(screen.getByText(/doit être un nombre supérieur à zéro/)).toBeTruthy();

      expect((await app.dataService.getBudgetOverview(THIS_MONTH)).budgets).toEqual([]);
    });

    it('closes without creating anything on Annuler', async () => {
      await openBudgets();
      await press(screen.getByText('+ Ajouter un budget'));
      await press(screen.getByLabelText('Annuler'));
      expect((await app.dataService.getBudgetOverview(THIS_MONTH)).budgets).toEqual([]);
      expect(screen.queryByText('Nouveau budget')).toBeNull();
    });
  });

  describe('carte de synthèse', () => {
    it('shows what is spent against what is planned, across all budgets', async () => {
      await createBudget('Restaurant', 120);
      await createBudget('Loisir', 80);
      await spend('Restaurant', 50);
      await spend('Loisir', 30);
      await openBudgets();

      expect(screen.getByTestId('budgets-spent').props.children).toBe(formatAmount(80));
      expect(screen.getByTestId('budgets-planned').props.children).toBe(formatAmount(200));
      expect(screen.getByText(/du mois écoulé|Le mois n’a pas encore commencé|Mois terminé/)).toBeTruthy();
    });
  });

  describe('carte d’un budget', () => {
    it('shows the ratio and what is left, factually', async () => {
      await createBudget('Restaurant', 120);
      await spend('Restaurant', 45.5);
      await openBudgets();

      expect(screen.getByText(plain('45,50 / 120 €'))).toBeTruthy();
      expect(screen.getByText(plain(`Il reste ${formatAmount(74.5)} pour ce mois-ci.`))).toBeTruthy();
    });

    it('keeps the calm tint up to 85 %, and switches to the watch tint past it', async () => {
      const id = await createBudget('Restaurant', 100);
      await spend('Restaurant', 85);
      await openBudgets();
      expect(fillColor(id)).toBe(colors.budgetOk);

      await spend('Restaurant', 1);
      expect(fillColor(id)).toBe(colors.budgetWatch);
    });

    it('caps the bar at its track and words an overrun softly, never as a reproach', async () => {
      const id = await createBudget('Restaurant', 120);
      await spend('Restaurant', 138);
      await openBudgets();

      expect(StyleSheet.flatten(screen.getByTestId(`budget-bar-${id}`).props.style).width).toBe('100%');
      expect(screen.getByText(plain('138 / 120 €'))).toBeTruthy();
      expect(screen.getByText('Un peu plus qu’en général ce mois-ci.')).toBeTruthy();
      expect(screen.queryByText(/dépass|attention|!/i)).toBeNull();
      // Never an alarming colour: an overrun uses the same watch tint.
      expect(fillColor(id)).toBe(colors.budgetWatch);
    });
  });

  describe('report du reliquat', () => {
    it('is off by default and each budget flips on its own', async () => {
      await createBudget('Restaurant', 100);
      await createBudget('Loisir', 100);
      await openBudgets();

      const restaurantSwitch = screen.getByLabelText('Report du reliquat, Restaurant');
      const loisirSwitch = screen.getByLabelText('Report du reliquat, Loisir');
      expect(restaurantSwitch.props.accessibilityState.checked).toBe(false);
      expect(screen.getAllByText('Chaque mois repart du montant prévu')).toHaveLength(2);

      await press(restaurantSwitch);

      expect(screen.getByLabelText('Report du reliquat, Restaurant').props.accessibilityState.checked).toBe(true);
      expect(screen.getByLabelText('Report du reliquat, Loisir').props.accessibilityState.checked).toBe(false);
      expect(screen.getAllByText('Le reste du mois passé s’ajoute à ce budget')).toHaveLength(1);
      expect(loisirSwitch).toBeTruthy();

      const { budgets } = await app.dataService.getBudgetOverview(THIS_MONTH);
      expect(budgets.map((b) => [b.budget.categoryName, b.budget.carryOver])).toEqual([
        ['Loisir', false],
        ['Restaurant', true],
      ]);
    });

    it('adds last month’s unspent balance to this month’s ceiling once switched on', async () => {
      await createBudget('Restaurant', 100, { startMonth: LAST_MONTH });
      await spend('Restaurant', 60, lastMonthDate);
      await openBudgets();
      expect(screen.getByText(plain('0 / 100 €'))).toBeTruthy();

      await press(screen.getByLabelText('Report du reliquat, Restaurant'));

      expect(screen.getByText(plain('0 / 140 €'))).toBeTruthy();
      expect(screen.getByText(/Le reliquat (d’|de )\S+ est inclus\./)).toBeTruthy();
      expect(screen.getByTestId('budgets-planned').props.children).toBe(formatAmount(140));

      await press(screen.getByLabelText('Report du reliquat, Restaurant'));
      expect(screen.getByText(plain('0 / 100 €'))).toBeTruthy();
    });
  });

  describe('sélecteur de mois', () => {
    it('follows the month chosen in the app bar, and has no budget before one started', async () => {
      await createBudget('Restaurant', 100);
      await spend('Restaurant', 40);
      await openBudgets();
      expect(screen.getByTestId('budgets-spent').props.children).toBe(formatAmount(40));

      await press(screen.getByLabelText('Mois précédent'));
      expect(await screen.findByText(/Aucun budget pour ce mois-ci/)).toBeTruthy();

      await press(screen.getByLabelText('Mois suivant'));
      await press(screen.getByLabelText('Mois suivant'));
      expect(await screen.findByText(plain('0 / 100 €'))).toBeTruthy();
      expect(screen.getByTestId('budgets-spent').props.children).toBe(formatAmount(0));
    });
  });
});
