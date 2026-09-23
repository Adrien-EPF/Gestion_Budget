import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';
import { OTHERS_LABEL, toBreakdown, type BreakdownItem } from './chartGeometry';

const NBSP = ' ';

interface CategoryBreakdownChartProps {
  /** Each slice gets `${testID}-slice-${rank}`, largest first. */
  testID: string;
  items: BreakdownItem[];
}

/**
 * Répartition des dépenses (#28): one horizontal bar per category, the
 * largest spanning the whole width. Bars rather than a donut: labels
 * stay readable on a phone and the ranking reads top to bottom. A single
 * sage tint — a big spending line is information, not a warning.
 */
export function CategoryBreakdownChart({ testID, items }: CategoryBreakdownChartProps) {
  const slices = toBreakdown(items);
  const largest = slices[0]?.amount ?? 0;

  return (
    <View testID={testID} style={styles.card}>
      {slices.map((slice, rank) => (
        <View key={slice.label} testID={`${testID}-slice-${rank}`} style={styles.slice}>
          <View style={styles.labels}>
            <Text numberOfLines={1} style={[textStyle('bodyMdMedium'), styles.label]}>
              {slice.label}
            </Text>
            <Text style={[textStyle('caption'), styles.share]}>{formatShare(slice.share)}</Text>
            <Text style={[textStyle('amountSm'), styles.amount]}>{formatAmount(slice.amount)}</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${(slice.amount / largest) * 100}%`,
                  backgroundColor: slice.label === OTHERS_LABEL ? colors.ash : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function formatShare(share: number): string {
  const percent = Math.round(share * 100);
  return percent === 0 ? `<${NBSP}1${NBSP}%` : `${percent}${NBSP}%`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  slice: {
    gap: spacing.xs,
  },
  labels: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  label: {
    flex: 1,
    color: colors.ink,
  },
  share: {
    color: colors.mute,
  },
  amount: {
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: rounded.full,
  },
});
