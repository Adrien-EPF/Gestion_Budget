import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import { ReimbursementSheet } from '../components/ReimbursementSheet';
import type { PendingAdvance } from '../services/dataService';
import { useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, shadows, spacing, textStyle } from '../theme/tokens';
import { formatLongDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';

interface PendingAdvancesScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Avances en attente, reached from Réglages > Structure (#21, #27, #45) — a
 * full-screen `Modal` owned by Réglages, like `CategoriesScreen`. Every
 * operation or portion marked Avancé and still waiting, newest first; « Remboursé »
 * opens the reimbursement sheet, and confirming it drops the advance here, on Accueil's `AdvancesCard` and out of the
 * pending total, all through the data service's change notifications.
 */
export function PendingAdvancesScreen({ visible, onClose }: PendingAdvancesScreenProps) {
  const [reimbursing, setReimbursing] = useState<PendingAdvance | null>(null);
  const advances = useServiceQuery((s) => s.listPendingAdvances());
  const list = advances ?? [];

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <ModalScreenHeader title="Avances en attente" testID="advances-title" onClose={onClose} />

        {list.length === 0 ? (
          <EmptyState message="Aucune avance en attente." />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {list.map((advance) => (
              <View key={'splitId' in advance.ref ? `s${advance.ref.splitId}` : `t${advance.ref.transactionId}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[textStyle('headingSm'), styles.cardTitle]} numberOfLines={1}>
                    {advance.categoryName ?? 'Sans catégorie'}
                  </Text>
                  <Text style={[textStyle('amountLg'), styles.cardAmount]}>
                    {formatAmount(advance.amount)}
                  </Text>
                </View>
                <Text style={[textStyle('bodySm'), styles.cardMeta]}>
                  {`${advance.accountName} · ${formatLongDate(advance.operationDate)}`}
                </Text>
                <Button
                  label="Remboursé"
                  variant="secondary"
                  onPress={() => setReimbursing(advance)}
                />
              </View>
            ))}
          </ScrollView>
        )}
        <ReimbursementSheet advance={reimbursing} onClose={() => setReimbursing(null)} />
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
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    ...shadows.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.ink,
    flexShrink: 1,
  },
  cardAmount: {
    color: colors.advance,
    fontVariant: ['tabular-nums'],
  },
  cardMeta: {
    color: colors.ash,
  },
});
