import { cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';
import { press, settle, typeInto } from '../test-utils/renderWithApp';
import { createInMemorySecurityStore, type InMemorySecurityStore } from './inMemorySecurityStore';
import { LockScreen } from './LockScreen';

async function typePin(...keys: string[]) {
  for (const key of keys) await press(screen.getByLabelText(key));
}

describe('LockScreen', () => {
  let store: InMemorySecurityStore;
  let onUnlock: jest.Mock;

  beforeEach(async () => {
    store = createInMemorySecurityStore();
    await store.setPin('1234', [
      { question: 'firstPet', answer: 'Milo' },
      { question: 'hometown', answer: 'Nice' },
    ]);
    onUnlock = jest.fn();
  });

  afterEach(() => cleanup());

  it('unlocks on the correct PIN', async () => {
    render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);

    await typePin('1', '2', '3', '4');

    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('shows a generic error on a wrong PIN, never which digit is wrong, and allows retrying without limit', async () => {
    render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);

    await typePin('9', '9', '9', '9');

    expect(onUnlock).not.toHaveBeenCalled();
    expect(screen.getByText('Code incorrect, réessaie.')).toBeTruthy();

    await typePin('1', '2', '3', '4');

    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('erases with the backspace key', async () => {
    render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);

    await typePin('1', '2', '3', 'Effacer', '3', '4');

    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('attempts biometrics automatically and unlocks on success', async () => {
    store.setBiometricAnswer(true);

    render(<LockScreen biometricEnabled securityStore={store} onUnlock={onUnlock} />);
    await settle();

    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('falls back clearly to the PIN pad when biometrics fail', async () => {
    store.setBiometricAnswer(false);

    render(<LockScreen biometricEnabled securityStore={store} onUnlock={onUnlock} />);
    await settle();

    expect(onUnlock).not.toHaveBeenCalled();

    await typePin('1', '2', '3', '4');

    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('never attempts biometrics when disabled', async () => {
    const authenticate = jest.spyOn(store, 'authenticateWithBiometrics');

    render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);
    await settle();

    expect(authenticate).not.toHaveBeenCalled();
  });

  describe('« Code oublié ? » (#24)', () => {
    it('does not appear when no PIN is configured', async () => {
      const emptyStore = createInMemorySecurityStore();
      render(<LockScreen biometricEnabled={false} securityStore={emptyStore} onUnlock={onUnlock} />);
      await settle();

      expect(screen.queryByText('Code oublié ?')).toBeNull();
    });

    it('appears once a PIN is configured', async () => {
      render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);
      await settle();

      expect(await screen.findByText('Code oublié ?')).toBeTruthy();
    });

    it('never appears on the Réglages re-authentication gate, even with a PIN configured', async () => {
      render(
        <LockScreen
          biometricEnabled={false}
          securityStore={store}
          onUnlock={onUnlock}
          onCancel={() => {}}
        />
      );
      await settle();

      expect(screen.queryByText('Code oublié ?')).toBeNull();
    });

    it('correct answers (any case, extra whitespace) let a new PIN unlock the app without touching the questions', async () => {
      render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);
      await settle();

      await press(await screen.findByText('Code oublié ?'));
      await typeInto(screen.getByLabelText('Nom de votre premier animal'), '  MILO ');
      await typeInto(screen.getByLabelText('Ville où vous avez grandi'), 'nice');
      await press(screen.getByRole('button', { name: 'Valider' }));

      expect(await screen.findByText('Nouveau code PIN')).toBeTruthy();

      await typePin('5', '6', '7', '8');
      expect(await screen.findByText('Confirme ton code PIN')).toBeTruthy();
      await typePin('5', '6', '7', '8');

      expect(onUnlock).toHaveBeenCalledTimes(1);
      expect(await store.verifyPin('1234')).toBe(false);
      expect(await store.verifyPin('5678')).toBe(true);
      expect(await store.getSecurityQuestions()).toEqual(['firstPet', 'hometown']);
    });

    it('a wrong answer shows a factual message and changes nothing', async () => {
      render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);
      await settle();

      await press(await screen.findByText('Code oublié ?'));
      await typeInto(screen.getByLabelText('Nom de votre premier animal'), 'Rex');
      await typeInto(screen.getByLabelText('Ville où vous avez grandi'), 'Nice');
      await press(screen.getByRole('button', { name: 'Valider' }));

      expect(await screen.findByText('Une des réponses est incorrecte, réessaie.')).toBeTruthy();
      expect(onUnlock).not.toHaveBeenCalled();
      expect(await store.verifyPin('1234')).toBe(true);
      expect(await store.getSecurityQuestions()).toEqual(['firstPet', 'hometown']);
    });

    it('cancelling leaves the PIN and questions untouched', async () => {
      render(<LockScreen biometricEnabled={false} securityStore={store} onUnlock={onUnlock} />);
      await settle();

      await press(await screen.findByText('Code oublié ?'));
      await press(screen.getByRole('button', { name: 'Annuler' }));

      expect(screen.queryByText('Code oublié ?')).toBeTruthy();
      expect(onUnlock).not.toHaveBeenCalled();
      expect(await store.verifyPin('1234')).toBe(true);
    });
  });
});
