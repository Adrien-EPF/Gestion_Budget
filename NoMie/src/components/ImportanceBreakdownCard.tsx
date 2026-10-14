import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ImportanceShare } from '../services/dataService';
import { colors, rounded, shadows, spacing, textStyle } from '../theme/tokens';
import { formatAmount } from '../utils/formatAmount';
import { IMPORTANCE_LABELS } from '../utils/importanceCopy';
import { ProgressBar } from './ProgressBar';

interface ImportanceBreakdownCardProps {
  shares: ImportanceShare[];
  testID: string;
}

/** Where the bilan expenses of a period go, per importance level: amount, share and a bar each. */
export function ImportanceBreakdownCard({ shares, testID }: ImportanceBreakdownCardProps) {
  const total = shares.reduce((sum, share) => sum + share.amount, 0);

  return (
    <View style={styles.card} testID={testID}>
      {shares.map(({ importance, amount }) => {
        const ratio = total > 0 ? amount / total : 0;
        return (
          <View
            key={importance}
            style={styles.row}
            accessibilityLabel={`${IMPORTANCE_LABELS[importance]}, ${formatAmount(amount)}`}
          >
            <View style={styles.header}>
              <Text style={[textStyle('bodyMdMedium'), styles.name]}>{IMPORTANCE_LABELS[importance]}</Text>
              <Text style={[textStyle('amountSm'), styles.amount]}>{formatAmount(amount)}</Text>
              <Text style={[textStyle('bodySm'), styles.share]}>{`${Math.round(ratio * 100)} %`}</Text>
            </View>
            <ProgressBar ratio={ratio} color={colors.budgetOk} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    ...shadows.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  name: {
    flex: 1,
    color: colors.ink,
  },
  amount: {
    color: colors.ink,
  },
  share: {
    width: 44,
    textAlign: 'right',
    color: colors.mute,
  },
});
