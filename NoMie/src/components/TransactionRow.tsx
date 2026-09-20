import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TransactionListItem } from '../services/dataService';
import { colors, fontFamilies, rounded, spacing, textStyle } from '../theme/tokens';
import { formatShortDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import { STATUS_LABELS, StatusPill } from './StatusPill';

interface TransactionRowProps {
  transaction: TransactionListItem;
  onPress?: () => void;
  /** Tints the category icon as an item awaiting pointage (Comptes › À pointer). */
  toPointTone?: boolean;
  /** Rounds the corners of the first / last row so a stack of rows reads as one card. */
  isFirst?: boolean;
  isLast?: boolean;
}

/** One operation, as listed on Accueil and in Comptes › À pointer (handoff §6.1). */
export function TransactionRow({
  transaction,
  onPress,
  toPointTone = false,
  isFirst = false,
  isLast = false,
}: TransactionRowProps) {
  const { comment, categoryName, categoryIcon, amount, status, operationDate, advancedAmount } =
    transaction;
  const label = comment || categoryName || 'Opération';
  // When the label already is the category (no comment), repeating it would be noise.
  const meta = [formatShortDate(operationDate), comment ? categoryName : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${STATUS_LABELS[status]}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isFirst && styles.divider,
        isFirst && styles.first,
        isLast && styles.last,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, toPointTone && { backgroundColor: colors.statusNonPointeSoft }]}>
        <Text
          style={[
            textStyle('bodySm'),
            styles.iconText,
            toPointTone && { color: colors.statusNonPointe },
          ]}
        >
          {categoryIcon ?? '–'}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={[textStyle('bodyMdMedium'), styles.label]} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.meta}>
          <StatusPill status={status} />
          <Text style={[textStyle('bodySm'), styles.metaText]} numberOfLines={1}>
            {meta}
          </Text>
          {advancedAmount > 0 ? (
            <Text style={[textStyle('bodySm'), styles.advance]} numberOfLines={1}>
              {`Avancé ${formatAmount(advancedAmount)}`}
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        style={[
          textStyle('amountLg'),
          styles.amount,
          { color: amount < 0 ? colors.amountNegative : colors.amountPositive },
        ]}
      >
        {formatAmount(amount, { signed: true })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  first: {
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
  },
  last: {
    borderBottomLeftRadius: rounded.lg,
    borderBottomRightRadius: rounded.lg,
  },
  pressed: {
    backgroundColor: colors.canvas,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.mute,
    fontFamily: fontFamilies.semiBold,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: colors.ink,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: colors.ash,
    flexShrink: 1,
  },
  advance: {
    color: colors.advance,
  },
  amount: {
    fontVariant: ['tabular-nums'],
  },
});
