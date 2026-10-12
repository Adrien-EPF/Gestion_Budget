import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, rounded, shadows } from '../theme/tokens';
import { QuickEntrySheet } from './QuickEntrySheet';

/** Global quick-entry FAB, visible on all 5 screens (handoff §5). */
export function Fab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nouvelle opération"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: pressed ? colors.primaryDeep : colors.primary },
        ]}
      >
        <Text style={styles.glyph}>+</Text>
      </Pressable>
      <QuickEntrySheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 64 + 16,
    width: 60,
    height: 60,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  glyph: {
    color: colors.onPrimary,
    fontSize: 26,
    lineHeight: 26,
  },
});
