import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddRecurrenceSheet } from '../components/AddRecurrenceSheet';
import { Button } from '../components/Button';
import { OccurrenceSheet } from '../components/OccurrenceSheet';
import { RecurrenceCard } from '../components/RecurrenceCard';
import { Screen } from '../components/Screen';
import { TransactionRow } from '../components/TransactionRow';
import type { TransactionListItem } from '../services/dataService';
import { useServiceQuery } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';

/** Récurrences (handoff §6.4): the rules, each with its own opt-in, then what they will create. */
export function RecurrencesScreen() {
  const rules = useServiceQuery((s) => s.listRecurrenceRules());
  const occurrences = useServiceQuery((s) => s.listUpcomingOccurrences());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TransactionListItem | null>(null);

  if (!rules || !occurrences) return <Screen title="Récurrences">{null}</Screen>;

  return (
    <Screen title="Récurrences">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[textStyle('bodyMd'), styles.note]}>
          Les règles ne créent une opération automatiquement que si tu l’autorises. Sinon elles
          restent en attente de ta validation.
        </Text>

        {rules.map((rule) => (
          <RecurrenceCard key={rule.id} rule={rule} />
        ))}
        <Button label="+ Ajouter une règle" variant="ghost" onPress={() => setAdding(true)} />

        <View style={styles.section}>
          <Text style={[textStyle('headingMd'), styles.sectionTitle]}>Prochaines occurrences</Text>
          {occurrences.length > 0 ? (
            <View>
              {occurrences.map((occurrence, index) => (
                <TransactionRow
                  key={occurrence.id}
                  transaction={occurrence}
                  onPress={() => setEditing(occurrence)}
                  isFirst={index === 0}
                  isLast={index === occurrences.length - 1}
                />
              ))}
            </View>
          ) : (
            <Text style={[textStyle('bodySm'), styles.note]}>
              Rien de prévu pour le moment. Les occurrences apparaissent ici dès qu’une règle est en
              création automatique.
            </Text>
          )}
        </View>
      </ScrollView>

      <AddRecurrenceSheet visible={adding} onClose={() => setAdding(false)} />
      <OccurrenceSheet occurrence={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 116,
    gap: spacing.sm,
  },
  note: {
    color: colors.mute,
  },
  section: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
  },
});
