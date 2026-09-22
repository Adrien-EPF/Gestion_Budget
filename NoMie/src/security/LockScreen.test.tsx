import { cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';
import { press, settle } from '../test-utils/renderWithApp';
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

    expect(authenticate).not.toHaveBeenCalled();
  });
});
