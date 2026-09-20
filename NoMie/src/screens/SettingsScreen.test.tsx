import { act, cleanup, screen } from '@testing-library/react-native';
import type { SettingKey } from '../services/dataService';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp, settle } from '../test-utils/renderWithApp';

describe('Écran Réglages', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;

  beforeEach(async () => {
    app = await renderApp();
  });

  afterEach(() => app.teardown());

  async function openSettings() {
    await press(screen.getByLabelText('Réglages'));
    await screen.findByText('SÉCURITÉ');
  }

  const isOn = (label: string) => screen.getByLabelText(label).props.accessibilityState.checked;

  it('lays out the five groups, their notes and the footer', async () => {
    await openSettings();

    for (const title of ['SÉCURITÉ', 'STRUCTURE', 'NOTIFICATIONS', 'DONNÉES', 'SAISIE']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByText('L’app se verrouille dès qu’elle passe en arrière-plan.')).toBeTruthy();
    expect(screen.getByText('Le dimanche, en fin de journée')).toBeTruthy();
    expect(screen.getByText('Un résumé factuel le 1er du mois')).toBeTruthy();
    expect(screen.getByText(/Tout reste sur ton téléphone/)).toBeTruthy();
    expect(screen.getByText('NoMie · version alpha · données stockées sur cet appareil')).toBeTruthy();
  });

  it('presents the three data actions as separate rows', async () => {
    await openSettings();

    expect(screen.getByText('Sauvegarde complète')).toBeTruthy();
    expect(screen.getByText('Fichier réimportable')).toBeTruthy();
    expect(screen.getByText('Export Excel/CSV')).toBeTruthy();
    expect(screen.getByText('Lisible hors app')).toBeTruthy();
    expect(screen.getByText('Importer une sauvegarde')).toBeTruthy();
    expect(screen.getByText('Remplace les données de l’appareil')).toBeTruthy();
  });

  describe('interrupteurs', () => {
    const switches: [string, SettingKey][] = [
      ['Code PIN', 'pinEnabled'],
      ['Empreinte', 'biometricEnabled'],
      ['Rappel de pointage', 'checkReminderEnabled'],
      ['Point budget mensuel', 'monthlyBudgetReviewEnabled'],
      ['Clavier en montants arrondis', 'roundedKeypad'],
    ];

    it('start off', async () => {
      await openSettings();
      for (const [label] of switches) expect(isOn(label)).toBe(false);
    });

    it.each(switches)('%s flips on and off, and is saved in the data service', async (label, key) => {
      await openSettings();

      await press(screen.getByLabelText(label));
      expect(isOn(label)).toBe(true);
      expect((await app.dataService.getSettings())[key]).toBe(true);

      await press(screen.getByLabelText(label));
      expect(isOn(label)).toBe(false);
      expect((await app.dataService.getSettings())[key]).toBe(false);
    });

    it('flips one at a time', async () => {
      await openSettings();
      await press(screen.getByLabelText('Code PIN'));
      expect(isOn('Code PIN')).toBe(true);
      expect(isOn('Empreinte')).toBe(false);
    });

    it('show the saved state when the screen is opened', async () => {
      await act(async () => {
        await app.dataService.setSetting('biometricEnabled', true);
        await app.dataService.setSetting('roundedKeypad', true);
      });
      await openSettings();

      expect(isOn('Empreinte')).toBe(true);
      expect(isOn('Clavier en montants arrondis')).toBe(true);
      expect(isOn('Code PIN')).toBe(false);
    });

    it('are still in their state after the app is relaunched', async () => {
      await openSettings();
      await press(screen.getByLabelText('Code PIN'));
      await press(screen.getByLabelText('Rappel de pointage'));
      await settle();
      cleanup();

      await renderApp({ reopenOn: app.db });
      await press(screen.getByLabelText('Réglages'));
      await screen.findByText('SÉCURITÉ');

      expect(isOn('Code PIN')).toBe(true);
      expect(isOn('Rappel de pointage')).toBe(true);
      expect(isOn('Empreinte')).toBe(false);
    });

    it('do nothing else: no lock, no notification, no file', async () => {
      await openSettings();
      await press(screen.getByLabelText('Code PIN'));
      // Still on the same screen, nothing asked, nothing blocked.
      expect(screen.getByTestId('app-bar-title').props.children).toBe('Réglages');
      expect(screen.getByLabelText('Nouvelle opération')).toBeTruthy();
    });
  });

  describe('structure', () => {
    it('summarises accounts, categories and pending advances', async () => {
      await act(async () => {
        const main = await app.dataService.createAccount({ name: 'Compte courant', initialBalance: 100 });
        await app.dataService.createAccount({ name: 'Livret A', initialBalance: 0 });
        const old = await app.dataService.createAccount({ name: 'Ancien', initialBalance: 0 });
        await app.dataService.archiveAccount(old.id);
        await app.dataService.createTransaction({
          accountId: main.id,
          operationDate: '2026-09-10',
          amount: -64.5,
          splits: [{ amount: -64.5, advanced: true }],
        });
      });
      await openSettings();

      expect(screen.getByText('2 actifs · 1 archivé')).toBeTruthy();
      expect(screen.getByText('27 catégories · ordre et couleurs')).toBeTruthy();
      expect(screen.getByText(plain(`1 portion · ${formatAmount(64.5)}`))).toBeTruthy();
    });

    it('says so, calmly, when there is nothing yet', async () => {
      await openSettings();
      expect(screen.getByText('Aucun compte pour le moment')).toBeTruthy();
      expect(screen.getByText('Aucune avance en attente')).toBeTruthy();
    });

    it('opens Comptes from the Comptes link', async () => {
      await openSettings();

      await press(screen.getByRole('button', { name: 'Comptes' }));

      expect(await screen.findByText('Solde total')).toBeTruthy();
      expect(screen.getByTestId('app-bar-title').props.children).toBe('Comptes');
    });

    it.each(['Catégories', 'Avances en attente', 'Sauvegarde complète', 'Export Excel/CSV', 'Importer une sauvegarde'])(
      'shows %s without a destination yet: inert, and Réglages stays open',
      async (label) => {
        await openSettings();

        const row = screen.getByRole('button', { name: label });
        expect(row.props.accessibilityState.disabled).toBe(true);
        await press(row);

        expect(screen.getByTestId('app-bar-title').props.children).toBe('Réglages');
      }
    );
  });
});
