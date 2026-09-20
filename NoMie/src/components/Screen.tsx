import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { AppBar } from './AppBar';
import { Fab } from './Fab';

interface ScreenProps {
  title: string;
  showMonthSelector?: boolean;
  children: React.ReactNode;
}

/** Common chrome wrapper (app bar + FAB) shared by the 5 main screens. */
export function Screen({ title, showMonthSelector, children }: ScreenProps) {
  return (
    <View style={styles.container}>
      <AppBar title={title} showMonthSelector={showMonthSelector} />
      <View style={styles.content}>{children}</View>
      <Fab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flex: 1,
  },
});
