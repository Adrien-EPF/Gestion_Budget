import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';

export interface ChipOption<T> {
  value: T;
  label: string;
}

interface ChipsProps<T> {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Long lists (categories) scroll sideways; short ones wrap. */
  scroll?: boolean;
}

/** Single-choice chips as in the quick-entry sheet: `surface-soft` at rest, `primary` when chosen. */
export function Chips<T extends string | number>({ options, value, onChange, scroll = false }: ChipsProps<T>) {
  const chips = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="button"
        accessibilityLabel={option.label}
        accessibilityState={{ selected }}
        onPress={() => onChange(option.value)}
        style={[styles.chip, selected && { backgroundColor: colors.primary }]}
      >
        <Text style={[textStyle('bodySm'), { color: selected ? colors.onPrimary : colors.ink }]}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        style={styles.scroll}
      >
        {chips}
      </ScrollView>
    );
  }
  return <View style={[styles.row, styles.wrap]}>{chips}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  wrap: {
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
});
