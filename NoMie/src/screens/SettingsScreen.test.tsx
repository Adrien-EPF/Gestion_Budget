import { act, cleanup, screen, within } from '@testing-library/react-native';
import { createInMemoryScheduler } from '../notifications/inMemoryScheduler';
import type { SettingKey } from '../services/dataService';
import { createTestDataService } from '../test-utils/createTestDataService';
import { formatAmount } from '../utils/formatAmount';
import { plain, press, renderApp, settle, typeInto } from '../test-utils/renderWithApp';

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
      ['Rappel de pointage', 'checkReminderEnabled'],
      ['Point budget mensuel', 'monthlyBudgetReviewEnabled'],
      ['Clavier en montants arrondis', 'roundedKeypad'],
    ];

    it('start off', async () => {
      await openSettings();
      for (const label of ['Code PIN', 'Empreinte', ...switches.map(([l]) => l)]) {
        expect(isOn(label)).toBe(false);
      }
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
      await act(async () => {
        await app.securityStore.setPin('1234', [
          { question: 'firstPet', answer: 'Milo' },
          { question: 'hometown', answer: 'Nice' },
        ]);
        await app.dataService.setSetting('pinEnabled', true);
      });
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
  });

  describe('sécurité — code PIN (#23)', () => {
    const enterPin = async (...keys: string[]) => {
      for (const key of keys) await press(screen.getByLabelText(key));
    };

    const answerQuestions = async () => {
      await press(within(screen.getByTestId('question-a-options')).getByLabelText('Nom de votre premier animal'));
      await typeInto(screen.getByLabelText('Réponse à la première question'), 'Milo');
      await press(within(screen.getByTestId('question-b-options')).getByLabelText('Ville où vous avez grandi'));
      await typeInto(screen.getByLabelText('Réponse à la deuxième question'), 'Nice');
    };

    it('activating opens the PIN creation flow; the switch stays off until it completes', async () => {
      await openSettings();

      await press(screen.getByLabelText('Code PIN'));

      expect(await screen.findByText('Crée ton code PIN')).toBeTruthy();
      expect(isOn('Code PIN')).toBe(false);
    });

    it('creating a PIN, confirming it and answering two questions turns the switch on and persists everything', async () => {
      await openSettings();
      await press(screen.getByLabelText('Code PIN'));
      await screen.findByText('Crée ton code PIN');

      await enterPin('1', '2', '3', '4');
      expect(await screen.findByText('Confirme ton code PIN')).toBeTruthy();

      await enterPin('1', '2', '3', '4');
      await screen.findByText('Questions de secours');
      await answerQuestions();
      await press(screen.getByRole('button', { name: 'Valider' }));

      expect(screen.queryByText('Questions de secours')).toBeNull();
      expect(isOn('Code PIN')).toBe(true);
      expect((await app.dataService.getSettings()).pinEnabled).toBe(true);
      expect(await app.securityStore.verifyPin('1234')).toBe(true);
      expect(await app.securityStore.getSecurityQuestions()).toEqual(['firstPet', 'hometown']);
    });

    it('a mismatched confirmation shows an error and restarts entry without turning the switch on', async () => {
      await openSettings();
      await press(screen.getByLabelText('Code PIN'));
      await screen.findByText('Crée ton code PIN');
      await enterPin('1', '2', '3', '4');
      await screen.findByText('Confirme ton code PIN');

      await enterPin('9', '9', '9', '9');

      expect(await screen.findByText('Crée ton code PIN')).toBeTruthy();
      expect(screen.getByText('Les deux codes ne correspondaient pas, recommence.')).toBeTruthy();
      expect(isOn('Code PIN')).toBe(false);

      await enterPin('1', '2', '3', '4');
      await screen.findByText('Confirme ton code PIN');
      await enterPin('1', '2', '3', '4');
      await screen.findByText('Questions de secours');
      await answerQuestions();
      await press(screen.getByRole('button', { name: 'Valider' }));

      expect(isOn('Code PIN')).toBe(true);
    });

    it('cancelling at PIN creation leaves the switch off and saves nothing', async () => {
      await openSettings();
      await press(screen.getByLabelText('Code PIN'));
      await screen.findByText('Crée ton code PIN');

      await press(screen.getByRole('button', { name: 'Annuler' }));

      expect(screen.queryByText('Crée ton code PIN')).toBeNull();
      expect(isOn('Code PIN')).toBe(false);
      expect((await app.dataService.getSettings()).pinEnabled).toBe(false);
    });

    it('cancelling at the security questions step leaves the switch off and saves nothing', async () => {
      await openSettings();
      await press(screen.getByLabelText('Code PIN'));
      await screen.findByText('Crée ton code PIN');
      await enterPin('1', '2', '3', '4');
      await screen.findByText('Confirme ton code PIN');
      await enterPin('1', '2', '3', '4');
      await screen.findByText('Questions de secours');

      await press(screen.getByRole('button', { name: 'Annuler' }));

      expect(screen.queryByText('Questions de secours')).toBeNull();
      expect(isOn('Code PIN')).toBe(false);
      expect((await app.dataService.getSettings()).pinEnabled).toBe(false);
      expect(await app.securityStore.hasPin()).toBe(false);
    });

    it('disabling requires successful PIN authentication before it commits', async () => {
      await act(async () => {
        await app.securityStore.setPin('1234', [
          { question: 'firstPet', answer: 'Milo' },
          { question: 'hometown', answer: 'Nice' },
        ]);
        await app.dataService.setSetting('pinEnabled', true);
      });
      await openSettings();

      await press(screen.getByLabelText('Code PIN'));
      expect(await screen.findByText('Confirme pour désactiver le code PIN')).toBeTruthy();
      expect(isOn('Code PIN')).toBe(true);

      await enterPin('9', '9', '9', '9');
      expect(screen.getByText('Code incorrect, réessaie.')).toBeTruthy();
      expect(isOn('Code PIN')).toBe(true);
      expect((await app.dataService.getSettings()).pinEnabled).toBe(true);

      await enterPin('1', '2', '3', '4');

      expect(screen.queryByText('Confirme pour désactiver le code PIN')).toBeNull();
      expect(isOn('Code PIN')).toBe(false);
      expect((await app.dataService.getSettings()).pinEnabled).toBe(false);
    });

    it('cancelling the disable confirmation leaves the switch on', async () => {
      await act(async () => {
        await app.securityStore.setPin('1234', [
          { question: 'firstPet', answer: 'Milo' },
          { question: 'hometown', answer: 'Nice' },
        ]);
        await app.dataService.setSetting('pinEnabled', true);
      });
      await openSettings();

      await press(screen.getByLabelText('Code PIN'));
      await screen.findByText('Confirme pour désactiver le code PIN');

      await press(screen.getByRole('button', { name: 'Annuler' }));

      expect(screen.queryByText('Confirme pour désactiver le code PIN')).toBeNull();
      expect(isOn('Code PIN')).toBe(true);
      expect((await app.dataService.getSettings()).pinEnabled).toBe(true);
    });
  });

  describe('sécurité — empreinte (#23)', () => {
    const seedPin = () =>
      act(async () => {
        await app.securityStore.setPin('1234', [
          { question: 'firstPet', answer: 'Milo' },
          { question: 'hometown', answer: 'Nice' },
        ]);
        await app.dataService.setSetting('pinEnabled', true);
      });

    it('requires Code PIN to be active first, and stays off with an explicit message otherwise', async () => {
      await openSettings();

      await press(screen.getByLabelText('Empreinte'));

      expect(
        await screen.findByText('Active d’abord le code PIN : l’empreinte s’appuie dessus si elle échoue.')
      ).toBeTruthy();
      expect(isOn('Empreinte')).toBe(false);
      expect((await app.dataService.getSettings()).biometricEnabled).toBe(false);
    });

    it('activating turns the switch on when Code PIN is active and hardware and enrollment are both available', async () => {
      await seedPin();
      await openSettings();

      await press(screen.getByLabelText('Empreinte'));

      expect(isOn('Empreinte')).toBe(true);
      expect((await app.dataService.getSettings()).biometricEnabled).toBe(true);
    });

    it('shows an explicit message and stays off when the device has no biometric hardware', async () => {
      await seedPin();
      app.securityStore.setBiometricHardware(false);
      await openSettings();

      await press(screen.getByLabelText('Empreinte'));

      expect(
        await screen.findByText('Cet appareil ne dispose pas de lecteur d’empreinte ni de Face ID.')
      ).toBeTruthy();
      expect(isOn('Empreinte')).toBe(false);
      expect((await app.dataService.getSettings()).biometricEnabled).toBe(false);
    });

    it('shows an explicit message and stays off when nothing is enrolled', async () => {
      await seedPin();
      app.securityStore.setBiometricEnrolled(false);
      await openSettings();

      await press(screen.getByLabelText('Empreinte'));

      expect(
        await screen.findByText(
          'Aucune empreinte ni visage n’est enregistré sur cet appareil. Ajoute-en un dans ses réglages.'
        )
      ).toBeTruthy();
      expect(isOn('Empreinte')).toBe(false);
      expect((await app.dataService.getSettings()).biometricEnabled).toBe(false);
    });

    it('disabling requires successful authentication and succeeds automatically via biometrics when available', async () => {
      await app.dataService.setSetting('biometricEnabled', true);
      await openSettings();

      await press(screen.getByLabelText('Empreinte'));
      await settle();

      expect(isOn('Empreinte')).toBe(false);
      expect((await app.dataService.getSettings()).biometricEnabled).toBe(false);
    });

    it('falls back to the PIN when biometric authentication fails, and disables only Empreinte', async () => {
      app.securityStore.setBiometricAnswer(false);
      await seedPin();
      await app.dataService.setSetting('biometricEnabled', true);
      await openSettings();

      await press(screen.getByLabelText('Empreinte'));
      await screen.findByText('Confirme pour désactiver l’empreinte');
      for (const key of ['1', '2', '3', '4']) await press(screen.getByLabelText(key));

      expect(isOn('Empreinte')).toBe(false);
      expect(isOn('Code PIN')).toBe(true);
      expect((await app.dataService.getSettings()).biometricEnabled).toBe(false);
      expect((await app.dataService.getSettings()).pinEnabled).toBe(true);
    });
  });

  describe('notifications', () => {
    const planned = async () => (await app.scheduler.listScheduled()).map((spec) => spec.id);

    it.each([
      ['Rappel de pointage', 'check-reminder'],
      ['Point budget mensuel', 'monthly-budget-review'],
    ])('%s plans a notification when turned on and cancels it when turned off', async (label, id) => {
      await openSettings();

      await press(screen.getByLabelText(label));
      expect(await planned()).toEqual([id]);

      await press(screen.getByLabelText(label));
      expect(await planned()).toEqual([]);
    });

    it('asks for the permission on activation when it was not given', async () => {
      await app.teardown();
      const scheduler = createInMemoryScheduler({ granted: false, answer: true });
      app = await renderApp({ scheduler });
      await openSettings();

      await press(screen.getByLabelText('Rappel de pointage'));

      expect(scheduler.promptCount).toBe(1);
      expect(isOn('Rappel de pointage')).toBe(true);
      expect(await planned()).toEqual(['check-reminder']);
    });

    it('goes back to off, in the screen and in the saved state, when the permission is refused', async () => {
      await app.teardown();
      const scheduler = createInMemoryScheduler({ granted: false, answer: false });
      app = await renderApp({ scheduler });
      await openSettings();

      await press(screen.getByLabelText('Rappel de pointage'));

      expect(isOn('Rappel de pointage')).toBe(false);
      expect((await app.dataService.getSettings()).checkReminderEnabled).toBe(false);
      expect(await planned()).toEqual([]);
    });

    it('are planned again at launch when the system lost them', async () => {
      await openSettings();
      await press(screen.getByLabelText('Rappel de pointage'));
      await settle();
      cleanup();
      const scheduler = createInMemoryScheduler({ granted: true });

      await renderApp({ reopenOn: app.db, scheduler });
      await settle();

      expect((await scheduler.listScheduled()).map((spec) => spec.id)).toEqual(['check-reminder']);
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

    it.each(['Catégories', 'Avances en attente'])(
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

  describe('données', () => {
    const todayIso = () => new Date().toISOString().slice(0, 10);

    it('creates and shares a dated backup file from « Sauvegarde complète »', async () => {
      await openSettings();

      await press(screen.getByRole('button', { name: 'Sauvegarde complète' }));
      await settle();

      expect(app.fileSharer.shared).toHaveLength(1);
      const [file] = app.fileSharer.shared;
      expect(file.filename).toBe(`nomie-sauvegarde-${todayIso()}.json`);
      expect(file.mimeType).toBe('application/json');
      expect(JSON.parse(file.content)).toMatchObject({ format: 'nomie-backup', version: 1 });
      expect(screen.getByTestId('app-bar-title').props.children).toBe('Réglages');
    });

    it('bundles a dated CSV archive and shares it from « Export Excel/CSV »', async () => {
      await openSettings();

      await press(screen.getByRole('button', { name: 'Export Excel/CSV' }));
      await settle();

      expect(app.fileSharer.shared).toHaveLength(1);
      const [file] = app.fileSharer.shared;
      expect(file.filename).toBe(`nomie-export-${todayIso()}.zip`);
      expect(file.mimeType).toBe('application/zip');
      expect(file.base64).toBe(true);
      expect(screen.getByTestId('app-bar-title').props.children).toBe('Réglages');
    });

    it('does nothing when the file picker is cancelled on import', async () => {
      await openSettings();

      await press(screen.getByRole('button', { name: 'Importer une sauvegarde' }));
      await settle();

      expect(screen.queryByText('Remplacer les données de l’appareil ?')).toBeNull();
    });

    it('asks for confirmation before importing, and changes nothing if cancelled', async () => {
      const backup = await app.dataService.createBackup();
      await app.dataService.createAccount({ name: 'Compte courant', initialBalance: 100 });
      app.fileSharer.queuePick({ name: 'ma-sauvegarde.json', content: JSON.stringify(backup) });
      await openSettings();

      await press(screen.getByRole('button', { name: 'Importer une sauvegarde' }));
      expect(await screen.findByText('Remplacer les données de l’appareil ?')).toBeTruthy();
      expect(screen.getByText(/ma-sauvegarde\.json/)).toBeTruthy();

      await press(screen.getByRole('button', { name: 'Annuler' }));

      expect(screen.queryByText('Remplacer les données de l’appareil ?')).toBeNull();
      expect(await app.dataService.listAccounts()).toHaveLength(1);
    });

    it('replaces the device data and refreshes the screen after a confirmed import', async () => {
      const source = await createTestDataService();
      await source.dataService.createAccount({ name: 'Compte importé', initialBalance: 42 });
      const backup = await source.dataService.createBackup();
      await source.close();

      app.fileSharer.queuePick({ name: 'ma-sauvegarde.json', content: JSON.stringify(backup) });
      await openSettings();
      await press(screen.getByRole('button', { name: 'Importer une sauvegarde' }));
      await screen.findByText('Remplacer les données de l’appareil ?');

      await press(screen.getByRole('button', { name: 'Importer' }));
      await settle();

      expect(screen.queryByText('Remplacer les données de l’appareil ?')).toBeNull();
      const accounts = await app.dataService.listAccounts();
      expect(accounts.map((a) => a.name)).toEqual(['Compte importé']);
      expect(screen.getByText('1 actif')).toBeTruthy();
    });

    it('refuses an invalid file, changes nothing, and lets the user close the message', async () => {
      await app.dataService.createAccount({ name: 'Compte courant', initialBalance: 100 });
      app.fileSharer.queuePick({ name: 'pas-une-sauvegarde.txt', content: 'ceci n’est pas du JSON' });
      await openSettings();

      await press(screen.getByRole('button', { name: 'Importer une sauvegarde' }));
      await screen.findByText('Remplacer les données de l’appareil ?');
      await press(screen.getByRole('button', { name: 'Importer' }));

      expect(await screen.findByText('Import impossible')).toBeTruthy();
      expect(await app.dataService.listAccounts()).toHaveLength(1);

      await press(screen.getByRole('button', { name: 'Fermer le message d’erreur' }));
      expect(screen.queryByText('Import impossible')).toBeNull();
    });
  });
});
