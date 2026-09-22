import Constants from 'expo-constants';
import React from 'react';
import { Platform } from 'react-native';
import { Button } from '../components/Button';
import { checkReminderCopy, monthlyBudgetReviewCopy } from '../utils/notificationCopy';
import { useNotificationScheduler } from './NotificationSchedulerContext';
import type { NotificationDestination } from './scheduler';

const DELAY_SECONDS = 10;

/**
 * TEMPORARY, development builds only: fires each notification after a few
 * seconds so the display and the tap can be checked on a device without
 * waiting for Sunday 18:00 or the 1st of the month. To remove once verified.
 * Hidden in Expo Go: notifications are on hold there (App.tsx uses the inert
 * scheduler), and this button calls `expo-notifications` directly.
 */
export function DevNotificationTest() {
  const scheduler = useNotificationScheduler();
  if (!__DEV__ || Platform.OS === 'web' || Constants.expoGoConfig !== null) return null;

  const fire = async (copy: { title: string; body: string }, destination: NotificationDestination) => {
    if (!(await scheduler.requestPermission())) return;
    // Loaded here, not at the top: the module refuses to load outside a device (tests, Expo Go warnings).
    const Notifications: typeof import('expo-notifications') = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { ...copy, data: { destination } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: DELAY_SECONDS },
    });
  };

  return (
    <>
      <Button
        label={`Test : rappel de pointage (dans ${DELAY_SECONDS} s)`}
        variant="secondary"
        onPress={() => fire(checkReminderCopy, { screen: 'Comptes' })}
      />
      <Button
        label={`Test : point budget (dans ${DELAY_SECONDS} s)`}
        variant="secondary"
        onPress={() => fire(monthlyBudgetReviewCopy, { screen: 'Budgets' })}
      />
    </>
  );
}
