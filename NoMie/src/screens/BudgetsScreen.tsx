import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddBudgetSheet } from '../components/AddBudgetSheet';
import { BudgetCard } from '../components/BudgetCard';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { Screen } from '../components/Screen';
import { useMonth } from '../navigation/MonthContext';
import type { Budget, BudgetOverview } from '../services/dataService';
import { useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { describeMonthProgress, monthElapsedFraction } from '../utils/budgetCopy';
import { formatAmount } from '../utils/formatAmount';
import { BudgetYearScreen } from './BudgetYearScreen';

/** Budgets (handoff §6.3): the month at a glance, then one card per budget. */
export function BudgetsScreen() {
  const { year, month } = useMonth();
  const overview = useServiceQuery((s) => s.getBudgetOverview({ year, month }), [year, month]);
  const [adding, setAdding] = useState(false);
  const [yearOf, setYearOf] = useState<Budget | null>(null);

  if (!overview) return <Screen title="Budgets" showMonthSelector>{null}</Screen>;

  return (
    <Screen title="Budgets" showMonthSelector>
      <ScrollView contentContainerStyle={styles.content}>
        {overview.budgets.length > 0 ? (
          <>
            <SummaryCard overview={overview} year={year} month={month} />
            {overview.budgets.map((progress) => (
              <BudgetCard
                key={progress.budget.id}
                progress={progress}
                month={{ year, month }}
                onShowYear={() => setYearOf(progress.budget)}
              />
            ))}
          </>
        ) : (
          <Text style={[textStyle('bodyMd'), styles.note]}>
            Aucun budget pour ce mois-ci. Ajoutes-en un pour suivre une catégorie.
          </Text>
        )}
        <Button label="+ Ajouter un budget" variant="ghost" onPress={() => setAdding(true)} />
      </ScrollView>
      <AddBudgetSheet visible={adding} onClose={() => setAdding(false)} />
      {yearOf ? <BudgetYearScreen budget={yearOf} year={year} onClose={() => setYearOf(null)} /> : null}
    </Screen>
  );
}

function SummaryCard({
  overview,
  year,
  month,
}: {
  overview: BudgetOverview;
  year: number;
  month: number;
}) {
  const { spent, planned } = overview;
  const elapsed = monthElapsedFraction(new Date(), { year, month });

  return (
    <View style={styles.summary}>
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={[textStyle('caption'), styles.columnLabel]}>Dépensé</Text>
          <Text testID="budgets-spent" style={[textStyle('displayMd'), { color: colors.ink }]}>
            {formatAmount(spent)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.column}>
          <Text style={[textStyle('caption'), styles.columnLabel]}>Prévu</Text>
          <Text testID="budgets-planned" style={[textStyle('displayMd'), { color: colors.mute }]}>
            {formatAmount(planned)}
          </Text>
        </View>
      </View>
      <ProgressBar
        testID="budgets-summary-bar"
        ratio={planned > 0 ? spent / planned : 0}
        color={colors.budgetOk}
      />
      <Text style={[textStyle('bodySm'), styles.note]}>
        {describeMonthProgress(spent, planned, elapsed)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 116,
    gap: spacing.sm,
  },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  columns: {
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    gap: 2,
  },
  columnLabel: {
    color: colors.ash,
  },
  divider: {
    width: 1,
    backgroundColor: colors.hairline,
    marginHorizontal: spacing.md,
  },
  note: {
    color: colors.mute,
  },
});
