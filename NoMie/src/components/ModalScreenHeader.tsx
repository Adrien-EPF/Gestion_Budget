import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, textStyle } from '../theme/tokens';

interface ModalScreenHeaderProps {
  title: string;
  /** So a screen test can tell its header apart from the Réglages row that opened it. */
  testID: string;
  onClose: () => void;
}

/**
 * Header of a Réglages sub-screen presented as a full-screen `Modal`
 * (Catégories, Avances en attente — #21): a title and a "Fermer" button,
 * the same device already used for the app-wide lock screen but with a
 * closable header instead of a swallowed back button.
 */
export function ModalScreenHeader({ title, testID, onClose }: ModalScreenHeaderProps) {
  // The sub-screen `Modal`s are `statusBarTranslucent`: keep the header below the status bar.
  const { top } = useSafeAreaInsets();

  return (
    <View style={[styles.header, { height: HEADER_HEIGHT + top, paddingTop: top }]}>
      <Text testID={testID} style={[textStyle('headingMd'), styles.title]}>
        {title}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={8}>
        <Text style={[textStyle('bodyLg'), styles.close]}>Fermer</Text>
      </Pressable>
    </View>
  );
}

const HEADER_HEIGHT = 56;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  title: {
    color: colors.ink,
  },
  close: {
    color: colors.link,
  },
});
