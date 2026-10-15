import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import { AppBar } from './AppBar';
import { Fab } from './Fab';

interface ScreenProps {
  title: string;
  showMonthSelector?: boolean;
  /** The quick-entry FAB only makes sense where operations are listed (Accueil, Comptes). */
  showFab?: boolean;
  children: React.ReactNode;
}

/** Common chrome wrapper (app bar + FAB) shared by the 5 main screens; FAB on Accueil and Comptes. */
export function Screen({ title, showMonthSelector, showFab = false, children }: ScreenProps) {
  return (
    <View style={styles.container}>
      <AppBar title={title} showMonthSelector={showMonthSelector} />
      <View style={styles.content}>{children}</View>
      {showFab ? <Fab /> : null}
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
