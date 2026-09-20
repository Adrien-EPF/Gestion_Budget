import React from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { TransactionRow } from '../components/TransactionRow';
import { formatMonthLabel } from '../navigation/formatMonthLabel';
import { useMonth } from '../navigation/MonthContext';
import type { TabScreenProps } from '../navigation/types';
import type { MonthSummary } from '../services/dataService';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { dayOfMonth } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';

/** Accueil (handoff §6.1), base version: Budgets and Avances sections come with their own tickets. */
export function HomeScreen({ navigation }: TabScreenProps<'Accueil'>) {
  const dataService = useDataService();
  const { year, month } = useMonth();

  const totals = useServiceQuery((s) => s.getBalanceTotals());
  const toPointCount = useServiceQuery((s) => s.countToPoint());
  const summaries = useServiceQuery((s) => s.listAccountSummaries({ year, month }), [year, month]);
  const monthSummary = useServiceQuery((s) => s.getMonthSummary({ year, month }), [year, month]);
  const transactions = useServiceQuery((s) => s.listMonthTransactions({ year, month }), [year, month]);

  if (!totals || toPointCount === undefined || !summaries || !monthSummary || !transactions) {
    return <Screen title="NoMie" showMonthSelector>{null}</Screen>;
  }

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const activeAccounts = summaries.filter((s) => !s.account.archived);

  const header = (
    <View>
      <View style={styles.hero}>
        <Text style={[textStyle('bodySm'), styles.heroLabel]}>Solde réel · tous comptes</Text>
        <Text testID="home-total-real" style={[textStyle('displayLg'), styles.heroAmount]}>
          {formatAmount(totals.realBalance)}
        </Text>
        <View style={styles.heroMeta}>
          <Text testID="home-total-pointed" style={[textStyle('bodySm'), styles.heroPointed]}>
            {`Pointé ${formatAmount(totals.pointedBalance)}`}
          </Text>
          <View style={styles.separator} />
          {toPointCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${toPointCount} à pointer`}
              onPress={() => navigation.navigate('Comptes', { scrollToToPoint: Date.now() })}
              style={styles.badge}
            >
              <Text style={[textStyle('caption'), styles.badgeText]}>{`${toPointCount} à pointer`}</Text>
            </Pressable>
          ) : (
            <View style={styles.badge}>
              <Text style={[textStyle('caption'), styles.badgeText]}>Tout est pointé</Text>
            </View>
          )}
        </View>
      </View>

      {activeAccounts.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {activeAccounts.map(({ account, realBalance, pointedBalance }) => (
            <View key={account.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={styles.dot} />
                <Text style={[textStyle('amountSm'), styles.accountName]} numberOfLines={1}>
                  {account.name}
                </Text>
              </View>
              <Text style={[textStyle('amountLg'), styles.accountBalance]}>
                {formatAmount(realBalance)}
              </Text>
              <Text style={[textStyle('bodySm'), styles.accountPointed]}>
                {`Pointé ${formatAmount(pointedBalance)}`}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={[textStyle('bodyMd'), styles.note, styles.noAccountNote]}>
          Ajoute ton premier compte dans l’onglet Comptes pour commencer.
        </Text>
      )}

      <View style={styles.section}>
        <Text style={[textStyle('headingMd'), styles.sectionTitle]}>
          {isCurrentMonth ? 'Ce mois-ci' : formatMonthLabel(year, month)}
        </Text>
        <View style={styles.monthCard}>
          <View style={styles.monthColumn}>
            <Text style={[textStyle('caption'), styles.monthLabel]}>Dépenses</Text>
            <Text
              testID="home-month-expenses"
              style={[textStyle('amountLg'), { color: colors.amountNegative }]}
            >
              {formatAmount(monthSummary.expenses)}
            </Text>
          </View>
          <View style={styles.monthDivider} />
          <View style={styles.monthColumn}>
            <Text style={[textStyle('caption'), styles.monthLabel]}>Recettes</Text>
            <Text
              testID="home-month-income"
              style={[textStyle('amountLg'), { color: colors.amountPositive }]}
            >
              {formatAmount(monthSummary.income)}
            </Text>
          </View>
        </View>
        {monthSummary.forecastCount > 0 ? (
          <Text style={[textStyle('bodySm'), styles.note]}>{forecastNote(monthSummary)}</Text>
        ) : null}
      </View>

      <View style={styles.listHeader}>
        <Text style={[textStyle('headingMd'), styles.sectionTitle]}>Dernières opérations</Text>
        <Text style={[textStyle('bodySm'), styles.hint]}>Tape pour pointer</Text>
      </View>
    </View>
  );

  return (
    <Screen title="NoMie" showMonthSelector>
      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={[textStyle('bodyMd'), styles.note, styles.emptyNote]}>
            Aucune opération ce mois-ci.
          </Text>
        }
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => (
          <View style={styles.rowWrapper}>
            <TransactionRow
              transaction={item}
              isFirst={index === 0}
              isLast={index === transactions.length - 1}
              onPress={() => {
                // Prévision and Flux comptable never change by tap (handoff §7).
                if (item.status === 'non_pointe' || item.status === 'pointe') {
                  dataService.setPointed(item.id, item.status === 'non_pointe');
                }
              }}
            />
          </View>
        )}
      />
    </Screen>
  );
}

/**
 * Factual, never anxious (CONTEXT.md §10): explains why the real balance
 * can look higher than what the bank shows.
 */
function forecastNote({ forecastCount, firstForecast }: MonthSummary): string {
  if (forecastCount === 1 && firstForecast) {
    const label = firstForecast.comment ? `« ${firstForecast.comment} », ` : '';
    return `Une opération prévue (${label}le ${dayOfMonth(firstForecast.operationDate)}) est déjà comptée dans le solde réel, en Prévision.`;
  }
  return `${forecastCount} opérations prévues sont déjà comptées dans le solde réel, en Prévision.`;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 116,
  },
  hero: {
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxs,
  },
  heroLabel: {
    color: colors.ash,
  },
  heroAmount: {
    color: colors.ink,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  heroPointed: {
    color: colors.mute,
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: colors.faint,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    borderRadius: rounded.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: colors.primary,
  },
  carousel: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxs,
    gap: spacing.sm,
  },
  accountCard: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: 4,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  accountName: {
    color: colors.ink,
    flexShrink: 1,
  },
  accountBalance: {
    color: colors.ink,
  },
  accountPointed: {
    color: colors.ash,
  },
  noAccountNote: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
  },
  monthCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
  },
  monthColumn: {
    flex: 1,
    gap: 2,
  },
  monthDivider: {
    width: 1,
    backgroundColor: colors.hairline,
    marginHorizontal: spacing.md,
  },
  monthLabel: {
    color: colors.ash,
  },
  note: {
    color: colors.mute,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  hint: {
    color: colors.ash,
  },
  rowWrapper: {
    marginHorizontal: spacing.md,
  },
  emptyNote: {
    paddingHorizontal: spacing.md,
  },
});
