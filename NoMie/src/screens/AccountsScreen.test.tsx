import { act, screen } from '@testing-library/react-native';
import type { DataService } from '../services/dataService';
import { formatAmount } from '../utils/formatAmount';
import { toIsoDate } from '../utils/dates';
import { longPress, plain, press, renderApp, settle, typeInto } from '../test-utils/renderWithApp';

const today = toIsoDate(new Date());

async function seedAccount(
  dataService: DataService,
  name: string,
  initialBalance: number
): Promise<number> {
  let id = 0;
  await act(async () => {
    id = (await dataService.createAccount({ name, initialBalance })).id;
  });
  return id;
}

async function seedTransaction(
  dataService: DataService,
  input: Parameters<DataService['createTransaction']>[0]
) {
  await act(async () => {
    await dataService.createTransaction(input);
  });
}

async function openAccounts() {
  await press(screen.getByLabelText('Comptes'));
  await screen.findByText('Solde total');
}

describe('Écran Comptes', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;

  beforeEach(async () => {
    app = await renderApp();
  });

  afterEach(() => app.teardown());

  it('invites to add a first account when there is none', async () => {
    await openAccounts();
    expect(screen.getByText('Ajoute ton premier compte pour commencer.')).toBeTruthy();
    expect(screen.getByTestId('accounts-total-real').props.children).toBe(formatAmount(0));
  });

  it('shows the total and pointed balance, and a card per account with its details', async () => {
    const courant = await seedAccount(app.dataService, 'Compte courant', 1000);
    await seedAccount(app.dataService, 'Livret A', 500);
    await seedTransaction(app.dataService, {
      accountId: courant,
      operationDate: today,
      amount: -100,
      status: 'pointe',
    });
    await seedTransaction(app.dataService, {
      accountId: courant,
      operationDate: today,
      amount: -30,
      status: 'non_pointe',
    });
    await seedTransaction(app.dataService, {
      accountId: courant,
      operationDate: today,
      amount: 2000,
      status: 'prevision',
    });
    await openAccounts();

    expect(screen.getByTestId('accounts-total-real').props.children).toBe(formatAmount(3370));
    expect(screen.getByTestId('accounts-total-pointed').props.children).toBe(
      `Pointé ${formatAmount(1400)}`
    );

    expect(screen.getAllByText('Compte courant').length).toBeGreaterThan(0);
    expect(screen.getByText('3 opérations ce mois-ci')).toBeTruthy();
    expect(screen.getByText(plain(formatAmount(2870)))).toBeTruthy(); // Réel
    expect(screen.getByText(plain(formatAmount(900)))).toBeTruthy(); // Pointé
    expect(screen.getByText(/Solde initial 1 000,00 € · créé le /)).toBeTruthy();

    expect(screen.getAllByText('Livret A').length).toBeGreaterThan(0);
    expect(screen.getByText('Aucune opération ce mois-ci')).toBeTruthy();
  });

  describe('À pointer', () => {
    it('lists Non Pointé operations; tapping one marks it Pointé, removes it and moves the balances', async () => {
      const courant = await seedAccount(app.dataService, 'Compte courant', 1000);
      await seedTransaction(app.dataService, {
        accountId: courant,
        operationDate: today,
        amount: -64.32,
        comment: 'Carrefour Market',
      });
      await openAccounts();

      expect(screen.getByText('Carrefour Market')).toBeTruthy();
      expect(screen.getByText('À faire quand ton relevé arrive, pas avant.')).toBeTruthy();
      expect(screen.getByTestId('accounts-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(1000)}`
      );

      await press(screen.getByLabelText('Carrefour Market, Non pointé'));

      expect(screen.queryByText('Carrefour Market')).toBeNull();
      expect(screen.getByText('Tout est pointé, rien à faire de ce côté.')).toBeTruthy();
      expect(screen.getByTestId('accounts-total-pointed').props.children).toBe(
        `Pointé ${formatAmount(935.68)}`
      );
      expect(screen.getByTestId('accounts-total-real').props.children).toBe(formatAmount(935.68));
    });

    it('does not list Pointé, Prévision or Flux comptable operations', async () => {
      const courant = await seedAccount(app.dataService, 'Compte courant', 0);
      for (const [status, comment] of [
        ['pointe', 'Déjà pointé'],
        ['prevision', 'Salaire prévu'],
        ['flux_comptable', 'Vers Livret'],
      ] as const) {
        await seedTransaction(app.dataService, {
          accountId: courant,
          operationDate: today,
          amount: -10,
          comment,
          status,
        });
      }
      await openAccounts();

      expect(screen.queryByText('Déjà pointé')).toBeNull();
      expect(screen.queryByText('Salaire prévu')).toBeNull();
      expect(screen.queryByText('Vers Livret')).toBeNull();
      expect(screen.getByText('Tout est pointé, rien à faire de ce côté.')).toBeTruthy();
    });

    it('filters the list by account', async () => {
      const courant = await seedAccount(app.dataService, 'Compte courant', 0);
      const livret = await seedAccount(app.dataService, 'Livret A', 0);
      await seedTransaction(app.dataService, {
        accountId: courant,
        operationDate: today,
        amount: -1,
        comment: 'Sur le courant',
      });
      await seedTransaction(app.dataService, {
        accountId: livret,
        operationDate: today,
        amount: -2,
        comment: 'Sur le livret',
      });
      await openAccounts();

      expect(screen.getByText('Sur le courant')).toBeTruthy();
      expect(screen.getByText('Sur le livret')).toBeTruthy();

      await press(screen.getByLabelText('Filtre Livret A'));
      expect(screen.queryByText('Sur le courant')).toBeNull();
      expect(screen.getByText('Sur le livret')).toBeTruthy();

      await press(screen.getByLabelText('Filtre Tous'));
      expect(screen.getByText('Sur le courant')).toBeTruthy();
    });
  });

  describe('ajouter un compte', () => {
    it('creates an account with its initial balance', async () => {
      await openAccounts();

      await press(screen.getByText('+ Ajouter un compte'));
      await typeInto(screen.getByLabelText('Nom du compte'), 'EdenRed');
      await typeInto(screen.getByLabelText('Solde initial'), '50,5');
      await press(screen.getByText('Ajouter'));

      expect(await screen.findByText('EdenRed')).toBeTruthy();
      expect(screen.getByTestId('accounts-total-real').props.children).toBe(formatAmount(50.5));
      expect(screen.queryByText('Nouveau compte')).toBeNull();
    });

    it('asks for a name, in a sober message, and creates nothing without one', async () => {
      await openAccounts();

      await press(screen.getByText('+ Ajouter un compte'));
      await press(screen.getByText('Ajouter'));

      expect(screen.getByText('Donne un nom à ce compte.')).toBeTruthy();
      expect(await app.dataService.listAccounts()).toEqual([]);
    });

    it('refuses a balance that is not a number', async () => {
      await openAccounts();

      await press(screen.getByText('+ Ajouter un compte'));
      await typeInto(screen.getByLabelText('Nom du compte'), 'Livret');
      await typeInto(screen.getByLabelText('Solde initial'), 'beaucoup');
      await press(screen.getByText('Ajouter'));

      expect(screen.getByText(/Le solde doit être un nombre/)).toBeTruthy();
      expect(await app.dataService.listAccounts()).toEqual([]);
    });
  });

  describe('actions par compte', () => {
    let accountId: number;

    beforeEach(async () => {
      accountId = await seedAccount(app.dataService, 'Compte courant', 1000);
      await openAccounts();
    });

    it('opens on a long press of the card as well as from the ⋯ button', async () => {
      await longPress(screen.getByLabelText('Compte Compte courant'));
      expect(screen.getByLabelText('Renommer')).toBeTruthy();
    });

    it('renames an account', async () => {
      await press(screen.getByLabelText('Actions du compte Compte courant'));
      await press(screen.getByLabelText('Renommer'));
      await typeInto(screen.getByLabelText('Nom du compte'), 'Compte joint');
      await press(screen.getByText('Enregistrer'));

      expect(await screen.findByText('Compte joint')).toBeTruthy();
      expect(screen.queryByText('Compte courant')).toBeNull();
    });

    it('changes the initial balance, which moves the balances', async () => {
      await press(screen.getByLabelText('Actions du compte Compte courant'));
      await press(screen.getByLabelText('Modifier le solde initial'));
      await typeInto(screen.getByLabelText('Solde initial'), '1250,5');
      await press(screen.getByText('Enregistrer'));

      await screen.findByText(/Solde initial 1 250,50 €/);
      expect(screen.getByTestId('accounts-total-real').props.children).toBe(
        formatAmount(1250.5)
      );
    });

    it('archives an account into the compact Archivés section, keeping it out of the total', async () => {
      await press(screen.getByLabelText('Actions du compte Compte courant'));
      await press(screen.getByLabelText('Archiver'));
      expect(screen.getByText(/son historique est conservé/)).toBeTruthy();
      await press(screen.getByText('Archiver le compte'));

      expect(await screen.findByText('Archivés')).toBeTruthy();
      expect(screen.getByText('Archivé · historique conservé')).toBeTruthy();
      expect(screen.getByTestId('accounts-total-real').props.children).toBe(formatAmount(0));
      expect((await app.dataService.getAccount(accountId))?.archived).toBe(true);
    });

    it('deletes an account after confirmation, and only then', async () => {
      await press(screen.getByLabelText('Actions du compte Compte courant'));
      await press(screen.getByLabelText('Supprimer'));

      // Backing out leaves everything in place.
      await press(screen.getByText('Retour'));
      expect(await app.dataService.getAccount(accountId)).not.toBeNull();

      await press(screen.getByLabelText('Supprimer'));
      await press(screen.getByText('Supprimer le compte'));

      await settle();
      expect(await app.dataService.getAccount(accountId)).toBeNull();
      expect(screen.queryByText('Compte courant')).toBeNull();
    });
  });
});
