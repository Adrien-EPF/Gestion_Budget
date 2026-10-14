import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { BudgetYearChart } from '../components/charts/BudgetYearChart';
import { CategoryBreakdownChart } from '../components/charts/CategoryBreakdownChart';
import { groupExpenses } from '../components/charts/chartGeometry';
import { Chips } from '../components/Chips';
import { ImportanceBreakdownCard } from '../components/ImportanceBreakdownCard';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import { OffBalanceCard } from '../components/OffBalanceCard';
import { monthName } from '../navigation/formatMonthLabel';
import type { BudgetYearOverview, YearStatus } from '../services/dataService';
import { useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, shadows, spacing, textStyle } from '../theme/tokens';
import { formatAmount } from '../utils/formatAmount';

/** Past this many categories, the rest of the spending folds into « Autres ». */
const TOP_CATEGORIES = 6;

interface YearReportScreenProps {
  /** The year Accueil was showing; the selector moves from there. */
  initialYear: number;
  onClose: () => void;
}

/**
 * Bilan annuel (#25, #50) — the Bilan sheet of the old Excel, reached from Accueil, in
 * two sections like Accueil: Trésorerie (the balances) on top, Comptable (what was
 * spent and earned) below. A full-screen `Modal` owned by Accueil, like the Réglages
 * sub-screens, rather than a 6th tab.
 */
