import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Importance } from '../services/dataService';
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

  describe('calculs dans le montant', () => {
    it('records 11,9 × 2 as 23,80', async () => {
      await openSheet();
      await typeAmount('1', '1', 'Virgule', '9', 'Multiplier', '2');
      expect(screen.getByTestId('quick-entry-amount').props.children).toBe('−11,9×2');
      expect(screen.getByTestId('quick-entry-result').props.children).toBe('= 23,80');
      await press(screen.getByText('Enregistrer'));

      expect((await monthOperations())[0].amount).toBe(-23.8);
    });

    it('refuses a calculation that comes out at zero or below', async () => {
      await openSheet();
      await typeAmount('5', 'Soustraire', '8');
      expect(screen.getByLabelText('Enregistrer').props.accessibilityState.disabled).toBe(true);
      await press(screen.getByLabelText('Effacer'));
      await typeAmount('5');
      expect(screen.getByLabelText('Enregistrer').props.accessibilityState.disabled).toBe(true);
      await press(screen.getByLabelText('Effacer'));
      await typeAmount('3');
      expect(screen.getByLabelText('Enregistrer').props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('libellé et suggestions', () => {
    const seed = (comment: string, categoryName: string, importance: Importance) =>
      act(async () => {
        const categories = await app.dataService.listCategories();
        await app.dataService.createTransaction({
          accountId,
          operationDate: '2026-01-05',
          amount: -20,
          comment,
          importance,
          categoryId: categories.find((c) => c.name === categoryName)!.id,
        });
      });

    it('saves the label typed', async () => {
      await openSheet();
      await typeAmount('4');
      await act(async () => {
        fireEvent.changeText(screen.getByLabelText('Libellé'), 'Boulangerie');
      });
      await press(screen.getByText('Enregistrer'));

      expect((await monthOperations())[0].comment).toBe('Boulangerie');
    });

    it('pre-fills category and importance from a known label', async () => {
      await seed('Cinéma Gaumont', 'Culture', 'secondaire_superflu');
      await openSheet();
      await act(async () => {
        fireEvent.changeText(screen.getByLabelText('Libellé'), 'cine');
      });
      await press(await screen.findByLabelText('Cinéma Gaumont'));

      expect(screen.getByLabelText('Culture').props.accessibilityState.selected).toBe(true);
      expect(screen.getByLabelText('Secondaire superflu').props.accessibilityState.selected).toBe(true);

      await typeAmount('9');
      await press(screen.getByText('Enregistrer'));
      const [created] = await monthOperations();
      expect(created.importance).toBe('secondaire_superflu');
      expect(created.categoryName).toBe('Culture');
    });

    it('pre-selects Essentiel, then the last level of the chosen category', async () => {
      await seed('Cinéma Gaumont', 'Culture', 'exceptionnel');
      await openSheet();
      expect(screen.getByLabelText('Essentiel').props.accessibilityState.selected).toBe(false);
      await screen.findByLabelText('Exceptionnel');
      await waitFor(() =>
        expect(screen.getByLabelText('Exceptionnel').props.accessibilityState.selected).toBe(true)
      );
      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Culture'));
      await waitFor(() =>
        expect(screen.getByLabelText('Exceptionnel').props.accessibilityState.selected).toBe(true)
      );
    });

    it('has no importance for an income', async () => {
      await openSheet();
      await press(screen.getByLabelText('Basculer dépense ou recette'));
      expect(screen.queryByLabelText('Essentiel')).toBeNull();
    });
  });

  describe('Plus d’options', () => {
    it('carries amount, label, category and importance to the full screen', async () => {
      await openSheet();
      await typeAmount('1', '1', 'Virgule', '9', 'Multiplier', '2');
      await act(async () => {
        fireEvent.changeText(screen.getByLabelText('Libellé'), 'Lidl');
      });
      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Secondaire important'));
      await press(screen.getByText('Plus d’options'));

      const form = await screen.findByTestId('operation-form');
      expect(form).toBeTruthy();
      expect(screen.getByLabelText('Montant').props.value).toBe('23,8');
      expect(screen.getByLabelText('Libellé').props.value).toBe('Lidl');
      expect(screen.getByLabelText('Restaurant').props.accessibilityState.selected).toBe(true);
      expect(screen.getByLabelText('Secondaire important').props.accessibilityState.selected).toBe(true);
    });
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
