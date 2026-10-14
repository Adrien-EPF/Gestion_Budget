import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PendingAdvance } from '../services/dataService';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { parseMoneyInput, toMoneyInput } from '../utils/amountInput';
import { formatNumericDate, parseNumericDate, toIsoDate } from '../utils/dates';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chips } from './Chips';
import { TextField } from './TextField';

interface ReimbursementSheetProps {
  /** The advance being paid back; the sheet is open exactly while this is set. */
  advance: PendingAdvance | null;
  onClose: () => void;
}

/**
 * « Remboursé » (#45): the income received, with the account, the date and
 * the amount proposed from the advance and all editable. No partial payment:
 * confirming settles the advance, whatever the amount.
 */
export function ReimbursementSheet({ advance, onClose }: ReimbursementSheetProps) {
  return (
    <BottomSheet visible={advance !== null} onClose={onClose}>
      {advance ? <ReimbursementForm advance={advance} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function ReimbursementForm({ advance, onClose }: { advance: PendingAdvance; onClose: () => void }) {
  const dataService = useDataService();
  const accounts = useServiceQuery((s) => s.listAccounts());
  const [accountId, setAccountId] = useState(advance.accountId);
  const [dateText, setDateText] = useState(formatNumericDate(toIsoDate(dataService.now())));
  const [amountText, setAmountText] = useState(toMoneyInput(advance.amount));

  const date = parseNumericDate(dateText);
  const amount = parseMoneyInput(amountText);
  const valid = date !== null && amount !== null && amount > 0;

  const confirm = async () => {
    if (!valid) return;
    await dataService.markAdvanceReimbursed(advance.ref, { accountId, date, amount });
    onClose();
  };

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Remboursement reçu</Text>
      <Text style={[textStyle('bodySm'), styles.note]}>
        Cette recette reste hors bilan : elle n’est pas un revenu.
      </Text>
      <Chips
        options={(accounts ?? []).map((a) => ({ value: a.id, label: a.name }))}
        value={accountId}
        onChange={setAccountId}
      />
      <TextField
        label="Date"
        value={dateText}
        onChangeText={setDateText}
        placeholder="jj/mm/aaaa"
        error={date === null ? 'Date au format jj/mm/aaaa.' : null}
      />
      <TextField
        label="Montant"
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        error={amount === null || amount <= 0 ? 'Le montant doit être supérieur à zéro.' : null}
      />
      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button label="Enregistrer le remboursement" disabled={!valid} onPress={confirm} style={styles.grow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  title: {
    color: colors.ink,
  },
  note: {
    color: colors.ash,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
});