export function YearReportScreen({ initialYear, onClose }: YearReportScreenProps) {
  const [year, setYear] = useState(initialYear);
  const status = useServiceQuery((s) => s.getYearStatus(year), [year]);
  const flows = useServiceQuery((s) => s.getCategoryFlowsByMonth(year), [year]);
  const balances = useServiceQuery((s) => s.getYearBalances(year), [year]);
  const summary = useServiceQuery((s) => s.getYearSummary(year), [year]);
  const budgetYear = useServiceQuery((s) => s.getBudgetYear(year), [year]);
  const importanceShares = useServiceQuery((s) => s.getImportanceBreakdown({ year }), [year]);
  const offBalance = useServiceQuery((s) => s.getOffBalanceSummary({ year }), [year]);

  // The year Accueil was on stays reachable, even outside the years with data.
  const firstYear = Math.min(status?.firstYear ?? year, initialYear);
  const lastYear = Math.max(status?.currentYear ?? year, initialYear);
  const canGoBack = status !== undefined && year > firstYear;
  const canGoForward = status !== undefined && year < lastYear;

  const expenseGroups = groupExpenses(
    (flows ?? []).map((f) => ({ name: f.categoryName, months: f.expenses, total: f.totalExpenses })),
    TOP_CATEGORIES
  );

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View testID="year-report" style={styles.root}>
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
                Les soldes et les totaux apparaîtront dès la première opération saisie sur cette année.
              </Text>
              {canGoForward ? (
                <Button label={`Voir ${year + 1}`} variant="ghost" onPress={() => setYear(year + 1)} />
              ) : null}
            </View>
          ) : status ? (
            <>
              <Section title="Trésorerie" level="main">
                {balances && balances.accounts.length > 0 ? (
                  <View testID="year-treasury" style={styles.card}>
                    <Text style={[textStyle('bodySm'), styles.ash]}>
                      {year < status.currentYear ? `Au 31 décembre ${year}` : 'Aujourd’hui'}
                    </Text>
                    {balances.accounts.map(({ account, realBalance, pointedBalance }) => (
                      <BalanceLine
                        key={account.id}
                        testID={`year-treasury-account-${account.id}`}
                        label={account.name}
                        real={realBalance}
                        pointed={pointedBalance}
                      />
                    ))}
                    <View style={styles.divider} />
                    <BalanceLine
                      testID="year-treasury-total"
                      label="Total"
                      real={balances.total.realBalance}
                      pointed={balances.total.pointedBalance}
                      bold
                    />
                  </View>
                ) : (
                  <EmptyCard text="Aucun compte pour l’instant." />
                )}
              </Section>

              <Section title="Comptable" level="main">
                {summary ? (
                  <View testID="year-summary" style={[styles.card, styles.summary]}>
                    <SummaryFigure
                      testID="year-summary-expenses"
                      label="Dépenses"
                      amount={summary.expenses}
                      color={colors.amountNegative}
                    />
                    <SummaryFigure
                      testID="year-summary-income"
                      label="Recettes"
                      amount={summary.income}
                      color={colors.amountPositive}
                    />
                    <SummaryFigure
                      testID="year-summary-average"
                      label="Dépenses par mois"
                      amount={summary.monthlyAverage}
                      color={colors.ink}
                    />
                  </View>
                ) : null}

                <Section title="Dépenses par importance">
                  {importanceShares && importanceShares.some((share) => share.amount > 0) ? (
                    <ImportanceBreakdownCard testID="year-importance" shares={importanceShares} />
                  ) : (
                    <EmptyCard text="Rien à répartir cette année." />
                  )}
                </Section>

                <Section title="Dépenses par catégorie">
                  {expenseGroups.length > 0 ? (
                    <CategoryBreakdownChart
                      key={year}
                      testID="expense-breakdown"
                      year={year}
                      groups={expenseGroups}
                      lastMonth={status.lastMonth ?? 11}
                    />
                  ) : (
                    <EmptyCard text="Aucune dépense cette année." />
                  )}
                </Section>

                {budgetYear && budgetYear.budgets.length > 0 ? (
                  <Section title="Budgets · prévu et réalisé">
                    <BudgetSection key={year} overview={budgetYear} />
                  </Section>
                ) : null}

                {offBalance && offBalance.advances + offBalance.reimbursements + offBalance.transfers + offBalance.others > 0 ? (
                  <Section title="Hors bilan">
                    <OffBalanceCard testID="year-off-balance" summary={offBalance} />
                  </Section>
                ) : null}
              </Section>
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** One account (or the total): its réel balance, and the pointé one in a quieter line. */
function BalanceLine({
  testID,
  label,
  real,
  pointed,
  bold = false,
}: {
  testID: string;
  label: string;
  real: number;
  pointed: number;
  bold?: boolean;
}) {
  return (
    <View testID={testID} style={styles.balanceLine}>
      <Text numberOfLines={1} style={[textStyle(bold ? 'bodyMdMedium' : 'bodyMd'), styles.ink, styles.balanceName]}>
        {label}
      </Text>
      <View style={styles.balanceAmounts}>
        <Text style={[textStyle('amountSm'), styles.ink]}>{formatAmount(real)}</Text>
        <Text style={[textStyle('bodySm'), styles.ash]}>{`Pointé ${formatAmount(pointed)}`}</Text>
      </View>
    </View>
  );
}

function SummaryFigure({ testID, label, amount, color }: { testID: string; label: string; amount: number; color: string }) {
  return (
    <View style={styles.figure}>
      <Text style={[textStyle('caption'), styles.ash]}>{label}</Text>
      <Text testID={testID} style={[textStyle('amountSm'), { color }]}>
        {formatAmount(amount)}
      </Text>
    </View>
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
          options={overview.budgets.map(({ budget }) => ({ value: budget.id, label: budget.name }))}
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

function Section({
  title,
  level = 'sub',
  children,
}: {
  title: string;
  /** « main »: Trésorerie and Comptable; « sub »: a block inside one of them. */
  level?: 'main' | 'sub';
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[textStyle(level === 'main' ? 'headingMd' : 'headingSm'), styles.ink, styles.sectionTitle]}
      >
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
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginVertical: spacing.xxs,
  },
  balanceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  balanceName: {
    flex: 1,
  },
  balanceAmounts: {
    alignItems: 'flex-end',
  },
  summary: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  figure: {
    flex: 1,
    gap: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    ...shadows.card,
    padding: spacing.lg,
    gap: spacing.xs,
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
