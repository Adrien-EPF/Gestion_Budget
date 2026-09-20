import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RecurrenceRuleItem } from '../services/dataService';
import { useDataService } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { formatAmount } from '../utils/formatAmount';
import { describeAutomation, describeFrequency } from '../utils/recurrenceCopy';
import { Switch } from './Switch';

/** One recurrence rule (handoff §6.4): what it is, and its explicit opt-in to automatic creation. */
export function RecurrenceCard({ rule }: { rule: RecurrenceRuleItem }) {
  const dataService = useDataService();
  const { label, hint } = describeAutomation(rule);
  const chips = [
    describeFrequency(rule.frequency, rule.referenceDate),
    rule.accountName,
    rule.categoryName,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[textStyle('headingSm'), styles.name]} numberOfLines={1}>
          {rule.name}
        </Text>
        <Text
          style={[
            textStyle('amountLg'),
            styles.amount,
            { color: rule.amount < 0 ? colors.amountNegative : colors.amountPositive },
          ]}
        >
          {formatAmount(rule.amount, { signed: true })}
        </Text>
      </View>

      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={[textStyle('bodySm'), styles.chipText]}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.automationRow}>
        <View style={styles.automationText}>
          <Text style={[textStyle('bodyMdMedium'), styles.automationLabel]}>{label}</Text>
          <Text style={[textStyle('bodySm'), styles.automationHint]}>{hint}</Text>
        </View>
        <Switch
          value={rule.automatic}
          onValueChange={(automatic) => dataService.setRecurrenceAutomatic(rule.id, automatic)}
          accessibilityLabel={`Création automatique, ${rule.name}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
    gap: spacing.sm,
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
  amount: {
    fontVariant: ['tabular-nums'],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    color: colors.body,
  },
  automationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  automationText: {
    flex: 1,
    gap: 2,
  },
  automationLabel: {
    color: colors.ink,
  },
  automationHint: {
    color: colors.ash,
  },
});
