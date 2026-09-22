import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { createInertScheduler } from './src/notifications/inMemoryScheduler';
import { NotificationSchedulerProvider } from './src/notifications/NotificationSchedulerContext';
import type { NotificationScheduler } from './src/notifications/scheduler';
import { AppDataServiceProvider } from './src/services/AppDataServiceProvider';
import { colors } from './src/theme/tokens';
import { useAppFonts } from './src/theme/useAppFonts';

/**
 * Local notifications need a dev/standalone build: the scheduler is inert on
 * the web target and, for now, in Expo Go too (used to test the rest of the
 * app while the notification feature is on hold).
 */
const scheduler: NotificationScheduler =
  Platform.OS === 'web' || Constants.expoGoConfig !== null
    ? createInertScheduler()
    : require('./src/notifications/expoNotificationScheduler').createExpoNotificationScheduler();

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <AppDataServiceProvider>
      <NotificationSchedulerProvider scheduler={scheduler}>
        <RootNavigator />
      </NotificationSchedulerProvider>
      <StatusBar style="dark" />
    </AppDataServiceProvider>
  );
}
