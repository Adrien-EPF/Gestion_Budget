import { act, screen, within } from '@testing-library/react-native';
import { monthName } from '../navigation/formatMonthLabel';
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

  describe('deux sections : trésorerie et comptable', () => {
    const monthsAgo = (count: number) => toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth() - count, 1));
    const previousMonthName = monthName((new Date().getMonth() + 11) % 12).toLowerCase();

    it('opens on the trésorerie, then the comptable, then the budgets and the operations', async () => {
      await add({ operationDate: today, amount: -5, comment: 'Café' });

      const titles = screen.getAllByRole('header').map((h) => h.props.children);
      expect(titles.filter((t) => t === 'Trésorerie' || t === 'Comptable')).toEqual(['Trésorerie', 'Comptable']);
    });

    it('gives the balance at the end of the previous month, per account and in total', async () => {
      await add({ operationDate: monthsAgo(1), amount: -100, status: 'pointe' });
      await add({ operationDate: today, amount: -30 });

      expect(screen.getByTestId('home-total-previous').props.children).toBe(
        `Fin ${previousMonthName} ${formatAmount(900)}`
      );
      // On the account card as well.
      expect(screen.getAllByText(plain(`Fin ${previousMonthName} ${formatAmount(900)}`))).toHaveLength(2);
    });

    it('shows the épargne versée only once an account is a savings account', async () => {
      let livretId = 0;
      await seed(app.dataService, async (s) => {
        livretId = (await s.createAccount({ name: 'Livret A', initialBalance: 0 })).id;
      });
      expect(screen.queryByText('Épargne versée')).toBeNull();

      await seed(app.dataService, async (s) => {
        await s.setAccountSavings(livretId, true);
        const virement = (await s.listCategories()).find((c) => c.name === 'Mouvement inter-compte')!;
        await s.createTransaction({
          accountId,
          operationDate: today,
          amount: -200,
          categoryId: virement.id,
          transferToAccountId: livretId,
        });
      });

      expect(screen.getByText('Épargne versée')).toBeTruthy();
      expect(screen.getByTestId('home-savings').props.children).toBe(formatAmount(200, { signed: true }));
    });

    it('compares the month so far with the previous months, without a verdict, and details it on tap', async () => {
      await add({ operationDate: monthsAgo(1), amount: -90, status: 'pointe' });
      await add({ operationDate: today, amount: -40, status: 'pointe' });

      const sentence = screen.getByTestId('home-comparison-summary').props.children as string;
      expect(plain(sentence)).toMatch(/^40 € au \d+, contre 90 € en moyenne à cette date \(sur 1 mois\)$/);
      expect(screen.queryByTestId('home-comparison-detail')).toBeNull();

      await press(screen.getByRole('button', { name: 'Détail de la comparaison' }));

      const detail = within(screen.getByTestId('home-comparison-detail'));
      expect(detail.getByText('Par importance')).toBeTruthy();
      expect(detail.getByText('Essentiel')).toBeTruthy();
      expect(detail.getByText('Par catégorie')).toBeTruthy();
      expect(detail.getByText('Sans catégorie')).toBeTruthy();
    });

    it('hides the comparison without a previous month of history', async () => {
      await add({ operationDate: today, amount: -40, status: 'pointe' });
      expect(screen.queryByTestId('home-comparison')).toBeNull();
    });

    it('totals what stays outside the bilan in its own block', async () => {
      expect(screen.queryByTestId('home-off-balance')).toBeNull();

      await add({ operationDate: today, amount: -15, offBalance: true, status: 'pointe' });
      await add({ operationDate: today, amount: -5 });

      const block = within(await screen.findByTestId('home-off-balance'));
      expect(block.getByLabelText(`Autres opérations hors bilan, ${formatAmount(15)}`)).toBeTruthy();
      expect(block.queryByText('Avances versées')).toBeNull();
      expect(screen.getByTestId('home-month-expenses').props.children).toBe(formatAmount(5));
    });
  });

  it('shows the real balance, the pointed balance and one card per account', async () => {
    await add({ operationDate: today, amount: -100, status: 'pointe', comment: 'Essence' });
    await add({ operationDate: today, amount: -30, status: 'non_pointe', comment: 'Café' });
    await add({ operationDate: today, amount: 2000, status: 'prevision', comment: 'Salaire' });
    await add({ operationDate: today, amount: -200, status: 'fantome', comment: 'Vers livret' });

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

  it('summarises the month with its Fantôme and without Prévision', async () => {
    await add({ operationDate: today, amount: -64.32, comment: 'Carrefour' });
    await add({ operationDate: today, amount: -28.5, status: 'pointe', comment: 'Resto' });
    await add({ operationDate: today, amount: 100, status: 'pointe', comment: 'Remboursement' });
    await add({ operationDate: today, amount: -200, status: 'fantome', comment: 'Vers livret' });
    await add({ operationDate: today, amount: 2380, status: 'prevision', comment: 'Salaire' });

    expect(screen.getByText('Ce mois-ci')).toBeTruthy();
    expect(screen.getByTestId('home-month-expenses').props.children).toBe(formatAmount(292.82));
    expect(screen.getByTestId('home-month-income').props.children).toBe(formatAmount(100));
  });

  it('shows where the month’s bilan expenses go, per importance, calmly', async () => {
    expect(screen.queryByTestId('home-importance')).toBeNull();

    await add({ operationDate: today, amount: -60, importance: 'essentiel' });
    await add({ operationDate: today, amount: -20, importance: 'secondaire_superflu', status: 'fantome' });
    await add({ operationDate: today, amount: -500, importance: 'exceptionnel', offBalance: true });

    const card = await screen.findByTestId('home-importance');
    expect(within(card).getByLabelText(`Essentiel, ${formatAmount(60)}`)).toBeTruthy();
    expect(within(card).getByLabelText(`Secondaire superflu, ${formatAmount(20)}`)).toBeTruthy();
    expect(within(card).getByLabelText(`Exceptionnel, ${formatAmount(0)}`)).toBeTruthy();
    expect(within(card).getByText('75 %')).toBeTruthy();
    expect(screen.queryByText(/!/)).toBeNull();
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

      await press(screen.getByLabelText('Pointer Essence'));
      expect(screen.getByLabelText('Essence, Pointé')).toBeTruthy();
      expect(screen.getByTestId('home-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(900)}`
      );
      expect(screen.getByText('Tout est pointé')).toBeTruthy();

      await press(screen.getByLabelText('Dépointer Essence'));
      expect(screen.getByLabelText('Essence, Non pointé')).toBeTruthy();
      expect(screen.getByTestId('home-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(1000)}`
      );
    });

    it('leaves Prévision and Fantôme untouched when tapped', async () => {
      await add({ operationDate: today, amount: 2380, status: 'prevision', comment: 'Salaire' });
      await add({ operationDate: today, amount: -200, status: 'fantome', comment: 'Vers livret' });

      await press(screen.getByLabelText('Salaire, Prévision'));
      await press(screen.getByLabelText('Vers livret, Fantôme'));

      expect(screen.getByLabelText('Salaire, Prévision')).toBeTruthy();
      expect(screen.getByLabelText('Vers livret, Fantôme')).toBeTruthy();
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

  describe('avances', () => {
    const addAdvance = async (amount: number, comment = 'Le Comptoir') => {
      const categories = await app.dataService.listCategories();
      const id = (name: string) => categories.find((c) => c.name === name)!.id;
      await add({
        operationDate: today,
        amount: -amount * 2,
        comment,
        categoryId: id('Restaurant'),
        splits: [
          { categoryId: id('Restaurant'), amount: -amount },
          { categoryId: id('Avancé'), amount: -amount },
        ],
      });
    };

    it('shows nothing about advances when none is pending', async () => {
      await add({ operationDate: today, amount: -5, comment: 'Café' });
      expect(screen.queryByText('Avances')).toBeNull();
    });

    it('summarises what waits to be paid back: title, badge, advances and total', async () => {
      await addAdvance(14.25, 'Le Comptoir');
      await addAdvance(50, 'Week-end');

      expect(screen.getByText('Avances')).toBeTruthy();
      expect(screen.getByText('2 avances en attente de remboursement')).toBeTruthy();
      expect(screen.getByTestId('home-advances-total').props.children).toBe(formatAmount(64.25));
      expect(screen.getByText('Avancé')).toBeTruthy(); // the badge
    });

    it('speaks of a single advance in the singular', async () => {
      await addAdvance(10);
      expect(screen.getByText('1 avance en attente de remboursement')).toBeTruthy();
    });

    it('marks a transaction row with the advanced amount, and only that one', async () => {
      await addAdvance(14.25, 'Le Comptoir');
      await add({ operationDate: today, amount: -5, comment: 'Café' });

      expect(screen.getAllByText(plain(`Avancé ${formatAmount(14.25)}`))).toHaveLength(1);
      const row = screen.getByTestId('transaction-row-Le Comptoir');
      expect(within(row).getByText(plain(`Avancé ${formatAmount(14.25)}`))).toBeTruthy();
      expect(within(screen.getByTestId('transaction-row-Café')).queryByText(/Avancé/)).toBeNull();
    });

    it('does not change how the row is pointed: the whole transaction is toggled', async () => {
      await addAdvance(14.25, 'Le Comptoir');
      await press(screen.getByLabelText('Pointer Le Comptoir'));
      expect(screen.getByLabelText('Le Comptoir, Pointé')).toBeTruthy();
      expect(screen.getByTestId('home-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(1000 - 28.5)}`
      );
    });

    it('shows a split transaction’s total in the real balance, not just a portion', async () => {
      await addAdvance(14.25);
      expect(screen.getByTestId('home-total-real').props.children).toBe(formatAmount(971.5));
    });
  });

  describe('inter-account movement', () => {
    it('lists both legs, one on each account, and keeps the total balance', async () => {
      let livret = 0;
      await seed(app.dataService, async (s) => {
        livret = (await s.createAccount({ name: 'Livret A', initialBalance: 500 })).id;
      });
      const categories = await app.dataService.listCategories();
      await add({
        operationDate: today,
        amount: -200,
        comment: 'Vers Livret A',
        categoryId: categories.find((c) => c.name === 'Mouvement inter-compte')!.id,
        transferToAccountId: livret,
      });

      expect(screen.getAllByLabelText('Vers Livret A, Non pointé')).toHaveLength(2);
      expect(screen.getByText(plain(formatAmount(-200, { signed: true })))).toBeTruthy();
      expect(screen.getByText(plain(formatAmount(200, { signed: true })))).toBeTruthy();
      expect(screen.getByTestId('home-total-real').props.children).toBe(formatAmount(1500));
    });
  });

  describe('budgets', () => {
    const categoryIdOf = async (name: string) =>
      (await app.dataService.listCategories()).find((c) => c.name === name)!.id;
    const budget = (name: string, amount: number) =>
      seed(app.dataService, async (s) => {
        await s.createBudget({ categoryId: await categoryIdOf(name), amount });
      });

    it('has no Budgets section until a budget exists', async () => {
      expect(screen.queryByText('Tout voir')).toBeNull();
    });

    it('previews at most three budgets, with a link to the Budgets screen', async () => {
      await budget('Restaurant', 100);
      await budget('Loisir', 100);
      await budget('Voiture', 100);
      await budget('Culture', 100);

      expect(screen.getByText('Tout voir')).toBeTruthy();
      expect(screen.getAllByLabelText(/^Report du reliquat, /)).toHaveLength(3);
      // Budgets come in category order (Voiture, Loisir, Restaurant, Culture): the fourth is left out.
      expect(screen.queryByLabelText('Report du reliquat, Culture')).toBeNull();
    });

    it('shows each budget’s consumption and follows what is spent', async () => {
      await budget('Restaurant', 120);
      await add({
        operationDate: today,
        amount: -30,
        comment: 'Déj',
        categoryId: await categoryIdOf('Restaurant'),
      });

      expect(screen.getByText(plain('30 / 120 €'))).toBeTruthy();
      expect(screen.getByText(plain(`Il reste ${formatAmount(90)} pour ce mois-ci.`))).toBeTruthy();
    });

    it('flips a budget’s carry-over from Accueil too', async () => {
      await budget('Restaurant', 120);
      await press(screen.getByLabelText('Report du reliquat, Restaurant'));
      expect(screen.getByText('Le reste du mois passé s’ajoute à ce budget')).toBeTruthy();
    });

    it('goes to the Budgets screen on « Tout voir »', async () => {
      await budget('Restaurant', 100);
      await press(screen.getByText('Tout voir'));
      expect(screen.getByTestId('app-bar-title').props.children).toBe('Budgets');
      expect(await screen.findByText('+ Ajouter un budget')).toBeTruthy();
    });
  });
});
