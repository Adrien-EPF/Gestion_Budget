import { act, screen } from '@testing-library/react-native';
import { formatMonthLabel } from '../navigation/formatMonthLabel';
import { press, renderApp, settle, typeInto } from '../test-utils/renderWithApp';

/** `dd/mm/yyyy` of today + `days`, worked out by hand so the test never reuses the app's own clock code. */
function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date, text: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` };
}

describe('Date simulée (développement)', () => {
  let app: Awaited<ReturnType<typeof renderApp>>;

  beforeEach(async () => {
    app = await renderApp();
  });

  afterEach(async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    await app.teardown();
  });

  async function openSettings() {
    await press(screen.getByLabelText('Réglages'));
    await screen.findByText('SÉCURITÉ');
  }

  async function advance(days: number) {
    await typeInto(screen.getByLabelText('Nombre de jours'), String(days));
    await press(screen.getByText('Avancer de N jours'));
    await settle();
  }

  it('offers « Avancer de N jours », the current state and « Revenir à aujourd’hui » in Réglages', async () => {
    await openSettings();

    expect(screen.getByText('DÉVELOPPEMENT')).toBeTruthy();
    expect(screen.getByText('Avancer de N jours')).toBeTruthy();
    expect(screen.getByText('La date de l’app est la date réelle.')).toBeTruthy();
    expect(screen.getByText('Revenir à aujourd’hui')).toBeTruthy();
    expect(screen.queryByText(/Date simulée :/)).toBeNull();
  });

  it('shows a permanent banner with the simulated date, and takes it away on return to today', async () => {
    await openSettings();

    await advance(10);

    const { text } = dateInDays(10);
    expect(screen.getByText(`Date simulée : ${text}`)).toBeTruthy();
    expect(screen.getByText(`La date de l’app est simulée : ${text}.`)).toBeTruthy();

    // The banner stays on every screen.
    await press(screen.getByLabelText('Accueil'));
    expect(screen.getByText(`Date simulée : ${text}`)).toBeTruthy();

    await openSettings();
    await press(screen.getByText('Revenir à aujourd’hui'));
    await settle();

    expect(screen.queryByText(/Date simulée :/)).toBeNull();
    expect(screen.getByText('La date de l’app est la date réelle.')).toBeTruthy();
  });

  it('undoes what was created during the test when coming back to today', async () => {
    const account = await app.dataService.createAccount({ name: 'Avant', initialBalance: 0 });
    await openSettings();
    await advance(3);
    await act(async () => {
      await app.dataService.createAccount({ name: 'Pendant', initialBalance: 0 });
    });

    await press(screen.getByText('Revenir à aujourd’hui'));
    await settle();

    expect((await app.dataService.listAccounts()).map((a) => a.id)).toEqual([account.id]);
  });

  it('moves the month of Accueil along with the simulated date', async () => {
    await openSettings();

    await advance(70);
    await press(screen.getByLabelText('Accueil'));

    const { date } = dateInDays(70);
    expect(screen.getAllByText(formatMonthLabel(date.getFullYear(), date.getMonth())).length).toBeGreaterThan(0);
  });

  it('ignores a number of days that is not a positive whole number', async () => {
    await openSettings();

    await advance(0);

    expect(screen.queryByText(/Date simulée :/)).toBeNull();
  });

  it('is absent from the Réglages of a production build', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;

    await openSettings();

    expect(screen.queryByText('DÉVELOPPEMENT')).toBeNull();
    expect(screen.queryByText('Avancer de N jours')).toBeNull();
  });
});
