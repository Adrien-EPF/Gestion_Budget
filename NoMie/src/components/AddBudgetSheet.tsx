import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMonth } from '../navigation/MonthContext';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { parseMoneyInput } from '../utils/amountInput';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { TextField } from './TextField';

const CATEGORY_REQUIRED = 'Choisis la catégorie à suivre.';
const AMOUNT_INVALID = 'Le montant prévu doit être un nombre supérieur à zéro, par exemple 120.';

/** « + Ajouter un budget » — one monthly ceiling per category (#3 story 46). */
export function AddBudgetSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AddBudgetForm onClose={onClose} />
    </BottomSheet>
  );
}

function AddBudgetForm({ onClose }: { onClose: () => void }) {
  const dataService = useDataService();
  const { year, month } = useMonth();
  const categories = useServiceQuery((s) => s.listCategoriesWithoutBudget());

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const submit = async () => {
    const ceiling = parseMoneyInput(amount);
    const amountOk = ceiling !== null && ceiling > 0;
    setCategoryError(categoryId === null ? CATEGORY_REQUIRED : null);
    setAmountError(amountOk ? null : AMOUNT_INVALID);
    if (categoryId === null || !amountOk) return;

    // The budget starts in the month being looked at, so it shows up right where it was added.
    await dataService.createBudget({ categoryId, amount: ceiling, startMonth: { year, month } });
    onClose();
  };

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Nouveau budget</Text>

      <View style={styles.field}>
        <Text style={[textStyle('caption'), styles.label]}>Catégorie</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroll}
        >
          {(categories ?? []).map((category) => {
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
                  style={[textStyle('bodySm'), { color: selected ? colors.onPrimary : colors.ink }]}
                >
                  {category.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {categoryError ? <Text style={[textStyle('bodySm'), styles.error]}>{categoryError}</Text> : null}
        {categories && categories.length === 0 ? (
          <Text style={[textStyle('bodySm'), styles.hint]}>
            Toutes les catégories de dépense ont déjà leur budget.
          </Text>
        ) : null}
      </View>

      <TextField
        label="Montant prévu par mois"
        value={amount}
        onChangeText={setAmount}
        placeholder="120"
        keyboardType="numbers-and-punctuation"
        error={amountError}
      />

      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button label="Ajouter" onPress={submit} style={styles.grow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
  },
  field: {
    gap: spacing.xxs,
  },
  label: {
    color: colors.ash,
  },
  chipsScroll: {
    flexGrow: 0,
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
  error: {
    color: colors.amountNegative,
  },
  hint: {
    color: colors.ash,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  grow: {
    flex: 1,
  },
});
