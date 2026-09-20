import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Account } from '../services/dataService';
import { useDataService } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { parseMoneyInput, toMoneyInput } from '../utils/amountInput';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { TextField } from './TextField';

const NAME_REQUIRED = 'Donne un nom à ce compte.';
const BALANCE_INVALID = 'Le solde doit être un nombre, par exemple 1250,50.';

/** « + Ajouter un compte » — any name, any initial balance, no type imposed (#3 story 19). */
export function AddAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AddAccountForm onClose={onClose} />
    </BottomSheet>
  );
}

function AddAccountForm({ onClose }: { onClose: () => void }) {
  const dataService = useDataService();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    const initialBalance = parseMoneyInput(balance);
    setNameError(trimmed === '' ? NAME_REQUIRED : null);
    setBalanceError(initialBalance === null ? BALANCE_INVALID : null);
    if (trimmed === '' || initialBalance === null) return;

    await dataService.createAccount({ name: trimmed, initialBalance });
    onClose();
  };

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Nouveau compte</Text>
      <TextField
        label="Nom du compte"
        value={name}
        onChangeText={setName}
        placeholder="Compte courant, Livret A…"
        autoFocus
        error={nameError}
      />
      <TextField
        label="Solde initial"
        value={balance}
        onChangeText={setBalance}
        placeholder="0,00"
        keyboardType="numbers-and-punctuation"
        error={balanceError}
      />
      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button label="Ajouter" onPress={submit} style={styles.grow} />
      </View>
    </View>
  );
}

type ActionsMode = 'menu' | 'rename' | 'balance' | 'archive' | 'delete';

interface AccountActionsSheetProps {
  /** The account being acted on; the sheet is open exactly while this is set. */
  account: Account | null;
  onClose: () => void;
}

/** Per-account actions (handoff §6.2, "non maquettées") : renommer, solde initial, archiver, supprimer. */
export function AccountActionsSheet({ account, onClose }: AccountActionsSheetProps) {
  return (
    <BottomSheet visible={account !== null} onClose={onClose}>
      {account ? <AccountActions account={account} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function AccountActions({ account, onClose }: { account: Account; onClose: () => void }) {
  const dataService = useDataService();
  const [mode, setMode] = useState<ActionsMode>('menu');
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(toMoneyInput(account.initialBalance));
  const [error, setError] = useState<string | null>(null);

  const back = () => {
    setError(null);
    setMode('menu');
  };

  const saveName = async () => {
    const trimmed = name.trim();
    if (trimmed === '') {
      setError(NAME_REQUIRED);
      return;
    }
    await dataService.renameAccount(account.id, trimmed);
    onClose();
  };

  const saveBalance = async () => {
    const initialBalance = parseMoneyInput(balance);
    if (initialBalance === null) {
      setError(BALANCE_INVALID);
      return;
    }
    await dataService.updateInitialBalance(account.id, initialBalance);
    onClose();
  };

  const archive = async () => {
    await dataService.archiveAccount(account.id);
    onClose();
  };

  const remove = async () => {
    await dataService.deleteAccount(account.id);
    onClose();
  };

  if (mode === 'rename') {
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>Renommer le compte</Text>
        <TextField label="Nom du compte" value={name} onChangeText={setName} autoFocus error={error} />
        <View style={styles.actions}>
          <Button label="Retour" variant="secondary" onPress={back} />
          <Button label="Enregistrer" onPress={saveName} style={styles.grow} />
        </View>
      </View>
    );
  }

  if (mode === 'balance') {
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>Solde initial</Text>
        <TextField
          label="Solde initial"
          value={balance}
          onChangeText={setBalance}
          keyboardType="numbers-and-punctuation"
          autoFocus
          error={error}
        />
        <View style={styles.actions}>
          <Button label="Retour" variant="secondary" onPress={back} />
          <Button label="Enregistrer" onPress={saveBalance} style={styles.grow} />
        </View>
      </View>
    );
  }

  if (mode === 'archive' || mode === 'delete') {
    const isDelete = mode === 'delete';
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>
          {isDelete ? `Supprimer « ${account.name} » ?` : `Archiver « ${account.name} » ?`}
        </Text>
        <Text style={[textStyle('bodyMd'), styles.body]}>
          {isDelete
            ? 'Toutes les opérations du compte seront supprimées avec lui. Cette action est définitive.'
            : 'Le compte quitte ta vue active, son historique est conservé.'}
        </Text>
        <View style={styles.actions}>
          <Button label="Retour" variant="secondary" onPress={back} />
          <Button
            label={isDelete ? 'Supprimer le compte' : 'Archiver le compte'}
            onPress={isDelete ? remove : archive}
            style={styles.grow}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>{account.name}</Text>
      <View style={styles.menu}>
        <MenuRow label="Renommer" onPress={() => setMode('rename')} />
        <MenuRow label="Modifier le solde initial" onPress={() => setMode('balance')} />
        <MenuRow label="Archiver" onPress={() => setMode('archive')} />
        <MenuRow label="Supprimer" onPress={() => setMode('delete')} />
      </View>
    </View>
  );
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { backgroundColor: colors.canvas }]}
    >
      <Text style={[textStyle('bodyLg'), styles.menuLabel]}>{label}</Text>
      <Text style={[textStyle('bodyLg'), styles.chevron]}>›</Text>
    </Pressable>
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
    color: colors.body,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  grow: {
    flex: 1,
  },
  menu: {
    marginHorizontal: -spacing.xl,
  },
  menuRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  menuLabel: {
    color: colors.ink,
  },
  chevron: {
    color: colors.ash,
  },
});
