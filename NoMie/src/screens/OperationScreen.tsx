import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Chips, type ChipOption } from '../components/Chips';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import { Switch } from '../components/Switch';
import { TextField } from '../components/TextField';
import type {
  AdvanceType,
  Category,
  NewSplitLine,
  NewTransaction,
  Transaction,
  TransactionStatus,
} from '../services/dataService';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { parseMoneyInput } from '../utils/amountInput';
import { formatNumericDate, parseNumericDate, toIsoDate } from '../utils/dates';
import { formatAmount } from '../utils/formatAmount';
import { remainingToSplit, shareEvenly } from '../utils/splitShare';
import { STATUS_LABELS } from '../utils/statusCopy';

/** What the Opération screen opens on: an existing operation, or a new one with what was already typed. */
export type OperationTarget =
  | { kind: 'edit'; id: number }
  | { kind: 'new'; draft?: { amount?: number; isExpense?: boolean; categoryId?: number | null; comment?: string } };

interface OperationScreenProps {
  target: OperationTarget;
  onClose: () => void;
}

const STATUS_OPTIONS: ChipOption<TransactionStatus>[] = (
  ['non_pointe', 'pointe', 'prevision', 'fantome'] as const
).map((value) => ({ value, label: STATUS_LABELS[value] }));

type SplitMode = 'amount' | 'percent';

interface PartDraft {
  key: number;
  categoryId: number | null;
  valueText: string;
  advanceType: AdvanceType;
}

const MODE_OPTIONS: ChipOption<SplitMode>[] = [
  { value: 'amount', label: 'En euros' },
  { value: 'percent', label: 'En pourcentage' },
];

const ADVANCE_OPTIONS: ChipOption<AdvanceType>[] = [
  { value: 'reglee_ailleurs', label: 'Réglée ailleurs' },
  { value: 'en_attente', label: 'En attente' },
];

const toText = (value: number) => String(value).replace('.', ',');

/**
 * Écran Opération (#43, #44): create, edit and delete an operation, and
 * split it over several categories. A full-screen `Modal`, like Réglages
 * and the Bilan annuel, opened from anywhere through `useOperationEditor`.
 */
export function OperationScreen({ target, onClose }: OperationScreenProps) {
  const editingId = target.kind === 'edit' ? target.id : null;
  // Both legs in one read: the form starts from them once, so they must land together.
  const loaded = useServiceQuery(async (s) => {
    const existing = editingId === null ? null : await s.getTransaction(editingId);
    const mirror = existing?.mirrorTransactionId ? await s.getTransaction(existing.mirrorTransactionId) : null;
    return { existing, mirror };
  }, [editingId]);
  const accounts = useServiceQuery((s) => s.listAccounts());
  const categories = useServiceQuery((s) => s.listCategories());
  const currentAccount = useServiceQuery((s) => s.getCurrentAccount());

  const ready = loaded !== undefined && accounts !== undefined && categories !== undefined && currentAccount !== undefined;

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} testID="operation-screen">
        <ModalScreenHeader
          title={editingId === null ? 'Nouvelle opération' : 'Opération'}
          testID="operation-title"
          onClose={onClose}
        />
        {ready ? (
          <OperationForm
            target={target}
            existing={loaded.existing}
            mirror={loaded.mirror}
            accounts={accounts}
            categories={categories}
            defaultAccountId={currentAccount?.id ?? accounts[0]?.id ?? null}
            onClose={onClose}
          />
        ) : null}
      </View>
    </Modal>
  );
}

interface OperationFormProps {
  target: OperationTarget;
  existing: Transaction | null;
  mirror: Transaction | null;
  accounts: { id: number; name: string }[];
  categories: Category[];
  defaultAccountId: number | null;
  onClose: () => void;
}

