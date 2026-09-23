import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { BalanceLineChart } from '../components/charts/BalanceLineChart';
import { BudgetYearChart } from '../components/charts/BudgetYearChart';
import { CategoryBreakdownChart } from '../components/charts/CategoryBreakdownChart';
import { groupExpenses, type ExpenseGroup } from '../components/charts/chartGeometry';
import { Chips } from '../components/Chips';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import { YearTable, type YearTableRow } from '../components/YearTable';
import { monthName } from '../navigation/formatMonthLabel';
import type { BudgetYearOverview, CategoryYearFlow, YearStatus } from '../services/dataService';
import { useServiceQuery } from '../services/DataServiceContext';
import {
  CHART_ACCOUNT_COLORS,
  CHART_CATEGORY_COLORS,
  chartColor,
  colors,
  rounded,
  spacing,
  textStyle,
} from '../theme/tokens';
import { formatAmount } from '../utils/formatAmount';

interface YearReportScreenProps {
  /** The year Accueil was showing; the selector moves from there. */
  initialYear: number;
  onClose: () => void;
  /** « Créer un budget » when no budget is followed that year: leaves the Bilan for Budgets. */
  onCreateBudget: () => void;
}

/**
 * Bilan annuel (#25, handoff §6.7) — the Bilan sheet of the old Excel,
 * reached from Accueil. A full-screen `Modal` owned by Accueil, like the
 * Réglages sub-screens, rather than a 6th tab. Each chart sits in its own
 * card above the month-by-month table it sums up.
 */
