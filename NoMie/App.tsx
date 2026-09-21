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

/** Local notifications are not available on the web target: the scheduler is inert there. */
const scheduler: NotificationScheduler =
  Platform.OS === 'web'
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