function OperationForm({
  target,
  existing,
  mirror,
  accounts,
  categories,
  defaultAccountId,
  onClose,
}: OperationFormProps) {
  const dataService = useDataService();
  const draft = target.kind === 'new' ? target.draft : undefined;
  const today = toIsoDate(dataService.now());
  const avanceCategory = categories.find((c) => c.systemRole === 'avance') ?? null;
  const virementCategory = categories.find((c) => c.systemRole === 'virement') ?? null;
  const isMovement = existing !== null && mirror !== null;

  const initialSplits = existing?.splits ?? [];
  const [accountId, setAccountId] = useState<number | null>(existing?.accountId ?? defaultAccountId);
  const [isExpense, setIsExpense] = useState(existing ? existing.amount < 0 : (draft?.isExpense ?? true));
  const [amountText, setAmountText] = useState(
    existing ? toText(Math.abs(existing.amount)) : draft?.amount ? toText(draft.amount) : ''
  );
  const [operationDateText, setOperationDateText] = useState(
    formatNumericDate(existing?.operationDate ?? today)
  );
  // Prefilled with the operation date, until it is typed over.
  const [bankDateText, setBankDateText] = useState(
    existing ? (existing.bankDate ? formatNumericDate(existing.bankDate) : '') : null
  );
  const [comment, setComment] = useState(existing?.comment ?? draft?.comment ?? '');
  const [status, setStatus] = useState<TransactionStatus>(existing?.status ?? 'non_pointe');
  const [categoryId, setCategoryId] = useState<number | null>(
    existing ? (initialSplits.length > 0 ? null : existing.categoryId) : (draft?.categoryId ?? null)
  );
  const [destinationId, setDestinationId] = useState<number | null>(mirror?.accountId ?? null);

  const [splitting, setSplitting] = useState(initialSplits.length > 0);
  const [splitMode, setSplitMode] = useState<SplitMode>('amount');
  const [parts, setParts] = useState<PartDraft[]>(
    initialSplits.map((line, key) => ({
      key,
      categoryId: line.categoryId,
      valueText: toText(Math.abs(line.amount)),
      advanceType: line.advanceType ?? 'reglee_ailleurs',
    }))
  );
  const [shareCount, setShareCount] = useState(2);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = parseMoneyInput(amountText) ?? 0;
  const isMovementCategory = virementCategory !== null && categoryId === virementCategory.id;
  const canSplit = !isMovement && !isMovementCategory;
  const kind = isExpense ? 'expense' : 'income';
  const categoryOptions = categories
    .filter(
      (c) =>
        (c.kind === kind || c.kind === 'both') &&
        (!c.hidden || c.id === categoryId) &&
        // An existing operation can't turn into a movement between accounts.
        (existing === null || c.systemRole !== 'virement')
    )
    .map((c) => ({ value: c.id, label: c.name }));
  const partCategoryOptions = categories
    .filter((c) => c.systemRole !== 'virement' && (c.kind === kind || c.kind === 'both') && !c.hidden)
    .map((c) => ({ value: c.id, label: c.name }));

  const partValues = parts.map((part) => parseMoneyInput(part.valueText) ?? 0);
  const remaining = remainingToSplit(splitMode === 'amount' ? total : 100, partValues);
  const splitIsExact = parts.length >= 2 && remaining === 0 && partValues.every((v) => v > 0);

  const bankDateShown = bankDateText ?? operationDateText;
  const operationDate = parseNumericDate(operationDateText);
  const bankDate = bankDateShown.trim() === '' ? null : parseNumericDate(bankDateShown);
  const datesValid = operationDate !== null && (bankDateShown.trim() === '' || bankDate !== null);
  const formValid =
    accountId !== null &&
    total > 0 &&
    datesValid &&
    (!isMovementCategory || (destinationId !== null && destinationId !== accountId)) &&
    (!splitting || splitIsExact);

  const switchDirection = () => {
    setIsExpense((expense) => !expense);
    // A category only fits one direction.
    if (!isMovementCategory) setCategoryId(null);
    setParts((current) => current.map((part) => ({ ...part, categoryId: null })));
  };

  const startSplitting = (on: boolean) => {
    setSplitting(on);
    if (on && parts.length === 0) {
      setParts([
        { key: 0, categoryId, valueText: '', advanceType: 'reglee_ailleurs' },
        { key: 1, categoryId: null, valueText: '', advanceType: 'reglee_ailleurs' },
      ]);
    }
  };

  const changeMode = (mode: SplitMode) => {
    setSplitMode(mode);
    setParts((current) => current.map((part) => ({ ...part, valueText: '' })));
  };

  const updatePart = (key: number, changes: Partial<PartDraft>) =>
    setParts((current) => current.map((part) => (part.key === key ? { ...part, ...changes } : part)));

  const addPart = () =>
    setParts((current) => [
      ...current,
      { key: Math.max(-1, ...current.map((p) => p.key)) + 1, categoryId: null, valueText: '', advanceType: 'reglee_ailleurs' },
    ]);

  const removePart = (key: number) => setParts((current) => current.filter((part) => part.key !== key));

  /** « Partager à N »: my share in the operation's category, the rest advanced and settled elsewhere. */
  const shareToN = () => {
    const { mine, rest } = shareEvenly(total, shareCount);
    setSplitMode('amount');
    setSplitting(true);
    setParts([
      { key: 0, categoryId, valueText: toText(mine), advanceType: 'reglee_ailleurs' },
      { key: 1, categoryId: avanceCategory?.id ?? null, valueText: toText(rest), advanceType: 'reglee_ailleurs' },
    ]);
  };

  const save = async () => {
    if (!formValid || accountId === null || operationDate === null) return;
    const sign = isExpense ? -1 : 1;
    const splits: NewSplitLine[] = splitting
      ? parts.map((part, i) => ({
          categoryId: part.categoryId,
          ...(splitMode === 'amount' ? { amount: sign * partValues[i] } : { percent: partValues[i] }),
          ...(part.categoryId !== null && part.categoryId === avanceCategory?.id
            ? { advanceType: part.advanceType }
            : {}),
        }))
      : [];
    const values: NewTransaction = {
      accountId,
      operationDate,
      bankDate,
      comment: comment.trim(),
      amount: sign * total,
      categoryId: splitting ? null : categoryId,
      status,
      splits,
      ...(isMovementCategory || isMovement ? { transferToAccountId: destinationId ?? undefined } : {}),
    };
    try {
      if (existing) {
        await dataService.updateTransaction(existing.id, {
          ...values,
          categoryId: splitting ? (splits[0]?.categoryId ?? null) : categoryId,
        });
      } else {
        await dataService.createTransaction(values);
      }
      onClose();
    } catch {
      // The service's rules are in English and meant for developers; the form already guards the usual cases.
      setError('Enregistrement impossible : un fantôme ne peut pas être hors bilan, ni un mouvement entre comptes être un fantôme.');
    }
  };

  const remove = async () => {
    if (!existing) return;
    await dataService.deleteTransaction(existing.id);
    onClose();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="operation-form"
    >
      <Section label="Compte">
        <Chips
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          value={accountId}
          onChange={setAccountId}
        />
      </Section>

      <Section label="Sens">
        <Chips
          options={[
            { value: 'expense', label: 'Dépense' },
            { value: 'income', label: 'Recette' },
          ]}
          value={kind}
          onChange={(next) => next !== kind && switchDirection()}
        />
      </Section>

      <TextField
        label="Montant"
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="0,00"
      />
      <TextField
        label="Date d’opération"
        value={operationDateText}
        onChangeText={setOperationDateText}
        placeholder="jj/mm/aaaa"
        error={operationDate === null ? 'Date au format jj/mm/aaaa.' : null}
      />
      <TextField
        label="Date banque"
        value={bankDateShown}
        onChangeText={setBankDateText}
        placeholder="jj/mm/aaaa"
        error={bankDateShown.trim() !== '' && bankDate === null ? 'Date au format jj/mm/aaaa.' : null}
      />
      <TextField label="Libellé" value={comment} onChangeText={setComment} placeholder="Ex. Carrefour Market" />

      <Section label="Statut">
        <Chips options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </Section>

      {isMovement ? (
        <Text style={[textStyle('bodySm'), styles.note]}>
          Mouvement entre comptes : la modification et la suppression agissent sur les deux écritures.
        </Text>
      ) : splitting ? null : (
        <Section label="Catégorie">
          <Chips
            scroll
            options={categoryOptions}
            value={categoryId}
            onChange={(id) => setCategoryId(id === categoryId ? null : id)}
          />
        </Section>
      )}

      {isMovementCategory || isMovement ? (
        <Section label="Compte de destination">
          <Chips
            options={accounts.filter((a) => a.id !== accountId).map((a) => ({ value: a.id, label: a.name }))}
            value={destinationId}
            onChange={setDestinationId}
          />
        </Section>
      ) : null}

      {canSplit ? (
        <View style={styles.card} testID="split-section">
          <View style={styles.cardRow}>
            <Text style={[textStyle('bodyMdMedium'), styles.cardTitle]}>Répartir sur plusieurs catégories</Text>
            <Switch value={splitting} onValueChange={startSplitting} accessibilityLabel="Répartir" />
          </View>

          <View style={styles.shareRow}>
            <Text style={[textStyle('bodySm'), styles.note]}>Partager à</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Moins de parts"
              onPress={() => setShareCount((n) => Math.max(2, n - 1))}
              style={styles.stepper}
            >
              <Text style={textStyle('bodyLg')}>−</Text>
            </Pressable>
            <Text testID="share-count" style={[textStyle('bodyMdMedium'), styles.shareCount]}>
              {String(shareCount)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Plus de parts"
              onPress={() => setShareCount((n) => n + 1)}
              style={styles.stepper}
            >
              <Text style={textStyle('bodyLg')}>+</Text>
            </Pressable>
            <View style={styles.spacer} />
            <Button label="Partager" variant="secondary" disabled={total <= 0} onPress={shareToN} />
          </View>

          {splitting ? (
            <View style={styles.parts}>
              <Chips options={MODE_OPTIONS} value={splitMode} onChange={changeMode} />
              {parts.map((part, i) => (
                <View key={part.key} style={styles.part} testID={`part-${i + 1}`}>
                  <TextField
                    label={`Part ${i + 1}${splitMode === 'percent' ? ' (%)' : ' (€)'}`}
                    value={part.valueText}
                    onChangeText={(text) => updatePart(part.key, { valueText: text })}
                    keyboardType="decimal-pad"
                  />
                  <Chips
                    scroll
                    options={partCategoryOptions}
                    value={part.categoryId}
                    onChange={(id) => updatePart(part.key, { categoryId: id })}
                  />
                  {part.categoryId !== null && part.categoryId === avanceCategory?.id ? (
                    <Chips
                      options={ADVANCE_OPTIONS}
                      value={part.advanceType}
                      onChange={(advanceType) => updatePart(part.key, { advanceType })}
                    />
                  ) : null}
                  {parts.length > 2 ? (
                    <Button label="Retirer cette part" variant="ghost" onPress={() => removePart(part.key)} />
                  ) : null}
                </View>
              ))}
              <Button label="Ajouter une part" variant="secondary" onPress={addPart} />
              <Text testID="split-remaining" style={[textStyle('bodyMdMedium'), styles.remaining]}>
                {remaining === 0
                  ? 'Reste à répartir : 0'
                  : `Reste à répartir : ${splitMode === 'amount' ? formatAmount(remaining) : `${toText(remaining)} %`}`}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={[textStyle('bodySm'), styles.error]}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label="Enregistrer" disabled={!formValid} onPress={save} />
      </View>

      {existing ? (
        confirmingDelete ? (
          <View style={styles.card}>
            <Text style={[textStyle('bodyMd'), styles.cardTitle]}>
              {isMovement
                ? 'Supprimer ce mouvement ? Les deux écritures seront supprimées.'
                : 'Supprimer cette opération ?'}
            </Text>
            <View style={styles.cardRow}>
              <Button label="Annuler" variant="secondary" onPress={() => setConfirmingDelete(false)} />
              <Button label="Confirmer la suppression" onPress={remove} />
            </View>
          </View>
        ) : (
          <Button label="Supprimer" variant="ghost" onPress={() => setConfirmingDelete(true)} />
        )
      ) : null}
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[textStyle('caption'), styles.sectionLabel]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.xxs,
  },
  sectionLabel: {
    color: colors.ash,
  },
  note: {
    color: colors.ash,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.ink,
    flexShrink: 1,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shareCount: {
    color: colors.ink,
    minWidth: 20,
    textAlign: 'center',
  },
  stepper: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    flex: 1,
  },
  parts: {
    gap: spacing.sm,
  },
  part: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  remaining: {
    color: colors.ink,
  },
  error: {
    color: colors.amountNegative,
  },
  actions: {
    gap: spacing.xs,
  },
});
