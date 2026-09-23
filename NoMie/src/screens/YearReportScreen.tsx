import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BalanceLineChart } from '../components/charts/BalanceLineChart';
import { BudgetComparisonChart } from '../components/charts/BudgetComparisonChart';
import { CategoryBreakdownChart } from '../components/charts/CategoryBreakdownChart';
import { Chips } from '../components/Chips';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import { YearTable, type YearTableRow } from '../components/YearTable';
import { monthName } from '../navigation/formatMonthLabel';
import {
  sumBalanceSeries,
  type AccountYearBalances,
  type BudgetYearOverview,
  type CategoryYearFlow,
} from '../services/dataService';
import { useServiceQuery } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { formatAmount } from '../utils/formatAmount';

interface YearReportScreenProps {
  /** The year Accueil was showing; the selector moves from there. */
  initialYear: number;
  onClose: () => void;
}

/**
 * Bilan annuel (#25) — the Bilan sheet of the old Excel, reached from
 * Accueil. A full-screen `Modal` owned by Accueil, like the Réglages
 * sub-screens, rather than a 6th tab. Each section shows its chart (#28)
 * above the month-by-month table it is drawn from.
 */
export function YearReportScreen({ initialYear, onClose }: YearReportScreenProps) {
  const [year, setYear] = useState(initialYear);
  const flows = useServiceQuery((s) => s.getCategoryFlowsByMonth(year), [year]);
  const counts = useServiceQuery((s) => s.getOperationCountsByMonth(year), [year]);
  const balances = useServiceQuery((s) => s.getBalanceSeries(year), [year]);
  const budgetYear = useServiceQuery((s) => s.getBudgetYearComparison(year), [year]);
  const [balanceAccountId, setBalanceAccountId] = useState<BalanceScope>(ALL_ACCOUNTS);

  const expenseRows = (flows ?? [])
    .filter((f) => f.totalExpenses > 0)
    .map((f) => flowRow(f, f.expenses, f.totalExpenses));
  const incomeRows = (flows ?? [])
    .filter((f) => f.totalIncome > 0)
    .map((f) => flowRow(f, f.income, f.totalIncome));
  const countRows: YearTableRow[] = (counts ?? []).map(({ account, counts: values, total }) => ({
    key: account.name,
    label: account.name,
    values,
    total,
  }));
  const balanceRows: YearTableRow[] = (balances ?? []).flatMap(({ account, real, pointed }) => [
    { key: `${account.name}-real`, label: `${account.name} · réel`, values: real },
    { key: `${account.name}-pointed`, label: `${account.name} · pointé`, values: pointed },
  ]);

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <ModalScreenHeader title="Bilan annuel" testID="year-report-title" onClose={onClose} />

        <View style={styles.yearSelector}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Année précédente"
            onPress={() => setYear((y) => y - 1)}
            style={styles.chevronButton}
          >
            <Text style={[textStyle('headingMd'), styles.chevron]}>‹</Text>
          </Pressable>
          <Text testID="year-report-year" style={[textStyle('headingMd'), styles.year]}>
            {String(year)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Année suivante"
            onPress={() => setYear((y) => y + 1)}
            style={styles.chevronButton}
          >
            <Text style={[textStyle('headingMd'), styles.chevron]}>›</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Section title="Dépenses par catégorie">
            {expenseRows.length > 0 ? (
              <>
                <CategoryBreakdownChart
                  testID="expense-breakdown"
                  items={expenseRows.map((row) => ({ label: row.label, amount: row.total ?? 0 }))}
                />
                <YearTable testID="year-expenses" rows={expenseRows} format={formatAmount} showTotal />
              </>
            ) : (
              <Note text="Aucune dépense cette année." />
            )}
          </Section>

          <Section title="Budget prévu et réalisé">
            {budgetYear && budgetYear.budgets.length > 0 ? (
              <>
                <Note text={periodLabel(budgetYear)} />
                <BudgetComparisonChart
                  testID="budget-comparison"
                  items={budgetYear.budgets.map(({ budget, ...comparison }) => ({
                    label: budget.categoryName,
                    ...comparison,
                  }))}
                />
              </>
            ) : (
              <Note text="Pas encore de budget à comparer sur cette année." />
            )}
          </Section>

          <Section title="Recettes par catégorie">
            {incomeRows.length > 0 ? (
              <YearTable testID="year-income" rows={incomeRows} format={formatAmount} showTotal />
            ) : (
              <Note text="Aucune recette cette année." />
            )}
          </Section>

          <Section title="Opérations par compte">
            {countRows.length > 0 ? (
              <YearTable testID="year-counts" rows={countRows} format={String} showTotal />
            ) : (
              <Note text="Aucun compte pour l’instant." />
            )}
          </Section>

          <Section title="Évolution du solde">
            {balances && balances.length > 0 ? (
              <>
                <BalanceChartSection
                  balances={balances}
                  accountId={balanceAccountId}
                  onAccountChange={setBalanceAccountId}
                />
                <YearTable testID="year-balances" rows={balanceRows} format={formatAmount} showZeros />
              </>
            ) : (
              <Note text="Aucun compte pour l’instant." />
            )}
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** « De janvier à septembre » while the year is under way; the whole year once it is over. */
function periodLabel({ lastMonth }: BudgetYearOverview): string {
  if (lastMonth === 11) return 'Sur toute l’année.';
  const last = monthName(lastMonth ?? 0).toLowerCase();
  return lastMonth === 0 ? `En ${last}, pour l’instant.` : `De janvier à ${last}, pour l’instant.`;
}

const ALL_ACCOUNTS = 'all';
/** What the balance curve shows: every account summed, or one account's id. */
type BalanceScope = number | typeof ALL_ACCOUNTS;

/**
 * Every account summed by default; chips narrow it to one account when
 * there are several. A chosen account missing from another year falls
 * back to the sum.
 */
function BalanceChartSection({
  balances,
  accountId,
  onAccountChange,
}: {
  balances: AccountYearBalances[];
  accountId: BalanceScope;
  onAccountChange: (accountId: BalanceScope) => void;
}) {
  const chosen = balances.find((b) => b.account.id === accountId);
  const { real, pointed } = chosen ?? sumBalanceSeries(balances);

  return (
    <>
      {balances.length > 1 && (
        <Chips
          scroll
          value={chosen ? chosen.account.id : ALL_ACCOUNTS}
          onChange={onAccountChange}
          options={[
            { value: ALL_ACCOUNTS, label: 'Tous les comptes' },
            ...balances.map((b) => ({ value: b.account.id, label: b.account.name })),
          ]}
        />
      )}
      <BalanceLineChart
        testID="balance-chart"
        real={real}
        pointed={pointed}
        subject={chosen ? chosen.account.name : 'tous les comptes'}
      />
    </>
  );
}

function flowRow(flow: CategoryYearFlow, values: number[], total: number): YearTableRow {
  const label = flow.categoryName ?? 'Sans catégorie';
  return { key: label, label, values, total };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[textStyle('headingSm'), styles.sectionTitle]}>{title}</Text>
      {children}
    </View>
  );
}

function Note({ text }: { text: string }) {
  return <Text style={[textStyle('bodyMd'), styles.note]}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  chevronButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    color: colors.mute,
  },
  year: {
    color: colors.ink,
    minWidth: 64,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
  },
  note: {
    color: colors.mute,
  },
});
