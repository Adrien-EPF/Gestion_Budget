import { act, screen } from '@testing-library/react-native';
import { formatDayMonth, toIsoDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp, typeInto } from '../test-utils/renderWithApp';

const today = toIsoDate(new Date());

describe('Écran Récurrences', () => {
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

  const createRule = async (extra: Partial<Parameters<typeof app.dataService.createRecurrenceRule>[0]> = {}) => {
    let id = 0;
    await act(async () => {
      id = (
        await app.dataService.createRecurrenceRule({
          name: 'Loyer',
          accountId,
          amount: -780,
          categoryId: cat['Logement'],
          frequency: 'monthly',
          referenceDate: today,
          ...extra,
        })
      ).id;
    });
    return id;
  };

  async function openRecurrences() {
    await press(screen.getByLabelText('Récurrences'));
    await screen.findByText('+ Ajouter une règle');
  }

  const switchState = (label: string) => screen.getByLabelText(label).props.accessibilityState.checked;

  it('explains, before any rule, that nothing is created without permission', async () => {
    await openRecurrences();
    expect(screen.getByText(/Les règles ne créent une opération automatiquement que si tu l’autorises/)).toBeTruthy();
    expect(screen.getByText(/Rien de prévu pour le moment/)).toBeTruthy();
  });

  describe('ajout d’une règle', () => {
    it('creates a manual rule from a name, an amount, a category and a frequency, then shows its card', async () => {
      await openRecurrences();

      await press(screen.getByText('+ Ajouter une règle'));
      await typeInto(screen.getByLabelText('Nom de la règle'), 'Loyer');
      await typeInto(screen.getByLabelText('Montant'), '780');
      await press(screen.getByLabelText('Logement'));
      await press(screen.getByLabelText('Hebdomadaire'));
      await press(screen.getByLabelText('Ajouter'));

      const [rule] = await app.dataService.listRecurrenceRules();
      expect(rule).toMatchObject({
        name: 'Loyer',
        amount: -780,
        accountId,
        categoryId: cat['Logement'],
        frequency: 'weekly',
        referenceDate: today,
        automatic: false,
        active: true,
      });

      expect(await screen.findByText('Loyer')).toBeTruthy();
      expect(screen.getByText(plain(formatAmount(-780, { signed: true })))).toBeTruthy();
      expect(screen.getByText('Compte courant')).toBeTruthy();
      expect(screen.getByText('Logement')).toBeTruthy();
      expect(screen.getByText(/^Hebdomadaire · le /)).toBeTruthy();
      expect(screen.getByText('Création manuelle')).toBeTruthy();
      expect(screen.getByText('À valider toi-même')).toBeTruthy();
      expect(switchState('Création automatique, Loyer')).toBe(false);
      // Manual: nothing was generated.
      expect(screen.getByText(/Rien de prévu pour le moment/)).toBeTruthy();
    });

    it('creates an income when Recette is chosen', async () => {
      await openRecurrences();

      await press(screen.getByText('+ Ajouter une règle'));
      await typeInto(screen.getByLabelText('Nom de la règle'), 'Salaire');
      await press(screen.getByLabelText('Recette'));
      await typeInto(screen.getByLabelText('Montant'), '2380,50');
      await typeInto(screen.getByLabelText('Date de référence'), '30/01/2026');
      await press(screen.getByLabelText('Ajouter'));

      const [rule] = await app.dataService.listRecurrenceRules();
      expect(rule).toMatchObject({ name: 'Salaire', amount: 2380.5, referenceDate: '2026-01-30', categoryId: null });
      expect(await screen.findByText(plain(formatAmount(2380.5, { signed: true })))).toBeTruthy();
      expect(screen.getByText('Mensuelle · le 30')).toBeTruthy();
    });

    it('offers only the categories that fit the chosen direction', async () => {
      await openRecurrences();
      await press(screen.getByText('+ Ajouter une règle'));

      expect(screen.getByLabelText('Logement')).toBeTruthy();
      expect(screen.queryByLabelText('Salaire/Intérêts/Avantages')).toBeNull();
      expect(screen.queryByLabelText('Mouvement inter-compte')).toBeNull();

      await press(screen.getByLabelText('Recette'));
      expect(screen.getByLabelText('Salaire/Intérêts/Avantages')).toBeTruthy();
      expect(screen.queryByLabelText('Logement')).toBeNull();
    });

    it('says what is missing, and creates nothing, when the form is incomplete', async () => {
      await openRecurrences();

      await press(screen.getByText('+ Ajouter une règle'));
      await typeInto(screen.getByLabelText('Date de référence'), 'bientôt');
      await press(screen.getByLabelText('Ajouter'));

      expect(screen.getByText(/Donne un nom à cette règle/)).toBeTruthy();
      expect(screen.getByText(/Le montant doit être un nombre différent de zéro/)).toBeTruthy();
      expect(screen.getByText(/La date attendue ressemble à/)).toBeTruthy();
      expect(await app.dataService.listRecurrenceRules()).toEqual([]);
    });

    it('closes without creating anything on Annuler', async () => {
      await openRecurrences();
      await press(screen.getByText('+ Ajouter une règle'));
      await typeInto(screen.getByLabelText('Nom de la règle'), 'Loyer');
      await press(screen.getByLabelText('Annuler'));

      expect(screen.queryByLabelText('Nom de la règle')).toBeNull();
      expect(await app.dataService.listRecurrenceRules()).toEqual([]);
    });
  });

  describe('création automatique', () => {
    it('shows a rule as manual, with its next occurrence as a reminder to validate', async () => {
      await createRule({ referenceDate: '2026-01-05' });
      await openRecurrences();

      expect(screen.getByText('Création manuelle')).toBeTruthy();
      expect(screen.getByText('À valider toi-même')).toBeTruthy();
      expect(switchState('Création automatique, Loyer')).toBe(false);
    });

    it('turns automatic on with the switch, announces the next occurrence and lists the Prévisions', async () => {
      const id = await createRule();
      await openRecurrences();
      expect(screen.getByText(/Rien de prévu pour le moment/)).toBeTruthy();

      await press(screen.getByLabelText('Création automatique, Loyer'));

      expect((await app.dataService.listRecurrenceRules())[0].automatic).toBe(true);
      expect(switchState('Création automatique, Loyer')).toBe(true);
      expect(screen.getByText('Création automatique')).toBeTruthy();
      expect(screen.getByText(`Prochaine : ${formatDayMonth(today)}`)).toBeTruthy();

      const occurrences = await app.dataService.listUpcomingOccurrences();
      expect(occurrences.length).toBeGreaterThan(0);
      expect(occurrences.every((o) => o.recurrenceRuleId === id && o.status === 'prevision')).toBe(true);
      expect(screen.getAllByLabelText('Loyer, Prévision')).toHaveLength(occurrences.length);
      expect(screen.queryByText(/Rien de prévu pour le moment/)).toBeNull();
    });

    it('turns back to manual without removing what was generated', async () => {
      await createRule({ automatic: true });
      await openRecurrences();
      const count = screen.getAllByLabelText('Loyer, Prévision').length;

      await press(screen.getByLabelText('Création automatique, Loyer'));

      expect((await app.dataService.listRecurrenceRules())[0].automatic).toBe(false);
      expect(screen.getByText('Création manuelle')).toBeTruthy();
      expect(screen.getAllByLabelText('Loyer, Prévision')).toHaveLength(count);
    });

    it('switches each rule on its own', async () => {
      await createRule({ name: 'Loyer' });
      await createRule({ name: 'Assurance auto', amount: -42.9 });
      await openRecurrences();

      await press(screen.getByLabelText('Création automatique, Loyer'));

      expect(switchState('Création automatique, Loyer')).toBe(true);
      expect(switchState('Création automatique, Assurance auto')).toBe(false);
    });
  });

  describe('prochaines occurrences', () => {
    it('edits one occurrence without touching its rule', async () => {
      await createRule({ automatic: true });
      await openRecurrences();

      await press(screen.getAllByLabelText('Loyer, Prévision')[0]);
      await typeInto(screen.getByLabelText('Montant de l’occurrence'), '-812,5');
      await press(screen.getByLabelText('Enregistrer'));

      const [edited, sibling] = await app.dataService.listUpcomingOccurrences();
      expect(edited.amount).toBe(-812.5);
      expect(sibling.amount).toBe(-780);
      expect((await app.dataService.listRecurrenceRules())[0].amount).toBe(-780);
      expect(await screen.findByText(plain(formatAmount(-812.5, { signed: true })))).toBeTruthy();
    });

    it('rejects an unreadable amount or date and keeps the occurrence as it was', async () => {
      await createRule({ automatic: true });
      await openRecurrences();

      await press(screen.getAllByLabelText('Loyer, Prévision')[0]);
      await typeInto(screen.getByLabelText('Montant de l’occurrence'), 'abc');
      await typeInto(screen.getByLabelText('Date de l’occurrence'), '32/13/2026');
      await press(screen.getByLabelText('Enregistrer'));

      expect(screen.getByText(/Le montant doit être un nombre/)).toBeTruthy();
      expect(screen.getByText(/La date attendue ressemble à/)).toBeTruthy();
      expect((await app.dataService.listUpcomingOccurrences())[0].amount).toBe(-780);
    });

    it('deletes one occurrence after confirmation, leaving the rule and the others', async () => {
      const id = await createRule({ automatic: true });
      await openRecurrences();
      const before = await app.dataService.listUpcomingOccurrences();

      await press(screen.getAllByLabelText('Loyer, Prévision')[0]);
      await press(screen.getByLabelText('Supprimer'));
      expect(screen.getByText(/Seule cette occurrence disparaît/)).toBeTruthy();
      expect((await app.dataService.listUpcomingOccurrences()).length).toBe(before.length);
      await press(screen.getByLabelText('Supprimer l’occurrence'));

      const after = await app.dataService.listUpcomingOccurrences();
      expect(after.map((o) => o.id)).toEqual(before.slice(1).map((o) => o.id));
      expect((await app.dataService.listRecurrenceRules())[0]).toMatchObject({ id, automatic: true });
      expect(switchState('Création automatique, Loyer')).toBe(true);
    });

    it('lets the user back out of a deletion', async () => {
      await createRule({ automatic: true });
      await openRecurrences();
      const before = await app.dataService.listUpcomingOccurrences();

      await press(screen.getAllByLabelText('Loyer, Prévision')[0]);
      await press(screen.getByLabelText('Supprimer'));
      await press(screen.getByLabelText('Retour'));

      expect(screen.getByLabelText('Montant de l’occurrence')).toBeTruthy();
      expect((await app.dataService.listUpcomingOccurrences()).length).toBe(before.length);
    });
  });
});
