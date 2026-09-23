import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import { YearTable, type YearTableRow } from '../components/YearTable';
import type { CategoryYearFlow } from '../services/dataService';
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
 * sub-screens, rather than a 6th tab. Charts come later (#28, #29); this
 * screen holds the figures as month-by-month tables.
 */
export function YearReportScreen({ initialYear, onClose }: YearReportScreenProps) {
  const [year, setYear] = useState(initialYear);
  const flows = useServiceQuery((s) => s.getCategoryFlowsByMonth(year), [year]);
  const counts = useServiceQuery((s) => s.getOperationCountsByMonth(year), [year]);
  const balances = useServiceQuery((s) => s.getBalanceSeries(year), [year]);

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
              <YearTable testID="year-expenses" rows={expenseRows} format={formatAmount} showTotal />
            ) : (
              <Note text="Aucune dépense cette année." />
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

          <Section title="Soldes en fin de mois">
            {balanceRows.length > 0 ? (
              <YearTable testID="year-balances" rows={balanceRows} format={formatAmount} showZeros />
            ) : (
              <Note text="Aucun compte pour l’instant." />
            )}
          </Section>
        </ScrollView>
      </View>
    </Modal>
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
