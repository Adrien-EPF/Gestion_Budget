import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { RootNavigator } from '../navigation/RootNavigator';
import { DataServiceProvider } from '../services/DataServiceContext';
import { createTestDataService } from './createTestDataService';

/**
 * Text queries normalise whitespace, so no-break spaces read as plain
 * ones; run an expected `formatAmount` string through this before
 * matching it with `getByText`.
 */
export const plain = (text: string) => text.replace(/[  ]/g, ' ');

type Element = ReturnType<typeof screen.getByText>;

/** Lets in-flight service reads land, so their state updates happen inside `act`. */
export async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Interaction helpers: the data service answers asynchronously, so a tap
 * is wrapped in an async `act` that also flushes the reads it triggers.
 */
export async function press(element: Element) {
  await act(async () => {
    fireEvent.press(element);
  });
}

export async function longPress(element: Element) {
  await act(async () => {
    fireEvent(element, 'longPress');
  });
}

export async function typeInto(element: Element, text: string) {
  await act(async () => {
    fireEvent.changeText(element, text);
  });
}

/**
 * Renders the whole app shell against a real in-memory data service —
 * the same seam the service tests use, so screens are never tested
 * against a mock (#3 "Décisions de test"). `teardown` unmounts before
 * closing the database so no pending read hits a closed connection.
 */
export async function renderApp() {
  const { dataService, close } = await createTestDataService();
  const utils = render(
    <DataServiceProvider dataService={dataService}>
      <RootNavigator />
    </DataServiceProvider>
  );
  // Accueil reads asynchronously; wait for its first paint so tests start from a settled screen.
  await screen.findByText('Solde réel · tous comptes');
  return {
    ...utils,
    dataService,
    teardown: async () => {
      await settle();
      cleanup();
      await close();
    },
  };
}
