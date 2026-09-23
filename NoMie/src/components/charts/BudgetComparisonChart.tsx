import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';

export interface BudgetComparisonItem {
  label: string;
  planned: number;
  spent: number;
  /** From the data service: past 85 % of the plan. */
  watch: boolean;
  exceeded: boolean;
}

interface BudgetComparisonChartProps {
  /** Rows get `${testID}-row-${label}`, bars `${testID}-planned-${label}` and `${testID}-spent-${label}`. */
  testID: string;
  items: BudgetComparisonItem[];
}

/**
 * Budget prévu vs réalisé (#29): per category, a neutral « prévu » bar
 * over the « réalisé » one, every bar on the same scale so categories
 * compare with each other too. Réalisé takes the Budgets screen's tints —
 * sage, then sand once « à surveiller » — and the gap is stated as a
 * fact, never as an overrun warning.
 */
export function BudgetComparisonChart({ testID, items }: BudgetComparisonChartProps) {
  const largest = Math.max(...items.flatMap((item) => [item.planned, item.spent]));
  const width = (amount: number) => `${largest > 0 ? (amount / largest) * 100 : 0}%` as const;

  return (
    <View testID={testID} style={styles.card}>
      {items.map(({ label, planned, spent, watch, exceeded }) => (
        <View key={label} testID={`${testID}-row-${label}`} style={styles.row}>
          <View style={styles.labels}>
            <Text numberOfLines={1} style={[textStyle('bodyMdMedium'), styles.label]}>
              {label}
            </Text>
            <Text style={[textStyle('amountSm'), styles.amount]}>{formatAmount(spent)}</Text>
          </View>
          <Text style={[textStyle('caption'), styles.mute]}>{`sur ${formatAmount(planned)} prévus`}</Text>
          <View style={styles.bars}>
            <View
              testID={`${testID}-planned-${label}`}
              style={[styles.plannedBar, { width: width(planned) }]}
            />
            <View
              testID={`${testID}-spent-${label}`}
              style={[
                styles.spentBar,
                {
                  width: width(spent),
                  backgroundColor: watch ? colors.budgetWatch : colors.budgetOk,
                },
              ]}
            />
          </View>
          <Text style={[textStyle('bodySm'), styles.mute]}>
            {exceeded
              ? `${formatAmount(spent - planned)} de plus que prévu`
              : `${formatAmount(planned - spent)} de marge`}
          </Text>
        </View>
      ))}
      <View style={styles.legend}>
        <LegendItem color={colors.hairlineStrong} label="Prévu" />
        <LegendItem color={colors.budgetOk} label="Réalisé" />
        <LegendItem color={colors.budgetWatch} label="À surveiller" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <Text style={[textStyle('caption'), styles.mute]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  row: {
    gap: spacing.xxs,
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
  amount: {
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  mute: {
    color: colors.mute,
  },
  bars: {
    gap: spacing.xxs,
    marginVertical: spacing.xxs,
  },
  plannedBar: {
    height: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.hairlineStrong,
  },
  spentBar: {
    height: 8,
    borderRadius: rounded.full,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  legendSwatch: {
    width: 16,
    height: 6,
    borderRadius: rounded.full,
  },
});
