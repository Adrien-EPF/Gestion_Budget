import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, textStyle } from '../theme/tokens';

/** One row of a per-item actions menu (accounts, categories, …): a label and a chevron. */
export function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.canvas }]}
    >
      <Text style={[textStyle('bodyLg'), styles.label]}>{label}</Text>
      <Text style={[textStyle('bodyLg'), styles.chevron]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  label: {
    color: colors.ink,
  },
  chevron: {
    color: colors.ash,
  },
});
