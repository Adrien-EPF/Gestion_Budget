import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import type { SqlDatabase } from '../db/types';
import { createInMemoryFileSharer, type InMemoryFileSharer } from '../files/inMemoryFileSharer';
import { FileSharerProvider } from '../files/FileSharerContext';
import { RootNavigator } from '../navigation/RootNavigator';
import { createInMemoryScheduler, type InMemoryScheduler } from '../notifications/inMemoryScheduler';
import { NotificationSchedulerProvider } from '../notifications/NotificationSchedulerContext';
import { DataServiceProvider } from '../services/DataServiceContext';
import { createDataService } from '../services/dataService';
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
 *
 * The OS is replaced by an in-memory scheduler, permission already granted
 * unless a test passes its own. Pass `reopenOn` to start the app again on a database a previous render
 * left behind — what a relaunch of the real app does. Its owner closes it.
 */
export async function renderApp(
  options: {
    reopenOn?: SqlDatabase;
    scheduler?: InMemoryScheduler;
    fileSharer?: InMemoryFileSharer;
    /** Text that shows the first screen has painted; Accueil's unless the app opens elsewhere. */
    firstScreenText?: string;
  } = {}
) {
  let db: SqlDatabase;
  let dataService;
  let close: () => Promise<void>;
  const scheduler = options.scheduler ?? createInMemoryScheduler({ granted: true });
  const fileSharer = options.fileSharer ?? createInMemoryFileSharer();
  if (options.reopenOn) {
    db = options.reopenOn;
    dataService = createDataService(db);
    await dataService.initialize();
    close = async () => {};
  } else {
    ({ dataService, db, close } = await createTestDataService());
  }
  const utils = render(
    <DataServiceProvider dataService={dataService}>
      <NotificationSchedulerProvider scheduler={scheduler}>
        <FileSharerProvider fileSharer={fileSharer}>
          <RootNavigator />
        </FileSharerProvider>
      </NotificationSchedulerProvider>
    </DataServiceProvider>
  );
  // Accueil reads asynchronously; wait for its first paint so tests start from a settled screen.
  await screen.findByText(options.firstScreenText ?? 'Solde réel · tous comptes');
  return {
    ...utils,
    dataService,
    db,
    scheduler,
    fileSharer,
    teardown: async () => {
      await settle();
      cleanup();
      await close();
    },
  };
}
