import { act, screen } from '@testing-library/react-native';
import { toIsoDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp } from '../test-utils/renderWithApp';

const today = toIsoDate(new Date());

async function openSheet() {
  await press(screen.getByLabelText('Nouvelle opération'));
  await screen.findByText('Enregistrer');
}

async function typeAmount(...keys: string[]) {
  for (const key of keys) await press(screen.getByLabelText(key));
}

describe('Saisie rapide (bottom sheet)', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;
  let accountId: number;

  beforeEach(async () => {
    app = await renderApp();
    await act(async () => {
      accountId = (await app.dataService.createAccount({ name: 'Compte courant', initialBalance: 500 }))
        .id;
    });
  });

  afterEach(() => app.teardown());

  const monthOperations = () => {
    const d = new Date();
    return app.dataService.listMonthTransactions({ year: d.getFullYear(), month: d.getMonth() });
  };

  it('creates a Non Pointé expense on the current account with the chosen category', async () => {
    await openSheet();
    await typeAmount('1', '2', 'Virgule', '5');
    expect(screen.getByTestId('quick-entry-amount').props.children).toBe('−12,5');
    await press(screen.getByLabelText('Restaurant'));
    await press(screen.getByText('Enregistrer'));

    const [created] = await monthOperations();
    expect(created.amount).toBe(-12.5);
    expect(created.status).toBe('non_pointe');
    expect(created.accountId).toBe(accountId);
    expect(created.operationDate).toBe(today);
    expect(created.categoryName).toBe('Restaurant');
    // The sheet is gone.
    expect(screen.queryByText('Enregistrer')).toBeNull();
  });

  it('puts the new operation at the top of Accueil’s latest operations', async () => {
    await act(async () => {
      await app.dataService.createTransaction({
        accountId,
        operationDate: today,
        amount: -1,
        comment: 'Déjà là',
      });
    });

    await openSheet();
    await typeAmount('8');
    await press(screen.getByLabelText('Restaurant'));
    await press(screen.getByText('Enregistrer'));

    const rows = screen.getAllByLabelText(/, Non pointé$/);
    expect(rows[0].props.accessibilityLabel).toBe('Restaurant, Non pointé');
    expect(rows[1].props.accessibilityLabel).toBe('Déjà là, Non pointé');
    expect(screen.getByText(plain(formatAmount(-8, { signed: true })))).toBeTruthy();
  });

  it('records an income when switched to Recette, offering income categories', async () => {
    await openSheet();
    expect(screen.getByLabelText('Restaurant')).toBeTruthy();
    expect(screen.queryByLabelText('Salaire/Intérêts/Avantages')).toBeNull();

    await press(screen.getByLabelText('Basculer dépense ou recette'));
    expect(screen.getByText('Recette')).toBeTruthy();
    expect(screen.queryByLabelText('Restaurant')).toBeNull();

    await typeAmount('2', '0', '0');
    expect(screen.getByTestId('quick-entry-amount').props.children).toBe('+200');
    await press(screen.getByLabelText('Salaire/Intérêts/Avantages'));
    await press(screen.getByText('Enregistrer'));

    const [created] = await monthOperations();
    expect(created.amount).toBe(200);
    expect(created.categoryName).toBe('Salaire/Intérêts/Avantages');
  });

  it('drops a category that no longer fits when the sign is switched', async () => {
    await openSheet();
    await press(screen.getByLabelText('Restaurant'));
    await press(screen.getByLabelText('Basculer dépense ou recette'));
    await typeAmount('5');
    await press(screen.getByText('Enregistrer'));

    const [created] = await monthOperations();
    expect(created.categoryId).toBeNull();
  });

  it('lets a category be unselected by tapping it again', async () => {
    await openSheet();
    await press(screen.getByLabelText('Restaurant'));
    await press(screen.getByLabelText('Restaurant'));
    await typeAmount('5');
    await press(screen.getByText('Enregistrer'));

    expect((await monthOperations())[0].categoryId).toBeNull();
  });

  it('erases with ← and accepts a single comma', async () => {
    await openSheet();
    await typeAmount('4', 'Virgule', 'Virgule', '2', '9', 'Effacer');
    expect(screen.getByTestId('quick-entry-amount').props.children).toBe('−4,2');
  });

  describe('cancelling', () => {
    it('creates nothing on Annuler', async () => {
      await openSheet();
      await typeAmount('9');
      await press(screen.getByText('Annuler'));

      expect(screen.queryByText('Enregistrer')).toBeNull();
      expect(await monthOperations()).toEqual([]);
    });

    it('creates nothing when the scrim is tapped', async () => {
      await openSheet();
      await typeAmount('9');
      await press(screen.getByLabelText('Fermer'));

      expect(screen.queryByText('Enregistrer')).toBeNull();
      expect(await monthOperations()).toEqual([]);
    });

    it.each([
      ['an empty amount', [] as string[]],
      ['a zero amount', ['0']],
      ['a lone comma', ['Virgule']],
    ])('closes without creating anything, or any error, for %s', async (_label, keys) => {
      await openSheet();
      await typeAmount(...keys);
      await press(screen.getByText('Enregistrer'));

      expect(screen.queryByText('Enregistrer')).toBeNull();
      expect(screen.queryByText(/erreur|invalide/i)).toBeNull();
      expect(await monthOperations()).toEqual([]);
    });

    it('starts from a blank draft the next time it opens', async () => {
      await openSheet();
      await typeAmount('7');
      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Basculer dépense ou recette'));
      await press(screen.getByText('Annuler'));

      await openSheet();
      expect(screen.getByTestId('quick-entry-amount').props.children).toBe('−0');
      expect(screen.getByText('Dépense')).toBeTruthy();
    });
  });

  it('is reachable from any screen through the global FAB', async () => {
    await press(screen.getByLabelText('Comptes'));
    await screen.findByText('Solde total');

    await openSheet();
    await typeAmount('3');
    await press(screen.getByText('Enregistrer'));

    expect((await monthOperations())[0].amount).toBe(-3);
  });

  it('asks for an account first when none exists, and disables saving', async () => {
    await act(async () => {
      await app.dataService.deleteAccount(accountId);
    });

    await openSheet();
    expect(screen.getByText(/Crée d’abord un compte/)).toBeTruthy();
    expect(screen.getByLabelText('Enregistrer').props.accessibilityState.disabled).toBe(true);
  });
});
