import React, { createContext, useContext, useEffect } from 'react';
import { useDataService } from '../services/DataServiceContext';
import { reconcileNotifications } from './reconcile';
import type { NotificationScheduler } from './scheduler';

const NotificationSchedulerContext = createContext<NotificationScheduler | null>(null);

/**
 * Makes the scheduler available to the tree and, at every launch, brings
 * the scheduled notifications back in line with the saved switches
 * (they may have been lost with a reboot or an inconsistent state).
 */
export function NotificationSchedulerProvider({
  children,
  scheduler,
}: {
  children: React.ReactNode;
  scheduler: NotificationScheduler;
}) {
  const dataService = useDataService();

  useEffect(() => {
    reconcileNotifications(dataService, scheduler).catch(() => {
      // A notification that cannot be planned must never stop the app from opening.
    });
  }, [dataService, scheduler]);

  return (
    <NotificationSchedulerContext.Provider value={scheduler}>{children}</NotificationSchedulerContext.Provider>
  );
}

export function useNotificationScheduler(): NotificationScheduler {
  const scheduler = useContext(NotificationSchedulerContext);
  if (!scheduler) {
    throw new Error('useNotificationScheduler must be used within a NotificationSchedulerProvider');
  }
  return scheduler;
}
