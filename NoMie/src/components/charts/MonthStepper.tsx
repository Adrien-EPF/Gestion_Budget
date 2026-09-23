import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../../theme/tokens';

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

interface MonthStepperProps {
  month: number;
  onChange: (month: number) => void;
  title: string;
  /** Beside the title: the month's state, as a soft pill. */
  pill?: { label: string; color: string; background: string } | null;
}

/**
 * ‹ title › under a Bilan annuel chart (§6.7). The chart's columns are
 * about 28px wide; these 48×48 arrows are what guarantees the touch
 * target when picking a month.
 */
export function MonthStepper({ month, onChange, title, pill }: MonthStepperProps) {
  return (
    <View style={styles.row}>
      <Arrow label="Mois précédent" glyph="‹" enabled={month > 0} onPress={() => onChange(month - 1)} />
      <View style={styles.title}>
        <Text style={[textStyle('amountSm'), styles.ink]}>{title}</Text>
        {pill ? (
          <View style={[styles.pill, { backgroundColor: pill.background }]}>
            <Text style={[textStyle('caption'), { color: pill.color }]}>{pill.label}</Text>
          </View>
        ) : null}
      </View>
      <Arrow label="Mois suivant" glyph="›" enabled={month < 11} onPress={() => onChange(month + 1)} />
    </View>
  );
}

function Arrow({
  label,
  glyph,
  enabled,
  onPress,
}: {
  label: string;
  glyph: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={styles.arrow}
    >
      <Text style={[textStyle('headingMd'), { color: enabled ? colors.mute : colors.faint }]}>{glyph}</Text>
    </Pressable>
  );
}

/** Twelve month initials under a chart, the selected one in 600 `ink`. */
export function MonthLetters({ selected }: { selected: number }) {
  return (
    <View style={styles.letters}>
      {MONTH_INITIALS.map((initial, month) => (
        <Text
          key={month}
          style={[
            textStyle(month === selected ? 'amountSm' : 'bodySm'),
            styles.letter,
            { color: month === selected ? colors.ink : colors.ash },
          ]}
        >
          {initial}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  ink: {
    color: colors.ink,
  },
  pill: {
    borderRadius: rounded.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  letters: {
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
});
