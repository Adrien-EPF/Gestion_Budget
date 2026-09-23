import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';
import { describeMonthlySpread, expensePeriodNote, formatShare } from '../../utils/yearReportCopy';
import type { ExpenseGroup } from './chartGeometry';

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

interface CategoryBreakdownChartProps {
  /**
   * Per line `key`: `${testID}-segment-${key}` in the stacked bar,
   * `${testID}-row-${key}` in the list, `${testID}-months-${key}` once
   * unfolded (bars `${testID}-bar-${key}-${month}`); « Autres » unfolds
   * into `${testID}-members`.
   */
  testID: string;
  year: number;
  /** From `groupExpenses`, so the table below shows the same lines. */
  groups: ExpenseGroup[];
  /** Last month counted (0-11): the monthly average is over the months gone by. */
  lastMonth: number;
}

/**
 * Répartition des dépenses (handoff §6.7, graphique 1): a static 100 %
 * stacked bar, then the ranked list. Tapping a category unfolds its
 * twelve months — one at a time, the first open on arrival; tapping
 * « Autres » lists the categories it groups.
 */
export function CategoryBreakdownChart({ testID, year, groups, lastMonth }: CategoryBreakdownChartProps) {
  const [openKey, setOpenKey] = useState<string | null>(groups[0]?.key ?? null);
  const [othersOpen, setOthersOpen] = useState(false);
  const total = groups.reduce((sum, g) => sum + g.total, 0);

  return (
    <View testID={testID} style={styles.card}>
      <Text style={[textStyle('bodySm'), styles.ash]}>{`Total ${year}`}</Text>
      <Text style={[textStyle('displayMd'), styles.total]}>{formatAmount(total)}</Text>
      <Text style={[textStyle('bodySm'), styles.mute, styles.period]}>{expensePeriodNote(lastMonth)}</Text>

      <View style={styles.stack}>
        {groups.map((g) => (
          <View
            key={g.key}
            testID={`${testID}-segment-${g.key}`}
            style={[styles.segment, { width: `${g.share * 100}%`, backgroundColor: g.color }]}
          />
        ))}
      </View>

      {groups.map((g) => {
        const isOthers = g.kind === 'others';
        const open = isOthers ? othersOpen : openKey === g.key;
        return (
          <View key={g.key}>
            <Pressable
              testID={`${testID}-row-${g.key}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => (isOthers ? setOthersOpen(!othersOpen) : setOpenKey(open ? null : g.key))}
              style={[styles.row, open && styles.rowOpen]}
            >
              <View style={[styles.swatch, { backgroundColor: g.color }]} />
              <Text numberOfLines={1} style={[textStyle('bodyMdMedium'), styles.name]}>
                {g.label}
              </Text>
              <Text style={[textStyle('bodySm'), styles.ash, styles.tabular]}>{formatShare(g.share)}</Text>
              <Text style={[textStyle('amountSm'), styles.amount]}>{formatAmount(g.total)}</Text>
              <Text style={[textStyle('caption'), styles.ash, styles.chevron]}>
                {isOthers ? (open ? '▴' : '▾') : ''}
              </Text>
            </Pressable>
            {open && !isOthers ? <MonthBars testID={testID} group={g} lastMonth={lastMonth} /> : null}
            {open && isOthers ? (
              <View testID={`${testID}-members`} style={styles.members}>
                {g.members.map((member) => (
                  <View key={member.label} style={styles.member}>
                    <Text numberOfLines={1} style={[textStyle('bodySm'), styles.mute, styles.name]}>
                      {member.label}
                    </Text>
                    <Text style={[textStyle('bodySm'), styles.ash, styles.tabular]}>
                      {formatShare(member.share)}
                    </Text>
                    <Text style={[textStyle('bodySm'), styles.mute, styles.memberAmount]}>
                      {formatAmount(member.total)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** The unfolded line: twelve bars, the highest month at full strength. */
function MonthBars({ testID, group, lastMonth }: { testID: string; group: ExpenseGroup; lastMonth: number }) {
  const highest = Math.max(...group.months);
  const peak = group.months.indexOf(highest);
  return (
    <View testID={`${testID}-months-${group.key}`} style={styles.detail}>
      <View style={styles.bars}>
        {group.months.map((value, month) => (
          <View key={month} style={styles.barSlot}>
            <View
              testID={`${testID}-bar-${group.key}-${month}`}
              style={[
                styles.bar,
                {
                  height: `${highest > 0 && value > 0 ? Math.max(3, (value / highest) * 100) : 0}%`,
                  backgroundColor: group.color,
                  opacity: month === peak ? 1 : 0.7,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.letters}>
        {MONTH_INITIALS.map((initial, month) => (
          <Text key={month} style={[textStyle('caption'), styles.ash, styles.letter]}>
            {initial}
          </Text>
        ))}
      </View>
      <Text style={[textStyle('bodySm'), styles.mute]}>{describeMonthlySpread(group.months, lastMonth)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  total: {
    color: colors.amountNegative,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  period: {
    marginTop: spacing.xxs,
  },
  stack: {
    flexDirection: 'row',
    gap: 2,
    height: 14,
    borderRadius: rounded.full,
    overflow: 'hidden',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  segment: {
    height: 14,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: rounded.md,
  },
  rowOpen: {
    backgroundColor: colors.surfaceSoft,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  name: {
    flex: 1,
    color: colors.ink,
  },
  amount: {
    minWidth: 92,
    textAlign: 'right',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  chevron: {
    width: 12,
    textAlign: 'center',
  },
  detail: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xxs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  barSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  letters: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xxs,
  },
  letter: {
    flex: 1,
    textAlign: 'center',
  },
  members: {
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xs,
  },
  member: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 20,
  },
  memberAmount: {
    minWidth: 92,
    textAlign: 'right',
    marginRight: 22,
    fontVariant: ['tabular-nums'],
  },
  ash: {
    color: colors.ash,
  },
  mute: {
    color: colors.mute,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
