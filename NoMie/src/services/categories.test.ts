import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService } from './dataService';

describe('dataService — gestion des catégories (#21, #26)', () => {
  let dataService: DataService;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
  });

  afterEach(() => close());

  describe('createCategory', () => {
    it('appends a visible category at the end of the order, with derived initials', async () => {
      const before = await dataService.listCategories();
      const created = await dataService.createCategory({ name: 'Abonnements', kind: 'expense' });

      expect(created.id).toBeGreaterThan(0);
      expect(created.name).toBe('Abonnements');
      expect(created.kind).toBe('expense');
      expect(created.hidden).toBe(false);
      expect(created.color).toBeNull();
      expect(created.icon).toBe('AB');
      expect(created.order).toBe(before.length + 1);

      const categories = await dataService.listCategories();
      expect(categories).toHaveLength(before.length + 1);
      expect(categories[categories.length - 1]).toEqual(created);
    });

    it('stores the chosen color', async () => {
      const created = await dataService.createCategory({
        name: 'Abonnements',
        kind: 'expense',
        color: '#DCE7F3',
      });
      expect(created.color).toBe('#DCE7F3');
    });

    it('is unlimited: several custom categories can coexist with the 27 defaults', async () => {
      await dataService.createCategory({ name: 'Un', kind: 'expense' });
      await dataService.createCategory({ name: 'Deux', kind: 'income' });
      await dataService.createCategory({ name: 'Trois', kind: 'both' });

      const categories = await dataService.listCategories();
      expect(categories).toHaveLength(30);
    });

    it('refuses a blank name and creates nothing', async () => {
      const before = await dataService.listCategories();
      await expect(dataService.createCategory({ name: '   ', kind: 'expense' })).rejects.toThrow();
      expect(await dataService.listCategories()).toHaveLength(before.length);
    });
  });

  describe('updateCategory', () => {
    async function customCategory() {
      return dataService.createCategory({ name: 'Loisirs pro', kind: 'expense' });
    }

    it('renames a category and recomputes its initials placeholder', async () => {
      const category = await customCategory();
      await dataService.updateCategory(category.id, { name: 'Matériel pro' });

      const categories = await dataService.listCategories();
      const updated = categories.find((c) => c.id === category.id);
      expect(updated?.name).toBe('Matériel pro');
      expect(updated?.icon).toBe('MP');
    });

    it('changes the color', async () => {
      const category = await customCategory();
      await dataService.updateCategory(category.id, { color: '#F3E1E3' });

      const updated = (await dataService.listCategories()).find((c) => c.id === category.id);
      expect(updated?.color).toBe('#F3E1E3');
    });

    it('clears the color back to the placeholder tint with an explicit null', async () => {
      const category = await dataService.createCategory({
        name: 'Loisirs pro',
        kind: 'expense',
        color: '#F3E1E3',
      });
      await dataService.updateCategory(category.id, { color: null });

      const updated = (await dataService.listCategories()).find((c) => c.id === category.id);
      expect(updated?.color).toBeNull();
    });

    it('hides a category without touching its kind, icon or color', async () => {
      const category = await dataService.createCategory({
        name: 'Loisirs pro',
        kind: 'expense',
        color: '#F3E1E3',
      });
      await dataService.updateCategory(category.id, { hidden: true });

      const updated = (await dataService.listCategories()).find((c) => c.id === category.id);
      expect(updated?.hidden).toBe(true);
      expect(updated?.kind).toBe('expense');
      expect(updated?.color).toBe('#F3E1E3');
    });

    it('shows a hidden category again', async () => {
      const category = await customCategory();
      await dataService.updateCategory(category.id, { hidden: true });
      await dataService.updateCategory(category.id, { hidden: false });

      const updated = (await dataService.listCategories()).find((c) => c.id === category.id);
      expect(updated?.hidden).toBe(false);
    });

    it('leaves transactions already using a hidden category untouched', async () => {
      const account = await dataService.createAccount({ name: 'Compte courant', initialBalance: 0 });
      const category = await customCategory();
      const transaction = await dataService.createTransaction({
        accountId: account.id,
        operationDate: '2026-09-15',
        amount: -20,
        categoryId: category.id,
      });

      await dataService.updateCategory(category.id, { hidden: true });

      const stored = await dataService.getTransaction(transaction.id);
      expect(stored?.categoryId).toBe(category.id);
      const listed = await dataService.listMonthTransactions({ year: 2026, month: 8 });
      expect(listed.find((t) => t.id === transaction.id)?.categoryName).toBe('Loisirs pro');
    });

    it('refuses to blank out the name', async () => {
      const category = await customCategory();
      await expect(dataService.updateCategory(category.id, { name: '  ' })).rejects.toThrow();
    });

    it('refuses a category that does not exist', async () => {
      await expect(dataService.updateCategory(999999, { hidden: true })).rejects.toThrow();
    });
  });

  describe('reorderCategories', () => {
    it('rewrites sort_order from the given order', async () => {
      const categories = await dataService.listCategories();
      const [first, second, ...rest] = categories;
      const newOrder = [second.id, first.id, ...rest.map((c) => c.id)];

      await dataService.reorderCategories(newOrder);

      const reordered = await dataService.listCategories();
      expect(reordered.map((c) => c.id)).toEqual(newOrder);
      expect(reordered[0].order).toBe(1);
      expect(reordered[1].order).toBe(2);
    });

    it('moves a category up by swapping it with its predecessor', async () => {
      const categories = await dataService.listCategories();
      const target = categories[2];
      const predecessor = categories[1];
      const swapped = [...categories];
      [swapped[1], swapped[2]] = [swapped[2], swapped[1]];

      await dataService.reorderCategories(swapped.map((c) => c.id));

      const reordered = await dataService.listCategories();
      expect(reordered[1].id).toBe(target.id);
      expect(reordered[2].id).toBe(predecessor.id);
    });
  });
});
