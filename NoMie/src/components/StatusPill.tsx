import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TransactionStatus } from '../services/dataService';
import { colors, rounded, textStyle } from '../theme/tokens';

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  non_pointe: 'Non pointé',
  pointe: 'Pointé',
  prevision: 'Prévision',
  flux_comptable: 'Flux comptable',
};

const STATUS_COLORS: Record<TransactionStatus, { fg: string; bg: string }> = {
  non_pointe: { fg: colors.statusNonPointe, bg: colors.statusNonPointeSoft },
  pointe: { fg: colors.statusPointe, bg: colors.statusPointeSoft },
  prevision: { fg: colors.statusPrevision, bg: colors.statusPrevisionSoft },
  flux_comptable: { fg: colors.statusFlux, bg: colors.statusFluxSoft },
};

/** Status is coded by tint + soft background, never by a warning icon (DESIGN.md). */
export function StatusPill({ status }: { status: TransactionStatus }) {
  const { fg, bg } = STATUS_COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[textStyle('caption'), { color: fg }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: rounded.full,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
});
