import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccountActionsSheet, AddAccountSheet } from '../components/AccountSheets';
import { Button } from '../components/Button';
import { Screen } from '../components/Screen';
import { TransactionRow } from '../components/TransactionRow';
import type { Account, AccountSummary, TransactionListItem } from '../services/dataService';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { formatLongDate, toIsoDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import type { TabScreenProps } from '../navigation/types';

/** Comptes (handoff §6.2): balances, one card per account, and the pointage queue. */
export function AccountsScreen({ route }: TabScreenProps<'Comptes'>) {
  const dataService = useDataService();
  const now = new Date();
  const [year, month] = [now.getFullYear(), now.getMonth()];

  const summaries = useServiceQuery((s) => s.listAccountSummaries({ year, month }), [year, month]);
  const totals = useServiceQuery((s) => s.getBalanceTotals());

  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [actingOn, setActingOn] = useState<Account | null>(null);

  const active = (summaries ?? []).filter((s) => !s.account.archived);
  const archived = (summaries ?? []).filter((s) => s.account.archived);
  // The chosen account may have been archived or deleted since; fall back to "Tous".
  const activeFilter = active.some((s) => s.account.id === filterAccountId) ? filterAccountId : null;

  const toPoint = useServiceQuery(
    (s) => s.listTransactionsToPoint(activeFilter === null ? undefined : { accountId: activeFilter }),
    [activeFilter]
  );

  // « n à pointer » on Accueil lands here: scroll to the section once its position is known.
  const listRef = useRef<FlatList<TransactionListItem>>(null);
  const [toPointY, setToPointY] = useState<number | null>(null);
  const handledScroll = useRef<number | undefined>(undefined);
  const scrollToken = route.params?.scrollToToPoint;
  useEffect(() => {
    if (scrollToken === undefined || toPointY === null || handledScroll.current === scrollToken) {
      return;
    }
    handledScroll.current = scrollToken;
    listRef.current?.scrollToOffset({ offset: toPointY, animated: true });
  }, [scrollToken, toPointY]);

  if (!summaries || !totals) return <Screen title="Comptes">{null}</Screen>;

  const rows = toPoint ?? [];

  const header = (
    <View>
      <View style={styles.hero}>
        <Text style={[textStyle('bodySm'), styles.heroLabel]}>Solde total</Text>
        <Text testID="accounts-total-real" style={[textStyle('displayLg'), styles.heroAmount]}>
          {formatAmount(totals.realBalance)}
        </Text>
        <Text testID="accounts-total-pointed" style={[textStyle('bodySm'), styles.heroPointed]}>
          {`Pointé ${formatAmount(totals.pointedBalance)}`}
        </Text>
      </View>

      <View style={styles.cards}>
        {active.length === 0 ? (
          <Text style={[textStyle('bodyMd'), styles.note]}>
            Ajoute ton premier compte pour commencer.
          </Text>
        ) : (
          active.map((summary) => (
            <AccountCard
              key={summary.account.id}
              summary={summary}
              onOpenActions={() => setActingOn(summary.account)}
            />
          ))
        )}
        <Button label="+ Ajouter un compte" variant="ghost" onPress={() => setAdding(true)} />
      </View>

      <View style={styles.sectionHeader} onLayout={(e) => setToPointY(e.nativeEvent.layout.y)}>
        <Text style={[textStyle('headingMd'), styles.sectionTitle]}>À pointer</Text>
        {active.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            <FilterChip label="Tous" selected={activeFilter === null} onPress={() => setFilterAccountId(null)} />
            {active.map(({ account }) => (
              <FilterChip
                key={account.id}
                label={account.name}
                selected={activeFilter === account.id}
                onPress={() => setFilterAccountId(account.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );

  const footer = (
    <View>
      <Text style={[textStyle('bodySm'), styles.note, styles.toPointNote]}>
        {rows.length > 0
          ? 'À faire quand ton relevé arrive, pas avant.'
          : 'Tout est pointé, rien à faire de ce côté.'}
      </Text>
      {archived.length > 0 ? (
        <View style={styles.archived}>
          <Text style={[textStyle('headingSm'), styles.archivedTitle]}>Archivés</Text>
          {archived.map(({ account, realBalance }) => (
            <View key={account.id} style={styles.archivedCard}>
              <View style={styles.archivedText}>
                <Text style={[textStyle('bodyMdMedium'), styles.archivedName]}>{account.name}</Text>
                <Text style={[textStyle('bodySm'), styles.archivedMeta]}>
                  Archivé · historique conservé
                </Text>
              </View>
              <Text style={[textStyle('amountSm'), styles.archivedBalance]}>
                {formatAmount(realBalance)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen title="Comptes">
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => (
          <View style={styles.rowWrapper}>
            <TransactionRow
              transaction={item}
              toPointTone
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              onPress={() => dataService.setPointed(item.id, true)}
            />
          </View>
        )}
      />
      <AddAccountSheet visible={adding} onClose={() => setAdding(false)} />
      <AccountActionsSheet account={actingOn} onClose={() => setActingOn(null)} />
    </Screen>
  );
}

function AccountCard({
  summary,
  onOpenActions,
}: {
  summary: AccountSummary;
  onOpenActions: () => void;
}) {
  const { account, realBalance, pointedBalance, monthOperationCount } = summary;
  const created = formatLongDate(toIsoDate(new Date(account.createdAt)));

  return (
    <Pressable
      accessibilityLabel={`Compte ${account.name}`}
      onLongPress={onOpenActions}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.dot} />
        <Text style={[textStyle('headingSm'), styles.cardName]} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={[textStyle('bodySm'), styles.cardCount]}>
          {monthOperationCount === 0
            ? 'Aucune opération ce mois-ci'
            : `${monthOperationCount} opération${monthOperationCount > 1 ? 's' : ''} ce mois-ci`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Actions du compte ${account.name}`}
          hitSlop={8}
          onPress={onOpenActions}
          style={styles.moreButton}
        >
          <Text style={[textStyle('bodyLg'), styles.moreGlyph]}>⋯</Text>
        </Pressable>
      </View>

      <View style={styles.balances}>
        <View style={styles.balanceColumn}>
          <Text style={[textStyle('caption'), styles.balanceLabel]}>Réel</Text>
          <Text style={[textStyle('amountLg'), { color: colors.ink }]}>{formatAmount(realBalance)}</Text>
        </View>
        <View style={styles.balanceColumn}>
          <Text style={[textStyle('caption'), styles.balanceLabel]}>Pointé</Text>
          <Text style={[textStyle('amountLg'), { color: colors.primary }]}>
            {formatAmount(pointedBalance)}
          </Text>
        </View>
      </View>

      <Text style={[textStyle('bodySm'), styles.cardInfo]}>
        {`Solde initial ${formatAmount(account.initialBalance)} · créé le ${created}`}
      </Text>
    </Pressable>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtre ${label}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filterChip, selected && { backgroundColor: colors.primary }]}
    >
      <Text style={[textStyle('bodySm'), { color: selected ? colors.onPrimary : colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
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
  heroPointed: {
    color: colors.mute,
  },
  cards: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  note: {
    color: colors.mute,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  cardName: {
    color: colors.ink,
    flexShrink: 1,
    flexGrow: 1,
  },
  cardCount: {
    color: colors.ash,
    flexShrink: 1,
  },
  moreButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreGlyph: {
    color: colors.mute,
  },
  balances: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  balanceColumn: {
    flex: 1,
    gap: 2,
  },
  balanceLabel: {
    color: colors.ash,
  },
  cardInfo: {
    color: colors.mute,
  },
  sectionHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.ink,
    paddingHorizontal: spacing.md,
  },
  filterChips: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  rowWrapper: {
    marginHorizontal: spacing.md,
  },
  toPointNote: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  archived: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.xs,
  },
  archivedTitle: {
    color: colors.mute,
  },
  archivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  archivedText: {
    flexShrink: 1,
  },
  archivedName: {
    color: colors.mute,
  },
  archivedMeta: {
    color: colors.ash,
  },
  archivedBalance: {
    color: colors.mute,
  },
});
