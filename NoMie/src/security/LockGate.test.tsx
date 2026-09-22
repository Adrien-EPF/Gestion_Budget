import { act, cleanup, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AppState, Text } from 'react-native';
import { DataServiceProvider } from '../services/DataServiceContext';
import { createTestDataService } from '../test-utils/createTestDataService';
import { press, settle } from '../test-utils/renderWithApp';
import { createInMemorySecurityStore, type InMemorySecurityStore } from './inMemorySecurityStore';
import { LockGate } from './LockGate';
import { SecurityStoreProvider } from './SecurityStoreContext';

/** The AppState `change` listener most recently registered — RN's own AppState is auto-mocked under jest, so a transition is simulated by invoking it directly. */
function latestBackgroundListener() {
  const calls = (AppState.addEventListener as jest.Mock).mock.calls;
  const match = [...calls].reverse().find(([type]) => type === 'change');
  if (!match) throw new Error('No AppState "change" listener registered');
  return match[1] as (state: string) => void;
}

describe('LockGate', () => {
  let service: Awaited<ReturnType<typeof createTestDataService>>;
  let securityStore: InMemorySecurityStore;

  beforeEach(async () => {
    service = await createTestDataService();
    securityStore = createInMemorySecurityStore();
    await securityStore.setPin('1234', [
      { question: 'firstPet', answer: 'Milo' },
      { question: 'hometown', answer: 'Nice' },
    ]);
  });

  afterEach(async () => {
    cleanup();
    await service.close();
  });

  function renderGate() {
    return render(
      <DataServiceProvider dataService={service.dataService}>
        <SecurityStoreProvider securityStore={securityStore}>
          <LockGate>
            <Text testID="app-content">Contenu</Text>
          </LockGate>
        </SecurityStoreProvider>
      </DataServiceProvider>
    );
  }

  const enterPin = async (...keys: string[]) => {
    for (const key of keys) await press(screen.getByLabelText(key));
  };

  it('never shows a lock screen when neither switch is on', async () => {
    renderGate();
    await settle();

    expect(screen.queryByText('NoMie est verrouillé')).toBeNull();
    expect(screen.getByTestId('app-content')).toBeTruthy();
  });

  it('shows the lock screen when Code PIN is enabled, without unmounting the content underneath', async () => {
    await service.dataService.setSetting('pinEnabled', true);

    renderGate();
    await settle();

    expect(screen.getByText('NoMie est verrouillé')).toBeTruthy();
    // The navigation tree stays mounted underneath (#19 user story 11).
    expect(screen.getByTestId('app-content')).toBeTruthy();
  });

  it('unlocks with the correct PIN and re-locks when the app returns from the background', async () => {
    await service.dataService.setSetting('pinEnabled', true);
    renderGate();
    await settle();

    await enterPin('1', '2', '3', '4');
    expect(screen.queryByText('NoMie est verrouillé')).toBeNull();

    await act(async () => {
      latestBackgroundListener()('background');
    });

    expect(screen.getByText('NoMie est verrouillé')).toBeTruthy();
  });

  it('does not re-lock on background when neither switch is on', async () => {
    renderGate();
    await settle();

    await act(async () => {
      latestBackgroundListener()('background');
    });

    expect(screen.queryByText('NoMie est verrouillé')).toBeNull();
  });
});
