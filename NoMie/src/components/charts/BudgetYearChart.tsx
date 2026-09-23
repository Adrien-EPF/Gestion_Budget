import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { monthName } from '../../navigation/formatMonthLabel';
import type { BudgetYear } from '../../services/dataService';
import { colors, rounded, spacing, textStyle } from '../../theme/tokens';
import { describeBudgetMonth, summarizeBudgetYear, type BudgetMonthPill } from '../../utils/budgetYearCopy';
import { MonthLetters, MonthStepper } from './MonthStepper';

const PLOT_HEIGHT = 144;
const HEADROOM = 1.12;

const PILLS: Record<BudgetMonthPill, { label: string; color: string; background: string }> = {
  ok: { label: 'Dans le prévu', color: colors.primary, background: colors.primarySoft },
  over: { label: 'Un peu au-dessus', color: colors.budgetWatch, background: colors.statusNonPointeSoft },
  upcoming: { label: 'À venir', color: colors.statusFlux, background: colors.statusFluxSoft },
};

interface BudgetYearChartProps {
  /** Month `m` gets `${testID}-bar-${m}` (when spent) and `${testID}-cap-${m}`; the reading is `${testID}-reading`. */
  testID: string;
  budgetYear: BudgetYear;
  /** Last month realized (0-11), picked on arrival; `null` for a year to come. */
  lastMonth: number | null;
  /** Shown at the top of the card: the Bilan's category chips. The Budgets detail has none. */
  controls?: React.ReactNode;
}

/**
 * Budget prévu vs réalisé (handoff §6.7, graphique 3): one column per
 * month, the spending bar against a mark at that month's ceiling — which
 * rises with the reliquat when carry-over is on. Sage within the
 * ceiling, sand above, and no third colour however far above.
 */
export function BudgetYearChart({ testID, budgetYear, lastMonth, controls }: BudgetYearChartProps) {
  const { budget, months } = budgetYear;
  const [selected, setSelected] = useState(lastMonth ?? 0);
  const scale =
    Math.max(...months.map((m) => (m.state === 'realized' ? Math.max(m.spent, m.ceiling) : m.ceiling))) * HEADROOM || 1;
  const percent = (amount: number) => `${(amount / scale) * 100}%` as const;
  const summary = summarizeBudgetYear(months, budget);
  const reading = describeBudgetMonth(months[selected], budget.carryOver);

  return (
    <View testID={testID} style={styles.card}>
      {controls}
      <Text style={[textStyle('headingSm'), styles.ink, styles.summary]}>{summary.title}</Text>
      {summary.detail ? <Text style={[textStyle('bodySm'), styles.mute]}>{summary.detail}</Text> : null}

      <View style={styles.zone}>
        <View style={styles.plot}>
          {months.map((m) => (
            <Pressable
              key={m.month}
              accessibilityRole="button"
              accessibilityLabel={monthName(m.month)}
              accessibilityState={{ selected: m.month === selected }}
              onPress={() => setSelected(m.month)}
              style={[styles.column, m.month === selected && styles.columnSelected]}
            >
              {m.state === 'realized' && m.spent > 0 ? (
                <View
                  testID={`${testID}-bar-${m.month}`}
                  style={[
                    styles.bar,
                    {
                      height: percent(m.spent),
                      backgroundColor: m.spent > m.ceiling ? colors.budgetWatch : colors.budgetOk,
                    },
                  ]}
                />
              ) : null}
              {m.state !== 'not_started' ? (
                <View testID={`${testID}-cap-${m.month}`} style={[styles.cap, { bottom: percent(m.ceiling) }]} />
              ) : null}
            </Pressable>
          ))}
        </View>
        <MonthLetters selected={selected} />
      </View>

      <View style={styles.legend}>
        <LegendItem swatch={[styles.square, { backgroundColor: colors.budgetOk }]} label="Dans le prévu" />
        <LegendItem swatch={[styles.square, { backgroundColor: colors.budgetWatch }]} label="Un peu au-dessus" />
        <LegendItem swatch={styles.dash} label={budget.carryOver ? 'Prévu, reliquat inclus' : 'Prévu'} />
      </View>

      <View testID={`${testID}-reading`} style={styles.reading}>
        <MonthStepper
          month={selected}
          onChange={setSelected}
          title={monthName(selected)}
          pill={reading.pill ? PILLS[reading.pill] : null}
        />
        <View style={styles.readingText}>
          {reading.amounts ? (
            <Text style={[textStyle('amountSm'), styles.ink, styles.tabular]}>{reading.amounts}</Text>
          ) : null}
          {reading.carried ? <Text style={[textStyle('bodySm'), styles.ash]}>{reading.carried}</Text> : null}
          <Text style={[textStyle('bodySm'), styles.mute, styles.message]}>{reading.message}</Text>
        </View>
      </View>
    </View>
  );
}

function LegendItem({ swatch, label }: { swatch: StyleProp<ViewStyle>; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={swatch} />
      <Text style={[textStyle('bodySm'), styles.mute]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  summary: {
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  zone: {
    marginTop: spacing.md,
    gap: 4,
  },
  plot: {
    height: PLOT_HEIGHT,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    borderTopLeftRadius: rounded.sm,
    borderTopRightRadius: rounded.sm,
  },
  columnSelected: {
    backgroundColor: colors.surfaceSoft,
  },
  bar: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  cap: {
    position: 'absolute',
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.mute,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
    columnGap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  square: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  dash: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.mute,
  },
  reading: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    marginTop: spacing.sm,
  },
  readingText: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
    gap: 2,
  },
  message: {
    marginTop: 4,
    textAlign: 'center',
  },
  ink: {
    color: colors.ink,
  },
  mute: {
    color: colors.mute,
  },
  ash: {
    color: colors.ash,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
