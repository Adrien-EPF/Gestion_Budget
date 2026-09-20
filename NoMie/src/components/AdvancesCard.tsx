import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PendingAdvances } from '../services/dataService';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { formatAmount } from '../utils/formatAmount';

/** Accueil › Avances (handoff §6.1 point 5): what is waiting to be paid back. */
export function AdvancesCard({ advances }: { advances: PendingAdvances }) {
  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={[textStyle('headingSm'), styles.title]}>Avances</Text>
          <View style={styles.badge}>
            <Text style={[textStyle('caption'), styles.badgeText]}>Avancé</Text>
          </View>
        </View>
        <Text style={[textStyle('bodySm'), styles.subtitle]}>
          {`${advances.count} ${advances.count > 1 ? 'portions' : 'portion'} en attente de remboursement`}
        </Text>
      </View>
      <Text testID="home-advances-total" style={[textStyle('amountLg'), styles.total]}>
        {formatAmount(advances.total)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
  },
  text: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
  },
  badge: {
    backgroundColor: colors.statusPrevisionSoft,
    borderRadius: rounded.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: colors.advance,
  },
  subtitle: {
    color: colors.mute,
  },
  total: {
    color: colors.advance,
    fontVariant: ['tabular-nums'],
  },
});
