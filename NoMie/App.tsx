import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppDataServiceProvider } from './src/services/AppDataServiceProvider';
import { colors } from './src/theme/tokens';
import { useAppFonts } from './src/theme/useAppFonts';

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <AppDataServiceProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </AppDataServiceProvider>
  );
}
