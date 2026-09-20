import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DataServiceProvider } from './src/services/DataServiceContext';
import { colors } from './src/theme/tokens';
import { useAppFonts } from './src/theme/useAppFonts';

export default function App() {
  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.canvas }} />;
  }

  return (
    <DataServiceProvider>
      <RootNavigator />
      <StatusBar style="dark" />
    </DataServiceProvider>
  );
}
