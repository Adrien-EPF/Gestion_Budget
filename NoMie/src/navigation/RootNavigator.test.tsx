import { act, screen } from '@testing-library/react-native';
import { createInMemoryScheduler } from '../notifications/inMemoryScheduler';
import { press, renderApp } from '../test-utils/renderWithApp';

describe('RootNavigator — chrome commun', () => {
  let teardown: () => Promise<void>;

  afterEach(() => teardown());

  it('shows Accueil first, with the month selector and the FAB', async () => {
    ({ teardown } = await renderApp());
    expect((await screen.findByTestId('app-bar-title')).props.children).toBe('NoMie');
    expect(screen.getByTestId('month-label')).toBeTruthy();
    expect(screen.getByLabelText('Nouvelle opération')).toBeTruthy();
  });

  it('switches screen on tab tap and keeps the previous screen state', async () => {
    ({ teardown } = await renderApp());
    await screen.findByTestId('app-bar-title');

    await press(screen.getByLabelText('Comptes'));
    expect(await screen.findByText('Solde total')).toBeTruthy();
    expect(screen.getByTestId('app-bar-title').props.children).toBe('Comptes');

    await press(screen.getByLabelText('Accueil'));
    expect(screen.getByTestId('app-bar-title').props.children).toBe('NoMie');
  });

  it('changes the shared month when the chevrons are pressed on Accueil', async () => {
    ({ teardown } = await renderApp());
    await screen.findByTestId('app-bar-title');
    const monthBefore = screen.getByTestId('month-label').props.children;

    await press(screen.getByLabelText('Mois suivant'));

    const monthAfter = screen.getByTestId('month-label').props.children;
    expect(monthAfter).not.toBe(monthBefore);
  });

  describe('tap sur une notification', () => {
    it('opens Comptes on « À pointer » when the app is open', async () => {
      const app = await renderApp();
      teardown = app.teardown;
      await screen.findByTestId('app-bar-title');
      expect(screen.getByTestId('app-bar-title').props.children).toBe('NoMie');

      await act(async () => {
        app.scheduler.simulateTap({ screen: 'Comptes' });
      });

      expect(screen.getByTestId('app-bar-title').props.children).toBe('Comptes');
      expect(await screen.findByText('À pointer')).toBeTruthy();
    });

    it('opens Comptes from another tab', async () => {
      const app = await renderApp();
      teardown = app.teardown;
      await press(screen.getByLabelText('Réglages'));
      expect(screen.getByTestId('app-bar-title').props.children).toBe('Réglages');

      await act(async () => {
        app.scheduler.simulateTap({ screen: 'Comptes' });
      });

      expect(screen.getByTestId('app-bar-title').props.children).toBe('Comptes');
    });

    it('opens Comptes when the tap is what launched the app', async () => {
      const scheduler = createInMemoryScheduler({ granted: true });
      scheduler.simulateTap({ screen: 'Comptes' });

      const app = await renderApp({ scheduler, firstScreenText: 'Solde total' });
      teardown = app.teardown;

      expect(screen.getByTestId('app-bar-title').props.children).toBe('Comptes');
      expect(await screen.findByText('À pointer')).toBeTruthy();
    });
  });

  it('opens the quick-entry sheet from the FAB and closes it with Annuler', async () => {
    ({ teardown } = await renderApp());
    await screen.findByTestId('app-bar-title');

    await press(screen.getByLabelText('Nouvelle opération'));
    expect(await screen.findByText('Enregistrer')).toBeTruthy();

    await press(screen.getByText('Annuler'));
    expect(screen.queryByText('Enregistrer')).toBeNull();
  });
});
