import { act, screen } from '@testing-library/react-native';
import type { DataService } from '../services/dataService';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp } from '../test-utils/renderWithApp';

async function openAdvances() {
  await press(screen.getByLabelText('Réglages'));
  await screen.findByText('SÉCURITÉ');
  await press(screen.getByRole('button', { name: 'Avances en attente' }));
  await screen.findByTestId('advances-title');
}

async function seedAdvance(
  dataService: DataService,
  accountName: string,
  amount: number,
  operationDate: string
) {
  return act(async () => {
    const account = await dataService.createAccount({ name: accountName, initialBalance: 0 });
    const categories = await dataService.listCategories();
    return dataService.createTransaction({
      accountId: account.id,
      operationDate,
      amount: -amount,
      comment: 'Le Comptoir',
      splits: [
        { categoryId: categories.find((c) => c.name === 'Restaurant')!.id, amount: -amount / 2 },
        {
          categoryId: categories.find((c) => c.name === 'Avancé')!.id,
          amount: -amount / 2,
          advanced: true,
        },
      ],
    });
  });
}

describe('Écran Avances en attente (#21, #27)', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;

  beforeEach(async () => {
    app = await renderApp();
  });

  afterEach(() => app.teardown());

  it('says calmly there is nothing pending', async () => {
    await openAdvances();
    expect(screen.getByText('Aucune avance en attente.')).toBeTruthy();
  });

  it('lists each pending portion with its account, category, amount and date', async () => {
    await seedAdvance(app.dataService, 'EdenRed', 28.5, '2026-09-11');
    await openAdvances();

    expect(screen.getByText('EdenRed · 11 sept. 2026')).toBeTruthy();
    expect(screen.getByText('Avancé')).toBeTruthy();
    expect(screen.getByText(plain(formatAmount(14.25)))).toBeTruthy();
  });

  it('marking a portion reimbursed removes it from the list, Accueil and the pending total', async () => {
    await seedAdvance(app.dataService, 'EdenRed', 28.5, '2026-09-11');
    await openAdvances();

    await press(screen.getByText('Marquer comme remboursée'));

    expect(screen.getByText('Aucune avance en attente.')).toBeTruthy();
    expect(await app.dataService.getPendingAdvances()).toEqual({ count: 0, total: 0 });

    await press(screen.getByLabelText('Fermer'));
    await press(screen.getByLabelText('Accueil'));
    expect(screen.queryByTestId('home-advances-total')).toBeNull();
  });

  it('only removes the portion that was reimbursed, keeping the others pending', async () => {
    await seedAdvance(app.dataService, 'EdenRed', 20, '2026-09-11');
    await seedAdvance(app.dataService, 'Compte courant', 40, '2026-09-12');
    await openAdvances();

    await press(screen.getAllByText('Marquer comme remboursée')[0]);

    expect(screen.getAllByText('Marquer comme remboursée')).toHaveLength(1);
    expect((await app.dataService.getPendingAdvances()).count).toBe(1);
  });

  it('closes back to Réglages', async () => {
    await openAdvances();

    await press(screen.getByLabelText('Fermer'));

    expect(screen.queryByTestId('advances-title')).toBeNull();
    expect(screen.getByTestId('app-bar-title').props.children).toBe('Réglages');
  });
});
