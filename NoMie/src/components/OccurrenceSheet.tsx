import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TransactionListItem } from '../services/dataService';
import { useDataService } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { parseMoneyInput, toMoneyInput } from '../utils/amountInput';
import { parseTypedDate, toTypedDate } from '../utils/dates';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { TextField } from './TextField';

const AMOUNT_INVALID = 'Le montant doit être un nombre différent de zéro, par exemple −780.';
const DATE_INVALID = 'La date attendue ressemble à 05/10/2026.';

interface OccurrenceSheetProps {
  /** The occurrence being edited; the sheet is open exactly while this is set. */
  occurrence: TransactionListItem | null;
  onClose: () => void;
}

/**
 * Edit or delete one generated occurrence (#3 story 53). It changes that
 * transaction only — the rule and the other occurrences are untouched.
 */
export function OccurrenceSheet({ occurrence, onClose }: OccurrenceSheetProps) {
  return (
    <BottomSheet visible={occurrence !== null} onClose={onClose}>
      {occurrence ? <OccurrenceForm occurrence={occurrence} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function OccurrenceForm({
  occurrence,
  onClose,
}: {
  occurrence: TransactionListItem;
  onClose: () => void;
}) {
  const dataService = useDataService();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [amount, setAmount] = useState(toMoneyInput(occurrence.amount));
  const [date, setDate] = useState(toTypedDate(occurrence.operationDate));
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const label = occurrence.comment || occurrence.categoryName || 'Opération';

  const save = async () => {
    const value = parseMoneyInput(amount);
    const operationDate = parseTypedDate(date);
    setAmountError(value === null || value === 0 ? AMOUNT_INVALID : null);
    setDateError(operationDate === null ? DATE_INVALID : null);
    if (value === null || value === 0 || operationDate === null) return;

    await dataService.updateOccurrence(occurrence.id, { amount: value, operationDate });
    onClose();
  };

  const remove = async () => {
    await dataService.deleteOccurrence(occurrence.id);
    onClose();
  };

  if (confirmingDelete) {
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>{`Supprimer « ${label} » ?`}</Text>
        <Text style={[textStyle('bodyMd'), styles.body]}>
          Seule cette occurrence disparaît. La règle reste telle quelle et continue de créer les suivantes.
        </Text>
        <View style={styles.actions}>
          <Button label="Retour" variant="secondary" onPress={() => setConfirmingDelete(false)} />
          <Button label="Supprimer l’occurrence" onPress={remove} style={styles.grow} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>{label}</Text>
      <Text style={[textStyle('bodySm'), styles.body]}>
        Ce que tu changes ici ne concerne que cette occurrence, pas la règle.
      </Text>
      <TextField
        label="Montant de l’occurrence"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numbers-and-punctuation"
        error={amountError}
      />
      <TextField
        label="Date de l’occurrence"
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        error={dateError}
      />
      <View style={styles.actions}>
        <Button label="Supprimer" variant="secondary" onPress={() => setConfirmingDelete(true)} />
        <Button label="Enregistrer" onPress={save} style={styles.grow} />
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
  body: {
    color: colors.mute,
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
