import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import type { RecurrenceFrequency } from '../services/dataService';
import { TRANSFER_CATEGORY_NAME } from '../data/defaultCategories';
import { colors, spacing, textStyle } from '../theme/tokens';
import { parseMoneyInput } from '../utils/amountInput';
import { parseTypedDate, toIsoDate, toTypedDate } from '../utils/dates';
import { FREQUENCY_LABELS } from '../utils/recurrenceCopy';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chips, type ChipOption } from './Chips';
import { TextField } from './TextField';

const NAME_REQUIRED = 'Donne un nom à cette règle, par exemple Loyer.';
const AMOUNT_INVALID = 'Le montant doit être un nombre différent de zéro, par exemple 780.';
const ACCOUNT_REQUIRED = 'Choisis le compte concerné.';
const DATE_INVALID = 'La date attendue ressemble à 05/10/2026.';

type Direction = 'expense' | 'income';

const DIRECTIONS: ChipOption<Direction>[] = [
  { value: 'expense', label: 'Dépense' },
  { value: 'income', label: 'Recette' },
];

const FREQUENCIES: ChipOption<RecurrenceFrequency>[] = (
  ['monthly', 'weekly', 'yearly'] as const
).map((value) => ({ value, label: FREQUENCY_LABELS[value] }));

/**
 * « + Ajouter une règle » (#3 story 51). A new rule is always created on
 * manual: automation is switched on afterwards, on its card, on purpose.
 */
export function AddRecurrenceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AddRecurrenceForm onClose={onClose} />
    </BottomSheet>
  );
}

function AddRecurrenceForm({ onClose }: { onClose: () => void }) {
  const dataService = useDataService();
  const { height } = useWindowDimensions();
  const accounts = useServiceQuery((s) => s.listAccounts({ includeArchived: false }));
  const categories = useServiceQuery((s) => s.listCategories());

  const [name, setName] = useState('');
  const [direction, setDirection] = useState<Direction>('expense');
  const [amount, setAmount] = useState('');
  const [pickedAccountId, setPickedAccountId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [date, setDate] = useState(toTypedDate(toIsoDate(new Date())));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Until one is picked, the rule goes on the oldest active account, like a quick entry.
  const accountId = pickedAccountId ?? accounts?.[0]?.id ?? null;

  const usableCategories = (categories ?? []).filter(
    (c) =>
      !c.hidden &&
      c.name !== TRANSFER_CATEGORY_NAME &&
      (c.kind === 'both' || c.kind === direction)
  );

  const changeDirection = (next: Direction) => {
    setDirection(next);
    const current = categories?.find((c) => c.id === categoryId);
    if (current && current.kind !== 'both' && current.kind !== next) setCategoryId(null);
  };

  const submit = async () => {
    const trimmed = name.trim();
    const value = parseMoneyInput(amount);
    const referenceDate = parseTypedDate(date);
    const next = {
      name: trimmed === '' ? NAME_REQUIRED : null,
      amount: value === null || value === 0 ? AMOUNT_INVALID : null,
      account: accountId === null ? ACCOUNT_REQUIRED : null,
      date: referenceDate === null ? DATE_INVALID : null,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    await dataService.createRecurrenceRule({
      name: trimmed,
      accountId: accountId as number,
      amount: direction === 'expense' ? -Math.abs(value as number) : Math.abs(value as number),
      categoryId,
      frequency,
      referenceDate: referenceDate as string,
    });
    onClose();
  };

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Nouvelle règle</Text>
      <ScrollView
        style={[styles.scroll, { maxHeight: height * 0.62 }]}
        contentContainerStyle={styles.fields}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Nom de la règle"
          value={name}
          onChangeText={setName}
          placeholder="Loyer, Salaire…"
          error={errors.name}
        />

        <View style={styles.field}>
          <Text style={[textStyle('caption'), styles.label]}>Sens</Text>
          <Chips options={DIRECTIONS} value={direction} onChange={changeDirection} />
        </View>

        <TextField
          label="Montant"
          value={amount}
          onChangeText={setAmount}
          placeholder="780"
          keyboardType="numbers-and-punctuation"
          error={errors.amount}
        />

        <View style={styles.field}>
          <Text style={[textStyle('caption'), styles.label]}>Compte</Text>
          <Chips
            options={(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))}
            value={accountId}
            onChange={setPickedAccountId}
            scroll
          />
          {errors.account ? <Text style={[textStyle('bodySm'), styles.error]}>{errors.account}</Text> : null}
          {accounts && accounts.length === 0 ? (
            <Text style={[textStyle('bodySm'), styles.hint]}>
              Ajoute d’abord un compte dans l’onglet Comptes.
            </Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[textStyle('caption'), styles.label]}>Catégorie</Text>
          <Chips
            options={usableCategories.map((c) => ({ value: c.id, label: c.name }))}
            value={categoryId}
            onChange={(id) => setCategoryId(id === categoryId ? null : id)}
            scroll
          />
        </View>

        <View style={styles.field}>
          <Text style={[textStyle('caption'), styles.label]}>Fréquence</Text>
          <Chips options={FREQUENCIES} value={frequency} onChange={setFrequency} />
        </View>

        <TextField
          label="Date de référence"
          value={date}
          onChangeText={setDate}
          placeholder="05/10/2026"
          keyboardType="numbers-and-punctuation"
          error={errors.date}
        />
      </ScrollView>

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
    // Keyboard open, BottomSheet shrinks: the fields give up the room and scroll.
    flexShrink: 1,
  },
  scroll: {
    flexShrink: 1,
  },
  title: {
    color: colors.ink,
  },
  fields: {
    gap: spacing.sm,
  },
  field: {
    gap: spacing.xxs,
  },
  label: {
    color: colors.ash,
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
