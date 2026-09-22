import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View } from 'react-native';
import { FileSharerProvider } from './src/files/FileSharerContext';
import type { FileSharer } from './src/files/fileSharer';
import { createWebFileSharer } from './src/files/webFileSharer';
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

/** File sharing/picking is a browser download + `<input>` on the web target (#12 « Implementation Decisions »). */
const fileSharer: FileSharer =
  Platform.OS === 'web'
    ? createWebFileSharer()
    : require('./src/files/expoFileSharer').createExpoFileSharer();

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <AppDataServiceProvider>
      <NotificationSchedulerProvider scheduler={scheduler}>
        <FileSharerProvider fileSharer={fileSharer}>
          <RootNavigator />
        </FileSharerProvider>
      </NotificationSchedulerProvider>
      <StatusBar style="dark" />
    </AppDataServiceProvider>
  );
}
