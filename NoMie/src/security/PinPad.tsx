import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies, rounded, spacing } from '../theme/tokens';

export type PinKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'backspace';

const ROWS: (PinKey | null)[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [null, '0', 'backspace'],
];

interface PinPadProps {
  onKeyPress: (key: PinKey) => void;
  disabled?: boolean;
}

/** Dedicated numeric pad for the lock screen, styled like QuickEntrySheet's keypad without reusing it (#19 Implementation Decisions). */
export function PinPad({ onKeyPress, disabled = false }: PinPadProps) {
  return (
    <View style={styles.pad}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((key, keyIndex) =>
            key === null ? (
              <View key={`spacer-${keyIndex}`} style={styles.key} />
            ) : (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === 'backspace' ? 'Effacer' : key}
                disabled={disabled}
                onPress={() => onKeyPress(key)}
                style={({ pressed }) => [
                  styles.key,
                  styles.keyButton,
                  pressed && { backgroundColor: colors.surfaceSoft },
                ]}
              >
                <Text style={styles.keyLabel}>{key === 'backspace' ? '←' : key}</Text>
              </Pressable>
            )
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  keyLabel: {
    fontSize: 24,
    fontFamily: fontFamilies.semiBold,
    color: colors.ink,
  },
});
