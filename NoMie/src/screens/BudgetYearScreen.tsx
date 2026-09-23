import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BudgetYearChart } from '../components/charts/BudgetYearChart';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import type { Budget } from '../services/dataService';
import { useServiceQuery } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';

interface BudgetYearScreenProps {
  budget: Budget;
  /** The year of the month Budgets was showing. */
  year: number;
  onClose: () => void;
}

/**
 * « Voir l’année » from a Budgets card (handoff §6.7): the main home of
 * budget prévu vs réalisé, where « am I keeping this budget? » is asked.
 * Exactly the Bilan's chart, without its chips — the category is already
 * chosen. A full-screen `Modal`, like the other sub-screens.
 */
export function BudgetYearScreen({ budget, year, onClose }: BudgetYearScreenProps) {
  const overview = useServiceQuery((s) => s.getBudgetYear(year), [year]);
  const budgetYear = overview?.budgets.find((b) => b.budget.id === budget.id);

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <ModalScreenHeader title={budget.categoryName} testID="budget-year-title" onClose={onClose} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[textStyle('headingSm'), styles.title]}>{`Prévu et réalisé en ${year}`}</Text>
          {overview && budgetYear ? (
            <BudgetYearChart testID="budget-detail-chart" budgetYear={budgetYear} lastMonth={overview.lastMonth} />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  title: {
    color: colors.ink,
    marginBottom: spacing.sm,
  },
});