export function YearReportScreen({ initialYear, onClose, onCreateBudget }: YearReportScreenProps) {
  const [year, setYear] = useState(initialYear);
  const status = useServiceQuery((s) => s.getYearStatus(year), [year]);
  const flows = useServiceQuery((s) => s.getCategoryFlowsByMonth(year), [year]);
  const counts = useServiceQuery((s) => s.getOperationCountsByMonth(year), [year]);
  const balances = useServiceQuery((s) => s.getBalanceSeries(year), [year]);
  const budgetYear = useServiceQuery((s) => s.getBudgetYear(year), [year]);

  // The year Accueil was on stays reachable, even outside the years with data.
  const firstYear = Math.min(status?.firstYear ?? year, initialYear);
  const lastYear = Math.max(status?.currentYear ?? year, initialYear);
  const canGoBack = status !== undefined && year > firstYear;
  const canGoForward = status !== undefined && year < lastYear;

  const accountColor = new Map(
    (balances ?? []).map(({ account }, rank) => [account.id, chartColor(CHART_ACCOUNT_COLORS, rank)])
  );
  const expenseGroups = groupExpenses(
    (flows ?? []).map((f) => ({ name: f.categoryName, months: f.expenses, total: f.totalExpenses }))
  );
  const incomeRows = rankedIncomeRows(flows ?? []);
  const countRows: YearTableRow[] = (counts ?? []).map(({ account, counts: values, total }) => ({
    key: account.name,
    label: account.name,
    color: accountColor.get(account.id),
    values,
    total,
  }));
  const balanceRows: YearTableRow[] = (balances ?? []).map(({ account, real }) => ({
    key: account.name,
    label: account.name,
    color: accountColor.get(account.id),
    values: real,
  }));
  const forecastFrom = status?.lastMonth === null ? 0 : (status?.lastMonth ?? 11) + 1;

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <ModalScreenHeader title="Bilan annuel" testID="year-report-title" onClose={onClose} />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.yearSelector}>
            <View style={styles.yearRow}>
              <YearArrow label="Année précédente" glyph="‹" enabled={canGoBack} onPress={() => setYear(year - 1)} />
              <Text testID="year-report-year" style={[textStyle('headingLg'), styles.year]}>
                {String(year)}
              </Text>
              <YearArrow label="Année suivante" glyph="›" enabled={canGoForward} onPress={() => setYear(year + 1)} />
            </View>
            {status ? <Text style={[textStyle('bodySm'), styles.ash]}>{yearNote(status, year)}</Text> : null}
          </View>

          {status && !status.hasOperations ? (
            <View style={[styles.card, styles.emptyYear]}>
              <Text style={[textStyle('headingSm'), styles.ink]}>{`Aucune opération en ${year}.`}</Text>
              <Text style={[textStyle('bodyMd'), styles.mute, styles.centered]}>
                Les graphiques et les tableaux apparaîtront dès la première opération saisie sur cette année.
              </Text>
              {canGoForward ? (
                <Button label={`Voir ${year + 1}`} variant="ghost" onPress={() => setYear(year + 1)} />
              ) : null}
            </View>
          ) : status ? (
            <>
              <Section title="Soldes en fin de mois">
                {balances && balances.length > 0 ? (
                  <>
                    <BalanceLineChart
                      key={year}
                      testID="balance-chart"
                      accounts={balances.map(({ account, real, pointed }) => ({
                        id: account.id,
                        name: account.name,
                        color: accountColor.get(account.id)!,
                        real,
                        pointed,
                      }))}
                      lastMonth={status.lastMonth}
                    />
                    <YearTable
                      testID="year-balances"
                      heading="Solde réel"
                      rows={balanceRows}
                      format={formatAmount}
                      showZeros
                      forecastFrom={forecastFrom}
                    />
                  </>
                ) : (
                  <EmptyCard text={`Aucun solde enregistré en ${year}.`} />
                )}
              </Section>

              <Section title="Dépenses par catégorie">
                {expenseGroups.length > 0 ? (
                  <>
                    <CategoryBreakdownChart
                      key={year}
                      testID="expense-breakdown"
                      year={year}
                      groups={expenseGroups}
                      lastMonth={status.lastMonth ?? 11}
                    />
                    <YearTable
                      testID="year-expenses"
                      heading="Catégorie"
                      rows={withTotal(expenseGroups.map(groupRow))}
                      format={formatAmount}
                      showTotal
                    />
                  </>
                ) : (
                  <EmptyCard text="Aucune dépense cette année." />
                )}
              </Section>

              <Section title="Budgets · prévu et réalisé">
                {budgetYear && budgetYear.budgets.length > 0 ? (
                  <BudgetSection key={year} overview={budgetYear} />
                ) : (
                  <View style={[styles.card, styles.emptyYear]}>
                    <Text style={[textStyle('bodyMd'), styles.mute, styles.centered]}>Aucun budget suivi cette année.</Text>
                    <Button label="Créer un budget" variant="ghost" onPress={onCreateBudget} />
                  </View>
                )}
              </Section>

              <Section title="Recettes par catégorie">
                {incomeRows.length > 0 ? (
                  <YearTable
                    testID="year-income"
                    heading="Catégorie"
                    rows={withTotal(incomeRows)}
                    format={formatAmount}
                    showTotal
                  />
                ) : (
                  <EmptyCard text="Aucune recette cette année." />
                )}
              </Section>

              {/* §6.7 suggests the net monthly change here; #25 asked for the number of operations, kept until decided. */}
              <Section title="Opérations par compte">
                {countRows.length > 0 ? (
                  <YearTable
                    testID="year-counts"
                    heading="Opérations"
                    rows={countRows}
                    format={String}
                    showTotal
                  />
                ) : (
                  <EmptyCard text="Aucun compte pour l’instant." />
                )}
              </Section>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** The Bilan compares its budgets one at a time, picked from chips at the top of the card. */
function BudgetSection({ overview }: { overview: BudgetYearOverview }) {
  const [budgetId, setBudgetId] = useState(overview.budgets[0].budget.id);
  const shown = overview.budgets.find((b) => b.budget.id === budgetId) ?? overview.budgets[0];
  return (
    <BudgetYearChart
      key={shown.budget.id}
      testID="budget-year"
      budgetYear={shown}
      lastMonth={overview.lastMonth}
      controls={
        <Chips
          scroll
          value={shown.budget.id}
          onChange={setBudgetId}
          options={overview.budgets.map(({ budget }) => ({ value: budget.id, label: budget.categoryName }))}
        />
      }
    />
  );
}

/** « Année en cours · réalisé jusqu’à fin septembre » under the selector. */
function yearNote({ lastMonth, currentYear }: YearStatus, year: number): string {
  if (year < currentYear) return 'Année complète';
  if (lastMonth === null) return 'Année à venir';
  return `Année en cours · réalisé jusqu’à fin ${monthName(lastMonth).toLowerCase()}`;
}

function groupRow(group: ExpenseGroup): YearTableRow {
  return { key: group.key, label: group.label, color: group.color, values: group.months, total: group.total };
}

/** Income categories largest first, coloured by rank like the spending ones. */
function rankedIncomeRows(flows: CategoryYearFlow[]): YearTableRow[] {
  return flows
    .filter((f) => f.totalIncome > 0)
    .sort((a, b) => b.totalIncome - a.totalIncome)
    .map((f, rank) => {
      const label = f.categoryName ?? 'Sans catégorie';
      return {
        key: f.categoryName === null ? 'uncategorized' : label,
        label,
        color: f.categoryName === null ? colors.chartSansCategorie : chartColor(CHART_CATEGORY_COLORS, rank),
        values: f.income,
        total: f.totalIncome,
      };
    });
}

/** Appends the Total line, month by month and for the year. */
function withTotal(rows: YearTableRow[]): YearTableRow[] {
  const cents = (n: number) => Math.round(n * 100) / 100;
  return [
    ...rows,
    {
      key: 'total',
      label: 'Total',
      bold: true,
      values: Array.from({ length: 12 }, (_, m) => cents(rows.reduce((sum, row) => sum + row.values[m], 0))),
      total: cents(rows.reduce((sum, row) => sum + (row.total ?? 0), 0)),
    },
  ];
}

function YearArrow({
  label,
  glyph,
  enabled,
  onPress,
}: {
  label: string;
  glyph: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={styles.arrow}
    >
      <Text style={[textStyle('headingLg'), { color: enabled ? colors.mute : colors.faint }]}>{glyph}</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text accessibilityRole="header" style={[textStyle('headingSm'), styles.ink, styles.sectionTitle]}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={[styles.card, styles.emptyCard]}>
      <Text style={[textStyle('bodyMd'), styles.mute, styles.centered]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  yearSelector: {
    alignItems: 'center',
    paddingBottom: spacing.xxs,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  year: {
    color: colors.ink,
    minWidth: 64,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionBody: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
  },
  emptyYear: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyCard: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
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
  centered: {
    textAlign: 'center',
  },
});
