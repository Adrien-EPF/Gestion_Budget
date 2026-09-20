import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';

/**
 * Global quick-entry FAB, visible on all 5 screens (handoff §5). Opens a
 * stub sheet here — the real quick-entry bottom sheet is built in the
 * "Saisie rapide" ticket (#6); this ticket only needs the FAB to be
 * reachable and to open *something*.
 */
export function Fab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nouvelle opération"
        onPress={() => setOpen(true)}
        style={styles.fab}
      >
        <Text style={styles.glyph}>+</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={[textStyle('headingMd'), styles.sheetTitle]}>Nouvelle opération</Text>
          <Text style={[textStyle('bodyMd'), styles.sheetBody]}>
            La saisie rapide arrive dans une prochaine étape.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={styles.closeButton}
          >
            <Text style={[textStyle('button'), styles.closeButtonText]}>Fermer</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 64 + 16,
    width: 56,
    height: 56,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(58,95,84,0.28)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 1,
    elevation: 4,
  },
  glyph: {
    color: colors.onPrimary,
    fontSize: 26,
    lineHeight: 26,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(35,35,35,0.32)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.hairline,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  sheetBody: {
    color: colors.mute,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  closeButton: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.ink,
  },
});
