import { createTestDataService } from '../test-utils/createTestDataService';
import type { DataService, Importance } from './dataService';

describe('dataService — libellés suggérés et importance par défaut', () => {
  let dataService: DataService;
  let close: () => Promise<void>;
  let accountId: number;
  let alimentation: number;
  let loisir: number;

  beforeEach(async () => {
    ({ dataService, close } = await createTestDataService());
    accountId = (await dataService.createAccount({ name: 'Compte courant', initialBalance: 0 })).id;
    const categories = await dataService.listCategories();
    const byName = (name: string) => categories.find((c) => c.name === name)!.id;
    alimentation = byName('Alimentation/Entretien essentiel');
    loisir = byName('Loisir');
  });

  afterEach(() => close());

  const spend = (
    comment: string,
    date: string,
    categoryId: number | null,
    importance?: Importance,
    amount = -10
  ) =>
    dataService.createTransaction({
      accountId,
      operationDate: date,
      amount,
      comment,
      categoryId,
      importance,
    });

  const labels = async (query: string, expense = true) =>
    (await dataService.listLabelSuggestions({ query, expense })).map((s) => s.label);

  describe('listLabelSuggestions', () => {
    it('proposes the labels already used that start like what is typed, accents and case aside', async () => {
      await spend('Épicerie du coin', '2026-09-01', alimentation);
      await spend('Lidl', '2026-09-02', alimentation);

      expect(await labels('epi')).toEqual(['Épicerie du coin']);
    });

    it('puts the most frequent first, then the most recent', async () => {
      await spend('Lidl', '2026-09-01', alimentation);
      await spend('Lidl', '2026-09-02', alimentation);
      await spend('Leclerc', '2026-09-20', alimentation);
      await spend('Lacoste', '2026-09-10', alimentation);

      expect(await labels('l')).toEqual(['Lidl', 'Leclerc', 'Lacoste']);
    });

    it('counts « LIDL » and « lidl. » as one label, shown as last typed', async () => {
      await spend('LIDL', '2026-09-01', alimentation);
      await spend('lidl.', '2026-09-02', alimentation);

      expect(await labels('lid')).toEqual(['lidl.']);
    });

    it('carries the category and importance of the last operation with that label', async () => {
      await spend('Lidl', '2026-09-01', alimentation, 'essentiel');
      await spend('Lidl', '2026-09-15', loisir, 'secondaire_superflu');

      const [lidl] = await dataService.listLabelSuggestions({ query: 'lidl', expense: true });
      expect(lidl.categoryId).toBe(loisir);
      expect(lidl.importance).toBe('secondaire_superflu');
    });

    it('keeps expenses and incomes apart, and ignores empty labels', async () => {
      await spend('Lidl', '2026-09-01', alimentation);
      await spend('Lidl remboursement', '2026-09-02', null, undefined, 5);
      await spend('', '2026-09-03', alimentation);

      expect(await labels('lidl')).toEqual(['Lidl']);
      expect(await labels('lidl', false)).toEqual(['Lidl remboursement']);
      expect(await labels('')).toHaveLength(1);
    });

    it('offers nothing for a label never used, and at most five', async () => {
      for (let i = 0; i < 7; i++) await spend(`Boutique ${i}`, '2026-09-01', alimentation);

      expect(await labels('zzz')).toEqual([]);
      expect(await labels('bou')).toHaveLength(5);
    });
  });

  describe('getDefaultImportance', () => {
    it('is the last level used for the category', async () => {
      await spend('a', '2026-09-01', loisir, 'secondaire_important');
      await spend('b', '2026-09-05', loisir, 'secondaire_superflu');
      await spend('c', '2026-09-09', alimentation, 'exceptionnel');

      expect(await dataService.getDefaultImportance(loisir)).toBe('secondaire_superflu');
    });

    it('falls back to the last level used anywhere, then to Essentiel', async () => {
      expect(await dataService.getDefaultImportance(loisir)).toBe('essentiel');

      await spend('c', '2026-09-09', alimentation, 'exceptionnel');
      expect(await dataService.getDefaultImportance(loisir)).toBe('exceptionnel');
      expect(await dataService.getDefaultImportance(null)).toBe('exceptionnel');
    });
  });
});
