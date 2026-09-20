import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { RootNavigator } from './RootNavigator';

describe('RootNavigator — chrome commun', () => {
  it('shows Accueil first, with the month selector and the FAB', () => {
    render(<RootNavigator />);
    expect(screen.getByTestId('app-bar-title').props.children).toBe('NoMie');
    expect(screen.getByTestId('month-label')).toBeTruthy();
    expect(screen.getByLabelText('Nouvelle opération')).toBeTruthy();
  });

  it('switches screen on tab tap and keeps the previous screen state', () => {
    render(<RootNavigator />);

    fireEvent.press(screen.getByLabelText('Comptes'));
    expect(screen.getByTestId('app-bar-title').props.children).toBe('Comptes');
    expect(screen.queryByText(/L'accueil arrive/)).toBeNull();

    fireEvent.press(screen.getByLabelText('Accueil'));
    expect(screen.getByTestId('app-bar-title').props.children).toBe('NoMie');
  });

  it('changes the shared month when the chevrons are pressed on Accueil', () => {
    render(<RootNavigator />);
    const monthBefore = screen.getByTestId('month-label').props.children;

    fireEvent.press(screen.getByLabelText('Mois suivant'));

    const monthAfter = screen.getByTestId('month-label').props.children;
    expect(monthAfter).not.toBe(monthBefore);
  });

  it('opens the quick-entry stub sheet from the FAB', () => {
    render(<RootNavigator />);

    fireEvent.press(screen.getByLabelText('Nouvelle opération'));
    expect(screen.getByText('Nouvelle opération')).toBeTruthy();

    fireEvent.press(screen.getByText('Fermer'));
    expect(screen.queryByText('La saisie rapide arrive dans une prochaine étape.')).toBeNull();
  });
});
