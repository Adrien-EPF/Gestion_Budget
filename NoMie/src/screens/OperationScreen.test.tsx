import { act, screen, within } from '@testing-library/react-native';
import type { DataService } from '../services/dataService';
import { formatNumericDate, toIsoDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import { press, renderApp, typeInto } from '../test-utils/renderWithApp';

const today = toIsoDate(new Date());
const month = { year: new Date().getFullYear(), month: new Date().getMonth() };

async function seed<T>(dataService: DataService, fn: (s: DataService) => Promise<T>): Promise<T> {
  let result!: T;
  await act(async () => {
    result = await fn(dataService);
  });
  return result;
}

describe('Écran Opération', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;
  let courant: number;
  let livret: number;

  beforeEach(async () => {
    app = await renderApp();
    await seed(app.dataService, async (s) => {
      courant = (await s.createAccount({ name: 'Courant', initialBalance: 1000 })).id;
      livret = (await s.createAccount({ name: 'Livret A', initialBalance: 0 })).id;
    });
  });

  afterEach(() => app.teardown());

  const screenScope = () => within(screen.getByTestId('operation-screen'));
  const operations = () => app.dataService.listMonthTransactions(month);
  const category = async (name: string) =>
    (await app.dataService.listCategories()).find((c) => c.name === name)!;
  const add = (input: Omit<Parameters<DataService['createTransaction']>[0], 'accountId'>) =>
    seed(app.dataService, (s) => s.createTransaction({ accountId: courant, ...input }));

  describe('depuis une liste', () => {
    it('opens on a tap on the row, and a tap on the pill toggles pointage without opening it', async () => {
      await add({ operationDate: today, amount: -30, comment: 'Café' });

      await press(screen.getByLabelText('Pointer Café'));
      expect(screen.queryByTestId('operation-screen')).toBeNull();
      expect(screen.getByLabelText('Café, Pointé')).toBeTruthy();
      await press(screen.getByLabelText('Dépointer Café'));
      expect(screen.getByLabelText('Café, Non pointé')).toBeTruthy();

      await press(screen.getByLabelText('Café, Non pointé'));
      expect(screen.getByTestId('operation-title').props.children).toBe('Opération');
      expect(screenScope().getByLabelText('Libellé').props.value).toBe('Café');
      expect(screenScope().getByLabelText('Montant').props.value).toBe('30');
      expect(screenScope().getByLabelText('Date d’opération').props.value).toBe(
        formatNumericDate(today)
      );
    });

    it('saves what was edited and the list follows', async () => {
      await add({ operationDate: today, amount: -30, comment: 'Café' });
      await press(screen.getByLabelText('Café, Non pointé'));

      await typeInto(screenScope().getByLabelText('Libellé'), 'Café du coin');
      await typeInto(screenScope().getByLabelText('Montant'), '4,5');
      await press(screenScope().getByLabelText('Pointé'));
      await press(screenScope().getByText('Enregistrer'));

      expect(screen.queryByTestId('operation-screen')).toBeNull();
      const [edited] = await operations();
      expect(edited).toMatchObject({ comment: 'Café du coin', amount: -4.5, status: 'pointe' });
      expect(screen.getByLabelText('Café du coin, Pointé')).toBeTruthy();
    });

    it('deletes only after a confirmation', async () => {
      await add({ operationDate: today, amount: -30, comment: 'Café' });
      await press(screen.getByLabelText('Café, Non pointé'));

      await press(screenScope().getByText('Supprimer'));
      expect(await operations()).toHaveLength(1);
      await press(screenScope().getByText('Annuler'));
      expect(await operations()).toHaveLength(1);

      await press(screenScope().getByText('Supprimer'));
      await press(screenScope().getByText('Confirmer la suppression'));
      expect(await operations()).toHaveLength(0);
      expect(screen.queryByTestId('operation-screen')).toBeNull();
    });

    it('edits and deletes both sides of a movement between accounts', async () => {
      const virement = await category('Mouvement inter-compte');
      await seed(app.dataService, (s) =>
        s.createTransaction({
          accountId: courant,
          operationDate: today,
          amount: -200,
          comment: 'Épargne',
          categoryId: virement.id,
          transferToAccountId: livret,
        })
      );
      await press(screen.getAllByLabelText('Épargne, Non pointé')[0]);
      expect(screenScope().getByText(/agissent sur les deux écritures/)).toBeTruthy();
      expect(screenScope().queryByTestId('split-section')).toBeNull();

      await typeInto(screenScope().getByLabelText('Montant'), '250');
      await press(screenScope().getByText('Enregistrer'));
      expect((await operations()).map((o) => o.amount).sort((a, b) => a - b)).toEqual([-250, 250]);

      await press(screen.getAllByLabelText('Épargne, Non pointé')[0]);
      await press(screenScope().getByText('Supprimer'));
      await press(screenScope().getByText('Confirmer la suppression'));
      expect(await operations()).toHaveLength(0);
    });
  });

  describe('création', () => {
    const openFromQuickEntry = async () => {
      await press(screen.getAllByLabelText('Nouvelle opération')[0]);
      await press(screen.getByLabelText('7'));
      await press(screen.getByLabelText('Restaurant'));
      await press(screen.getByText('Plus d’options'));
    };

    it('carries the quick entry over, prefills the bank date and creates the operation', async () => {
      await openFromQuickEntry();

      expect(screenScope().getByLabelText('Montant').props.value).toBe('7');
      expect(screenScope().getByLabelText('Date banque').props.value).toBe(formatNumericDate(today));
      await typeInto(screenScope().getByLabelText('Libellé'), 'Déjeuner');
      await press(screenScope().getByLabelText('Livret A'));
      await press(screenScope().getByText('Enregistrer'));

      const [created] = await operations();
      expect(created).toMatchObject({
        comment: 'Déjeuner',
        amount: -7,
        accountId: livret,
        categoryName: 'Restaurant',
        operationDate: today,
        bankDate: today,
        status: 'non_pointe',
      });
    });

    it('cannot be saved without an amount or with a date that does not exist', async () => {
      await press(screen.getAllByLabelText('Nouvelle opération')[0]);
      await press(screen.getByText('Plus d’options'));

      expect(screenScope().getByLabelText('Enregistrer')).toBeDisabled();
      await typeInto(screenScope().getByLabelText('Montant'), '12');
      expect(screenScope().getByLabelText('Enregistrer')).toBeEnabled();
      await typeInto(screenScope().getByLabelText('Date d’opération'), '31/02/2026');
      expect(screenScope().getByLabelText('Enregistrer')).toBeDisabled();
    });
  });

  describe('répartition', () => {
    const openNew = async (amount: string) => {
      await press(screen.getAllByLabelText('Nouvelle opération')[0]);
      await press(screen.getByText('Plus d’options'));
      await typeInto(screenScope().getByLabelText('Montant'), amount);
    };

    it('only saves once the portions add up, showing what is left in real time', async () => {
      await openNew('100');
      await press(screenScope().getByLabelText('Répartir'));
      const part = (n: number) => within(screen.getByTestId(`part-${n}`));
      await press(part(1).getByLabelText('Restaurant'));
      await press(part(2).getByLabelText('Loisir'));

      await typeInto(part(1).getByLabelText('Part 1 (€)'), '30');
      expect(screen.getByTestId('split-remaining').props.children).toBe(
        `Reste à répartir : ${formatAmount(70)}`
      );
      expect(screenScope().getByLabelText('Enregistrer')).toBeDisabled();

      await typeInto(part(2).getByLabelText('Part 2 (€)'), '60');
      expect(screenScope().getByLabelText('Enregistrer')).toBeDisabled();

      await typeInto(part(2).getByLabelText('Part 2 (€)'), '70');
      expect(screen.getByTestId('split-remaining').props.children).toBe('Reste à répartir : 0');
      await press(screenScope().getByText('Enregistrer'));

      const created = (await app.dataService.getTransaction((await operations())[0].id))!;
      expect(created.splits.map((s) => s.amount)).toEqual([-30, -70]);
    });

    it('splits in percentages', async () => {
      await openNew('200');
      await press(screenScope().getByLabelText('Répartir'));
      await press(screenScope().getByLabelText('En pourcentage'));
      const part = (n: number) => within(screen.getByTestId(`part-${n}`));
      await press(part(1).getByLabelText('Restaurant'));
      await press(part(2).getByLabelText('Loisir'));
      await typeInto(part(1).getByLabelText('Part 1 (%)'), '25');
      await typeInto(part(2).getByLabelText('Part 2 (%)'), '75');
      await press(screenScope().getByText('Enregistrer'));

      const created = (await app.dataService.getTransaction((await operations())[0].id))!;
      expect(created.splits.map((s) => s.amount)).toEqual([-50, -150]);
    });

    it('« Partager à N » fills my share and an Avancé rest settled elsewhere, then stays editable', async () => {
      await openNew('100');
      await press(screenScope().getByLabelText('Restaurant'));
      await press(screenScope().getByLabelText('Plus de parts'));
      expect(screen.getByTestId('share-count').props.children).toBe('3');
      await press(screenScope().getByText('Partager'));

      const part = (n: number) => within(screen.getByTestId(`part-${n}`));
      expect(part(1).getByLabelText('Part 1 (€)').props.value).toBe('33,33');
      expect(part(2).getByLabelText('Part 2 (€)').props.value).toBe('66,67');
      expect(screen.getByTestId('split-remaining').props.children).toBe('Reste à répartir : 0');

      await typeInto(part(1).getByLabelText('Part 1 (€)'), '40');
      expect(screenScope().getByLabelText('Enregistrer')).toBeDisabled();
      await typeInto(part(1).getByLabelText('Part 1 (€)'), '33,33');
      await press(screenScope().getByText('Enregistrer'));

      const created = (await app.dataService.getTransaction((await operations())[0].id))!;
      expect(created.splits).toEqual([
        expect.objectContaining({ amount: -33.33, advanced: false }),
        expect.objectContaining({ amount: -66.67, advanced: true, advanceType: 'reglee_ailleurs' }),
      ]);
      expect(created.categoryId).toBe((await category('Restaurant')).id);
    });

    it('reopens an already split operation with its portions', async () => {
      const [restaurant, loisirs] = [await category('Restaurant'), await category('Loisir')];
      await add({
        operationDate: today,
        amount: -100,
        comment: 'Soirée',
        splits: [
          { categoryId: restaurant.id, amount: -40 },
          { categoryId: loisirs.id, amount: -60 },
        ],
      });
      await press(screen.getByLabelText('Soirée, Non pointé'));

      expect(screen.getByTestId('part-1')).toBeTruthy();
      expect(within(screen.getByTestId('part-2')).getByLabelText('Part 2 (€)').props.value).toBe('60');
      await press(screenScope().getByLabelText('Répartir'));
      await press(screenScope().getByLabelText('Restaurant'));
      await press(screenScope().getByText('Enregistrer'));
      const [edited] = await operations();
      expect((await app.dataService.getTransaction(edited.id))!.splits).toEqual([]);
    });
  });
  describe('avances et Hors bilan (#45)', () => {
    const openNew = async (amount: string) => {
      await press(screen.getAllByLabelText('Nouvelle opération')[0]);
      await press(screen.getByText('Plus d’options'));
      await typeInto(screenScope().getByLabelText('Montant'), amount);
    };

    it('leaves Hors bilan free on an ordinary operation, and saves it', async () => {
      await openNew('60');
      await press(screenScope().getByLabelText('Restaurant'));
      expect(screenScope().getByLabelText('Hors bilan')).toBeEnabled();
      expect(screenScope().getByLabelText('Hors bilan')).not.toBeChecked();

      await press(screenScope().getByLabelText('Hors bilan'));
      await press(screenScope().getByText('Enregistrer'));

      const [created] = await operations();
      expect(created).toMatchObject({ offBalance: true, importance: null });
    });

    it('checks and locks Hors bilan on Avancé, asking whether it is settled elsewhere or waiting', async () => {
      await openNew('64');
      await press(screenScope().getByLabelText('Avancé'));

      expect(screenScope().getByLabelText('Hors bilan')).toBeChecked();
      expect(screenScope().getByLabelText('Hors bilan')).toBeDisabled();
      expect(screenScope().getByLabelText('Réglée ailleurs')).toBeTruthy();

      await press(screenScope().getByLabelText('En attente'));
      await typeInto(screenScope().getByLabelText('Libellé'), 'Billet de train');
      await press(screenScope().getByText('Enregistrer'));

      const [created] = await operations();
      expect(created).toMatchObject({ offBalance: true, advanceType: 'en_attente', amount: -64 });
      expect(await app.dataService.getPendingAdvances()).toEqual({ count: 1, total: 64 });
    });

    it('checks and locks Hors bilan on a movement between accounts', async () => {
      await openNew('200');
      await press(screenScope().getByLabelText('Mouvement inter-compte'));

      expect(screenScope().getByLabelText('Hors bilan')).toBeChecked();
      expect(screenScope().getByLabelText('Hors bilan')).toBeDisabled();
    });

    it('does not turn an operation split with an Avancé first portion into an advance when edited', async () => {
      const [restaurant, avance] = [await category('Restaurant'), await category('Avancé')];
      await add({
        operationDate: today,
        amount: -50,
        comment: 'Resto à plusieurs',
        splits: [
          { categoryId: avance.id, amount: -30, advanceType: 'reglee_ailleurs' },
          { categoryId: restaurant.id, amount: -20 },
        ],
      });
      await press(screen.getByLabelText('Resto à plusieurs, Non pointé'));
      expect(screenScope().getByLabelText('Hors bilan')).not.toBeChecked();
      await press(screenScope().getByText('Enregistrer'));

      const [edited] = await operations();
      expect(edited.offBalance).toBe(false);
      expect(edited.advanceType).toBeNull();
    });
  });

  describe('fantôme et contrepartie (#46)', () => {
    const openNewFantome = async (amount: string) => {
      await press(screen.getAllByLabelText('Nouvelle opération')[0]);
      await press(screen.getByText('Plus d’options'));
      await typeInto(screenScope().getByLabelText('Montant'), amount);
      await press(screenScope().getByLabelText('Fantôme'));
    };

    it('explains tickets resto and expenses paid by someone else', async () => {
      await openNewFantome('10');

      expect(screenScope().getByText(/Tickets resto/)).toBeTruthy();
      expect(screenScope().getByText(/payée par quelqu’un d’autre/)).toBeTruthy();
    });

    it('offers the counterpart by default on Impôts and creates the linked pair', async () => {
      await openNewFantome('250');
      await press(screenScope().getByLabelText('Impôts'));
      expect(screenScope().getByLabelText('Ajouter la contrepartie')).toBeChecked();
      expect(screenScope().getByLabelText('Hors bilan')).toBeDisabled();
      expect(screenScope().getByLabelText('Hors bilan')).not.toBeChecked();

      await press(screenScope().getByText('Enregistrer'));

      const pair = await operations();
      expect(pair).toHaveLength(2);
      const expense = pair.find((o) => o.amount < 0)!;
      const income = pair.find((o) => o.amount > 0)!;
      expect(expense).toMatchObject({ amount: -250, status: 'fantome', categoryName: 'Impôts' });
      expect(income).toMatchObject({
        amount: 250,
        status: 'fantome',
        categoryName: 'Salaire/Intérêts/Avantages',
        counterpartTransactionId: expense.id,
      });
    });

    it('is off by default outside Impôts, and stays optional', async () => {
      await openNewFantome('40');
      await press(screenScope().getByLabelText('Cadeaux'));
      expect(screenScope().getByLabelText('Ajouter la contrepartie')).not.toBeChecked();

      await press(screenScope().getByText('Enregistrer'));
      expect(await operations()).toHaveLength(1);
    });

    it('lets the user turn the counterpart off on Impôts', async () => {
      await openNewFantome('250');
      await press(screenScope().getByLabelText('Impôts'));
      await press(screenScope().getByLabelText('Ajouter la contrepartie'));
      await press(screenScope().getByText('Enregistrer'));
      expect(await operations()).toHaveLength(1);
    });

    it('shows the linked counterpart when editing, keeps both in step and deletes both after confirmation', async () => {
      const impots = await category('Impôts');
      const tax = await add({
        operationDate: today,
        amount: -250,
        comment: 'Impôt à la source',
        categoryId: impots.id,
        status: 'fantome',
        counterpart: {},
      });
      expect(tax.counterpartTransactionId).not.toBeNull();

      await press(screen.getAllByLabelText('Impôt à la source, Fantôme')[0]);
      expect(screenScope().getByText(/Contrepartie liée/)).toBeTruthy();
      await typeInto(screenScope().getByLabelText('Montant'), '300');
      await press(screenScope().getByText('Enregistrer'));
      expect((await operations()).map((o) => o.amount).sort((a, b) => a - b)).toEqual([-300, 300]);

      await press(screen.getAllByLabelText('Impôt à la source, Fantôme')[0]);
      await press(screenScope().getByText('Supprimer'));
      expect(screenScope().getByText(/contrepartie sera supprimée aussi/)).toBeTruthy();
      expect(await operations()).toHaveLength(2);
      await press(screenScope().getByText('Confirmer la suppression'));
      expect(await operations()).toHaveLength(0);
    });

    it('never offers a Fantôme for pointage', async () => {
      await add({ operationDate: today, amount: -40, comment: 'Offert', status: 'fantome' });

      expect(screen.getByLabelText('Offert, Fantôme')).toBeTruthy();
      expect(screen.queryByLabelText('Pointer Offert')).toBeNull();
      expect(await app.dataService.listTransactionsToPoint()).toEqual([]);
    });
  });
});
