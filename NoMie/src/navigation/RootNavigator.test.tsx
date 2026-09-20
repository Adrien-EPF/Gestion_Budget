import { screen } from '@testing-library/react-native';
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

  it('opens the quick-entry sheet from the FAB and closes it with Annuler', async () => {
    ({ teardown } = await renderApp());
    await screen.findByTestId('app-bar-title');

    await press(screen.getByLabelText('Nouvelle opération'));
    expect(await screen.findByText('Enregistrer')).toBeTruthy();

    await press(screen.getByText('Annuler'));
    expect(screen.queryByText('Enregistrer')).toBeNull();
  });
});
