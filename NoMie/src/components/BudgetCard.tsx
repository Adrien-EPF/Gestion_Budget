import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BudgetProgress } from '../services/dataService';
import { useDataService } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { describeBudget, formatBudgetRatio } from '../utils/budgetCopy';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { Switch } from './Switch';

interface BudgetCardProps {
  progress: BudgetProgress;
  /** The month the budget is measured against, for the wording of its note. */
  month: { year: number; month: number };
  /** « Voir l’année »: the budget month by month over the year (§6.7). No link without it (Accueil's preview). */
  onShowYear?: () => void;
}

/** One budget (handoff §6.3): ratio, bar, factual note, its own carry-over switch, and a way to its year. */
export function BudgetCard({ progress, month, onShowYear }: BudgetCardProps) {
  const dataService = useDataService();
  const { budget, spent, ceiling, fillRatio, watch } = progress;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[textStyle('headingSm'), styles.name]} numberOfLines={1}>
          {budget.categoryName}
        </Text>
        <Text style={[textStyle('amountSm'), styles.ratio]}>{formatBudgetRatio(spent, ceiling)}</Text>
      </View>

      <ProgressBar
        testID={`budget-bar-${budget.id}`}
        ratio={fillRatio}
        color={watch ? colors.budgetWatch : colors.budgetOk}
      />
      <Text style={[textStyle('bodySm'), styles.note]}>{describeBudget(progress, month)}</Text>

      <View style={styles.carryRow}>
        <View style={styles.carryText}>
          <Text style={[textStyle('bodyMdMedium'), styles.carryLabel]}>Report du reliquat</Text>
          <Text style={[textStyle('bodySm'), styles.carryHint]}>
            {budget.carryOver
              ? 'Le reste du mois passé s’ajoute à ce budget'
              : 'Chaque mois repart du montant prévu'}
          </Text>
        </View>
        <Switch
          value={budget.carryOver}
          onValueChange={(carryOver) => dataService.setBudgetCarryOver(budget.id, carryOver)}
          accessibilityLabel={`Report du reliquat, ${budget.categoryName}`}
        />
      </View>

      {onShowYear ? (
        <Button
          label="Voir l’année"
          variant="ghost"
          accessibilityLabel={`Voir l’année, ${budget.categoryName}`}
          onPress={onShowYear}
          style={styles.yearLink}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    color: colors.ink,
    flexShrink: 1,
  },
  ratio: {
    color: colors.mute,
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: colors.mute,
  },
  carryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  carryText: {
    flex: 1,
    gap: 2,
  },
  carryLabel: {
    color: colors.ink,
  },
  carryHint: {
    color: colors.ash,
  },
  yearLink: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    marginLeft: -spacing.sm,
  },
});
