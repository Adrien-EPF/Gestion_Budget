import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, fontFamilies, rounded, spacing, textStyle } from '../theme/tokens';
import { applyKey, parseAmountText, type KeypadKey } from '../utils/amountInput';
import { toIsoDate } from '../utils/dates';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

const KEYPAD_ROWS: { key: KeypadKey; label: string; accessibilityLabel: string }[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
].map((row) =>
  row.map((key) => ({
    key: key as KeypadKey,
    label: key === 'backspace' ? '←' : key,
    accessibilityLabel: key === ',' ? 'Virgule' : key === 'backspace' ? 'Effacer' : key,
  }))
);

interface QuickEntrySheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Quick-entry bottom sheet opened by the FAB (handoff §6.6). */
export function QuickEntrySheet({ visible, onClose }: QuickEntrySheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <QuickEntryForm onClose={onClose} />
    </BottomSheet>
  );
}

function QuickEntryForm({ onClose }: { onClose: () => void }) {
  const dataService = useDataService();
  const categories = useServiceQuery((s) => s.listCategories());
  const currentAccount = useServiceQuery((s) => s.getCurrentAccount());

  const [amountText, setAmountText] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const kind = isExpense ? 'expense' : 'income';
  const visibleCategories = (categories ?? []).filter(
    (c) => !c.hidden && (c.kind === kind || c.kind === 'both')
  );
  const noAccountYet = currentAccount === null;

  const toggleSign = () => {
    setIsExpense((expense) => !expense);
    // A category only fits one direction; keep the choice only if it fits the new one.
    setCategoryId(null);
  };

  const save = async () => {
    const value = parseAmountText(amountText);
    const account = await dataService.getCurrentAccount();
    // Nothing typed (or nowhere to put it) is a cancelled entry, not an error.
    if (value === 0 || !account) {
      onClose();
      return;
    }
    await dataService.createTransaction({
      accountId: account.id,
      operationDate: toIsoDate(new Date()),
      amount: isExpense ? -value : value,
      categoryId,
    });
    onClose();
  };

  const amountColor = isExpense ? colors.amountNegative : colors.amountPositive;

  return (
    <View>
      <Text style={[textStyle('headingMd'), styles.title]}>Nouvelle opération</Text>

      <View style={styles.amountRow}>
        <Text
          testID="quick-entry-amount"
          style={[styles.amount, { color: amountColor }]}
          numberOfLines={1}
        >
          {`${isExpense ? '−' : '+'}${amountText === '' ? '0' : amountText}`}
        </Text>
        <Text style={styles.currency}>€</Text>
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Basculer dépense ou recette"
          onPress={toggleSign}
          style={styles.signToggle}
        >
          <Text style={[textStyle('bodySm'), { color: colors.link }]}>
            {isExpense ? 'Dépense' : 'Recette'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.keypad}>
        {KEYPAD_ROWS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map(({ key, label, accessibilityLabel }) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                onPress={() => setAmountText((text) => applyKey(text, key))}
                style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.surfaceSoft }]}
              >
                <Text style={styles.keyLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {visibleCategories.map((category) => {
          const selected = category.id === categoryId;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={category.name}
              accessibilityState={{ selected }}
              onPress={() => setCategoryId(selected ? null : category.id)}
              style={[styles.chip, selected && { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  textStyle('bodySm'),
                  { color: selected ? colors.onPrimary : colors.ink },
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button
          label="Enregistrer"
          disabled={noAccountYet}
          onPress={save}
          style={styles.saveButton}
        />
      </View>

      <Text style={[textStyle('bodySm'), styles.hint]}>
        {noAccountYet
          ? 'Crée d’abord un compte dans l’onglet Comptes pour enregistrer une opération.'
          : 'Tu peux répartir le montant sur plusieurs catégories après l’enregistrement.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fontFamilies.bold,
    fontVariant: ['tabular-nums'],
  },
  currency: {
    fontSize: 20,
    fontFamily: fontFamilies.semiBold,
    color: colors.ash,
  },
  spacer: {
    flex: 1,
  },
  signToggle: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  keypad: {
    gap: spacing.xs,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  key: {
    flex: 1,
    height: 48,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    fontSize: 18,
    fontFamily: fontFamilies.semiBold,
    color: colors.ink,
  },
  chipsScroll: {
    flexGrow: 0,
    marginTop: spacing.sm,
  },
  chips: {
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  chip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  saveButton: {
    flex: 1,
  },
  hint: {
    color: colors.ash,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
