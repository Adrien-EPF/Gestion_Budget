import { act, screen } from '@testing-library/react-native';
import type { DataService } from '../services/dataService';
import { toIsoDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp } from '../test-utils/renderWithApp';

const today = toIsoDate(new Date());

async function seed(dataService: DataService, fn: (s: DataService) => Promise<unknown>) {
  await act(async () => {
    await fn(dataService);
  });
}

describe('Écran Accueil', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;
  let accountId: number;

  beforeEach(async () => {
    app = await renderApp();
    await seed(app.dataService, async (s) => {
      accountId = (await s.createAccount({ name: 'Compte courant', initialBalance: 1000 })).id;
    });
  });

  afterEach(() => app.teardown());

  const add = (input: Omit<Parameters<DataService['createTransaction']>[0], 'accountId'>) =>
    seed(app.dataService, (s) => s.createTransaction({ accountId, ...input }));

  it('shows the real balance, the pointed balance and one card per account', async () => {
    await add({ operationDate: today, amount: -100, status: 'pointe', comment: 'Essence' });
    await add({ operationDate: today, amount: -30, status: 'non_pointe', comment: 'Café' });
    await add({ operationDate: today, amount: 2000, status: 'prevision', comment: 'Salaire' });
    await add({ operationDate: today, amount: -200, status: 'flux_comptable', comment: 'Vers livret' });

    expect(screen.getByTestId('home-total-real').props.children).toBe(formatAmount(2870));
    expect(screen.getByTestId('home-total-pointed').props.children).toBe(
      `Pointé ${formatAmount(900)}`
    );
    // Account carousel: name, real balance, pointed balance.
    expect(screen.getByText('Compte courant')).toBeTruthy();
    // Once in the hero, once on the only account's card.
    expect(screen.getAllByText(plain(formatAmount(2870)))).toHaveLength(2);
    expect(screen.getAllByText(plain(`Pointé ${formatAmount(900)}`))).toHaveLength(2);
  });

  it('counts what is left to point, and goes to Comptes when the badge is tapped', async () => {
    await add({ operationDate: today, amount: -1, comment: 'Un' });
    await add({ operationDate: today, amount: -2, comment: 'Deux' });

    await press(screen.getByLabelText('2 à pointer'));

    expect(screen.getByTestId('app-bar-title').props.children).toBe('Comptes');
    expect(await screen.findByText('Solde total')).toBeTruthy();
  });

  it('says « Tout est pointé » when nothing is left to point', async () => {
    await add({ operationDate: today, amount: -1, status: 'pointe' });

    expect(screen.getByText('Tout est pointé')).toBeTruthy();
    expect(screen.queryByLabelText(/à pointer$/)).toBeNull();
  });

  it('summarises the month without Flux comptable and without Prévision', async () => {
    await add({ operationDate: today, amount: -64.32, comment: 'Carrefour' });
    await add({ operationDate: today, amount: -28.5, status: 'pointe', comment: 'Resto' });
    await add({ operationDate: today, amount: 100, status: 'pointe', comment: 'Remboursement' });
    await add({ operationDate: today, amount: -200, status: 'flux_comptable', comment: 'Vers livret' });
    await add({ operationDate: today, amount: 2380, status: 'prevision', comment: 'Salaire' });

    expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    expect(screen.getByTestId('home-month-expenses').props.children).toBe(formatAmount(92.82));
    expect(screen.getByTestId('home-month-income').props.children).toBe(formatAmount(100));
  });

  it('explains, factually, that a Prévision is already counted in the real balance', async () => {
    await add({ operationDate: today, amount: 2380, status: 'prevision', comment: 'Salaire' });

    expect(screen.getByText(/« Salaire », le \d+\) est déjà comptée dans le solde réel, en Prévision\./)).toBeTruthy();
  });

  it('shows no forecast note when there is no Prévision this month', async () => {
    await add({ operationDate: today, amount: -5 });
    expect(screen.queryByText(/en Prévision/)).toBeNull();
  });

  describe('dernières opérations', () => {
    it('lists the month operations with status, date, category and signed amount', async () => {
      const [category] = await app.dataService.listCategories();
      await add({
        operationDate: today,
        amount: -64.32,
        comment: 'Carrefour Market',
        categoryId: category.id,
      });
      await add({ operationDate: today, amount: 2380, status: 'prevision', comment: 'Salaire' });

      expect(screen.getByText('Carrefour Market')).toBeTruthy();
      expect(screen.getByText('Non pointé')).toBeTruthy();
      expect(screen.getByText(plain(formatAmount(-64.32, { signed: true })))).toBeTruthy();
      expect(screen.getByText(plain(formatAmount(2380, { signed: true })))).toBeTruthy();
      expect(screen.getByText('Prévision')).toBeTruthy();
      expect(screen.getByText(new RegExp(`· ${category.name}$`))).toBeTruthy();
    });

    it('puts the newest operation first', async () => {
      await add({ operationDate: '2000-01-01', amount: -1, comment: 'hors du mois' });
      await add({ operationDate: today, amount: -2, comment: 'première' });
      await add({ operationDate: today, amount: -3, comment: 'seconde' });

      const labels = screen
        .getAllByLabelText(/, Non pointé$/)
        .map((row) => row.props.accessibilityLabel);
      expect(labels).toEqual(['seconde, Non pointé', 'première, Non pointé']);
    });

    it('toggles Non Pointé ⇄ Pointé on tap and recomputes the balances immediately', async () => {
      await add({ operationDate: today, amount: -100, comment: 'Essence' });
      expect(screen.getByTestId('home-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(1000)}`
      );

      await press(screen.getByLabelText('Essence, Non pointé'));
      expect(screen.getByLabelText('Essence, Pointé')).toBeTruthy();
      expect(screen.getByTestId('home-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(900)}`
      );
      expect(screen.getByText('Tout est pointé')).toBeTruthy();

      await press(screen.getByLabelText('Essence, Pointé'));
      expect(screen.getByLabelText('Essence, Non pointé')).toBeTruthy();
      expect(screen.getByTestId('home-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(1000)}`
      );
    });

    it('leaves Prévision and Flux comptable untouched when tapped', async () => {
      await add({ operationDate: today, amount: 2380, status: 'prevision', comment: 'Salaire' });
      await add({ operationDate: today, amount: -200, status: 'flux_comptable', comment: 'Vers livret' });

      await press(screen.getByLabelText('Salaire, Prévision'));
      await press(screen.getByLabelText('Vers livret, Flux comptable'));

      expect(screen.getByLabelText('Salaire, Prévision')).toBeTruthy();
      expect(screen.getByLabelText('Vers livret, Flux comptable')).toBeTruthy();
    });

    it('shows a calm note when the month has no operation', async () => {
      expect(screen.getByText('Aucune opération ce mois-ci.')).toBeTruthy();
    });
  });

  describe('sélecteur de mois', () => {
    it('shows another month’s operations and totals, and returns to the current ones', async () => {
      const now = new Date();
      const nextMonth = toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 15));
      await add({ operationDate: today, amount: -10, comment: 'Ce mois' });
      await add({ operationDate: nextMonth, amount: -25, comment: 'Le mois prochain' });

      expect(screen.getByText('Ce mois')).toBeTruthy();
      expect(screen.queryByText('Le mois prochain')).toBeNull();
      expect(screen.getByTestId('home-month-expenses').props.children).toBe(formatAmount(10));

      await press(screen.getByLabelText('Mois suivant'));
      expect(await screen.findByText('Le mois prochain')).toBeTruthy();
      expect(screen.queryByText('Ce mois')).toBeNull();
      expect(screen.getByTestId('home-month-expenses').props.children).toBe(formatAmount(25));
      // Balances are running totals: they do not depend on the month shown.
      expect(screen.getByTestId('home-total-real').props.children).toBe(formatAmount(965));

      await press(screen.getByLabelText('Mois précédent'));
      expect(await screen.findByText('Ce mois')).toBeTruthy();
    });
  });
});
