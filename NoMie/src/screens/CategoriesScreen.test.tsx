import { act, screen } from '@testing-library/react-native';
import { DEFAULT_CATEGORIES } from '../data/defaultCategories';
import { press, renderApp, typeInto } from '../test-utils/renderWithApp';

async function openCategories() {
  await press(screen.getByLabelText('Réglages'));
  await screen.findByText('SÉCURITÉ');
  await press(screen.getByRole('button', { name: 'Catégories' }));
  await screen.findByTestId('categories-title');
}

describe('Écran Catégories (#21, #26)', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;

  beforeEach(async () => {
    app = await renderApp();
  });

  afterEach(() => app.teardown());

  it('lists every default category, visible ones without a "Masquée" hint', async () => {
    await openCategories();

    expect(screen.getByLabelText('Alimentation/Entretien essentiel')).toBeTruthy();
    expect(screen.getByLabelText('Restaurant')).toBeTruthy();
    expect(screen.queryByText('Masquée')).toBeNull();
  });

  it('creates a category with no limit on how many already exist', async () => {
    await openCategories();

    await press(screen.getByText('+ Ajouter une catégorie'));
    await typeInto(screen.getByLabelText('Nom de la catégorie'), 'Abonnements');
    await press(screen.getByText('Ajouter'));

    expect(await screen.findByLabelText('Abonnements')).toBeTruthy();
    const categories = await app.dataService.listCategories();
    expect(categories).toHaveLength(DEFAULT_CATEGORIES.length + 1);
    expect(categories[categories.length - 1]).toMatchObject({ name: 'Abonnements', kind: 'expense' });
  });

  it('asks for a name, in a sober message, and creates nothing without one', async () => {
    await openCategories();

    await press(screen.getByText('+ Ajouter une catégorie'));
    await press(screen.getByText('Ajouter'));

    expect(screen.getByText('Donne un nom à cette catégorie.')).toBeTruthy();
    expect(await app.dataService.listCategories()).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it('picks a color for a new category', async () => {
    await openCategories();

    await press(screen.getByText('+ Ajouter une catégorie'));
    await typeInto(screen.getByLabelText('Nom de la catégorie'), 'Abonnements');
    await press(screen.getByLabelText('Couleur #DCE7F3'));
    await press(screen.getByText('Ajouter'));

    const categories = await app.dataService.listCategories();
    expect(categories[categories.length - 1].color).toBe('#DCE7F3');
  });

  describe('actions par catégorie', () => {
    it('renames a category', async () => {
      await openCategories();

      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Renommer'));
      await typeInto(screen.getByLabelText('Nom de la catégorie'), 'Restos');
      await press(screen.getByText('Enregistrer'));

      expect(await screen.findByLabelText('Restos')).toBeTruthy();
      expect(screen.queryByLabelText('Restaurant')).toBeNull();
    });

    it('changes the color', async () => {
      await openCategories();

      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Couleur'));
      await press(screen.getByLabelText('Couleur #F3E1E3'));
      await press(screen.getByText('Enregistrer'));

      const categories = await app.dataService.listCategories();
      expect(categories.find((c) => c.name === 'Restaurant')?.color).toBe('#F3E1E3');
    });

    it('hides a category, marking it without removing it from the list', async () => {
      await openCategories();

      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Masquer'));

      expect(await screen.findByLabelText('Restaurant')).toBeTruthy();
      expect(screen.getByText('Masquée')).toBeTruthy();
      const categories = await app.dataService.listCategories();
      expect(categories.find((c) => c.name === 'Restaurant')?.hidden).toBe(true);
    });

    it('shows a hidden category again, from the same menu now offering Afficher', async () => {
      await openCategories();
      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Masquer'));
      await screen.findByText('Masquée');

      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Afficher'));

      expect(screen.queryByText('Masquée')).toBeNull();
      const categories = await app.dataService.listCategories();
      expect(categories.find((c) => c.name === 'Restaurant')?.hidden).toBe(false);
    });

    it('leaves a hidden category out of the quick-entry chips, without touching its past transactions', async () => {
      let transaction!: Awaited<ReturnType<typeof app.dataService.createTransaction>>;
      await act(async () => {
        const account = await app.dataService.createAccount({ name: 'Compte courant', initialBalance: 0 });
        transaction = await app.dataService.createTransaction({
          accountId: account.id,
          operationDate: '2026-09-10',
          amount: -10,
          categoryId: (await app.dataService.listCategories()).find((c) => c.name === 'Restaurant')!.id,
          comment: 'Vieux resto',
        });
      });
      await openCategories();
      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByLabelText('Masquer'));

      expect((await app.dataService.getTransaction(transaction.id))?.categoryId).toBe(
        transaction.categoryId
      );

      await press(screen.getByLabelText('Fermer'));
      await press(screen.getByLabelText('Nouvelle opération'));
      expect(screen.queryByLabelText('Restaurant')).toBeNull();
    });
  });

  describe('réordonner', () => {
    it('moves a category up and down with the arrow buttons', async () => {
      await openCategories();
      const before = await app.dataService.listCategories();
      const [first, second] = before;

      await press(screen.getByLabelText(`Descendre ${first.name}`));

      const afterDown = await app.dataService.listCategories();
      expect(afterDown[0].name).toBe(second.name);
      expect(afterDown[1].name).toBe(first.name);

      await press(screen.getByLabelText(`Monter ${first.name}`));

      const afterUp = await app.dataService.listCategories();
      expect(afterUp[0].name).toBe(first.name);
      expect(afterUp[1].name).toBe(second.name);
    });

    it('disables the up arrow on the first row and the down arrow on the last', async () => {
      await openCategories();
      const categories = await app.dataService.listCategories();
      const first = categories[0];
      const last = categories[categories.length - 1];

      expect(screen.getByLabelText(`Monter ${first.name}`).props.accessibilityState.disabled).toBe(true);
      expect(screen.getByLabelText(`Descendre ${last.name}`).props.accessibilityState.disabled).toBe(true);
    });
  });

  it('closes back to Réglages without navigating tabs', async () => {
    await openCategories();

    await press(screen.getByLabelText('Fermer'));

    expect(screen.queryByTestId('categories-title')).toBeNull();
    expect(screen.getByTestId('app-bar-title').props.children).toBe('Réglages');
  });
});
