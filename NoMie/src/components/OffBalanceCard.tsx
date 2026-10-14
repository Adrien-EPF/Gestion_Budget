import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { OffBalanceSummary } from '../services/dataService';
import { colors, rounded, shadows, spacing, textStyle } from '../theme/tokens';
import { formatAmount } from '../utils/formatAmount';

const LINES: { key: keyof OffBalanceSummary; label: string }[] = [
  { key: 'advances', label: 'Avances versées' },
  { key: 'reimbursements', label: 'Remboursements reçus' },
  { key: 'transfers', label: 'Mouvements entre comptes' },
  { key: 'others', label: 'Autres opérations hors bilan' },
];

interface OffBalanceCardProps {
  summary: OffBalanceSummary;
  testID: string;
}

/**
 * Bloc Hors bilan: the flows that moved the balances without touching the bilan,
 * kept visible beside the expenses rather than mixed into them. Empty lines are left out.
 */
export function OffBalanceCard({ summary, testID }: OffBalanceCardProps) {
  const lines = LINES.filter(({ key }) => summary[key] > 0);
  if (lines.length === 0) return null;

  return (
    <View testID={testID} style={styles.card}>
      <Text style={[textStyle('bodySm'), styles.note]}>
        Ces flux passent par tes comptes mais ne comptent pas dans les dépenses ni les recettes.
      </Text>
      {lines.map(({ key, label }) => (
        <View key={key} style={styles.row} accessibilityLabel={`${label}, ${formatAmount(summary[key])}`}>
          <Text style={[textStyle('bodyMd'), styles.label]}>{label}</Text>
          <Text style={[textStyle('amountSm'), styles.amount]}>{formatAmount(summary[key])}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    ...shadows.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  note: {
    color: colors.mute,
    marginBottom: spacing.xxs,
  },
  row: {
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
});
