import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useOperationEditor } from '../navigation/OperationEditorContext';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, fontFamilies, rounded, spacing, textStyle } from '../theme/tokens';
import { IMPORTANCE_LEVELS, type Importance } from '../services/dataService';
import { hasOperator } from '../utils/amountExpression';
import { applyKey, parseAmountText, type KeypadKey } from '../utils/amountInput';
import { toIsoDate } from '../utils/dates';
import { IMPORTANCE_LABELS } from '../utils/importanceCopy';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chips } from './Chips';
import { TextField } from './TextField';

const KEYPAD_LABELS: Partial<Record<KeypadKey, { label: string; accessibilityLabel: string }>> = {
  backspace: { label: '←', accessibilityLabel: 'Effacer' },
  ',': { label: ',', accessibilityLabel: 'Virgule' },
  '×': { label: '×', accessibilityLabel: 'Multiplier' },
  '−': { label: '−', accessibilityLabel: 'Soustraire' },
  '+': { label: '+', accessibilityLabel: 'Additionner' },
};

const KEYPAD_ROWS: { key: KeypadKey; label: string; accessibilityLabel: string }[][] = (
  [
    ['1', '2', '3', '×'],
    ['4', '5', '6', '−'],
    ['7', '8', '9', '+'],
    [',', '0', 'backspace'],
  ] as KeypadKey[][]
).map((row) =>
  row.map((key) => ({
    key,
    label: KEYPAD_LABELS[key]?.label ?? key,
    accessibilityLabel: KEYPAD_LABELS[key]?.accessibilityLabel ?? key,
  }))
);

const IMPORTANCE_OPTIONS = IMPORTANCE_LEVELS.map((value) => ({ value, label: IMPORTANCE_LABELS[value] }));

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
  const { height } = useWindowDimensions();
  const dataService = useDataService();
  const editor = useOperationEditor();
  const categories = useServiceQuery((s) => s.listCategories());
  const currentAccount = useServiceQuery((s) => s.getCurrentAccount());

  const [amountText, setAmountText] = useState('');
  const [isExpense, setIsExpense] = useState(true);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  // Null until picked: then the level last used for the category, else Essentiel.
  const [importanceChoice, setImportanceChoice] = useState<Importance | null>(null);

  const suggestions = useServiceQuery(
    (s) => s.listLabelSuggestions({ query: label, expense: isExpense }),
    [label, isExpense]
  );
  const defaultImportance = useServiceQuery((s) => s.getDefaultImportance(categoryId), [categoryId]);
  const importance = importanceChoice ?? defaultImportance ?? 'essentiel';

  const kind = isExpense ? 'expense' : 'income';
  const visibleCategories = (categories ?? []).filter(
    (c) => !c.hidden && (c.kind === kind || c.kind === 'both')
  );
  const noAccountYet = currentAccount === null;
  const isCalculation = hasOperator(amountText);
  const result = parseAmountText(amountText);
  // A calculation that comes out at zero or below is not recordable.
  const unrecordable = isCalculation && result <= 0;
  const shownSuggestions = label.trim() === '' ? [] : (suggestions ?? []).filter((s) => s.label !== label);

  const toggleSign = () => {
    setIsExpense((expense) => !expense);
    // A category only fits one direction; keep the choice only if it fits the new one.
    setCategoryId(null);
    setImportanceChoice(null);
  };

  const chooseCategory = (id: number | null) => {
    // An importance picked on purpose is kept; the default only follows the category.
    setCategoryId(id);
  };

  const pickSuggestion = (suggestion: (typeof shownSuggestions)[number]) => {
    setLabel(suggestion.label);
    const fits = visibleCategories.some((c) => c.id === suggestion.categoryId);
    if (suggestion.categoryId !== null && fits) setCategoryId(suggestion.categoryId);
    if (suggestion.importance !== null) setImportanceChoice(suggestion.importance);
  };

  const save = async () => {
    const value = result;
    const account = await dataService.getCurrentAccount();
    // Nothing typed (or nowhere to put it) is a cancelled entry, not an error.
    if (value === 0 || !account) {
      onClose();
      return;
    }
    await dataService.createTransaction({
      accountId: account.id,
      operationDate: toIsoDate(dataService.now()),
      amount: isExpense ? -value : value,
      categoryId,
      comment: label.trim(),
      ...(isExpense ? { importance } : {}),
    });
    onClose();
  };

  const openFullScreen = () => {
    editor.open({
      kind: 'new',
      draft: {
        amount: result > 0 ? result : undefined,
        isExpense,
        categoryId,
        comment: label.trim(),
        ...(isExpense ? { importance } : {}),
      },
    });
    onClose();
  };

  const amountColor = isExpense ? colors.amountNegative : colors.amountPositive;

  return (
    <ScrollView
      style={{ maxHeight: height * 0.85 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
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
        {isCalculation ? (
          <Text testID="quick-entry-result" style={[textStyle('bodyMdMedium'), styles.result]}>
            {`= ${result.toFixed(2).replace('.', ',')}`}
          </Text>
        ) : null}
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
            {row.length < 4 ? <View style={styles.keySpacer} /> : null}
          </View>
        ))}
      </View>

      <View style={styles.labelField}>
        <TextField label="Libellé" value={label} onChangeText={setLabel} placeholder="Ex. Lidl" />
        {shownSuggestions.length > 0 ? (
          <Chips
            scroll
            options={shownSuggestions.map((s) => ({ value: s.label, label: s.label }))}
            value={null}
            onChange={(picked) => pickSuggestion(shownSuggestions.find((s) => s.label === picked)!)}
          />
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
              onPress={() => chooseCategory(selected ? null : category.id)}
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

      {isExpense ? (
        <View style={styles.importance}>
          <Text style={[textStyle('caption'), styles.importanceLabel]}>Importance</Text>
          <Chips scroll options={IMPORTANCE_OPTIONS} value={importance} onChange={setImportanceChoice} />
        </View>
      ) : null}

      <Button label="Plus d’options" variant="ghost" onPress={openFullScreen} style={styles.moreOptions} />

      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button
          label="Enregistrer"
          disabled={noAccountYet || unrecordable}
          onPress={save}
          style={styles.saveButton}
        />
      </View>

      <Text style={[textStyle('bodySm'), styles.hint]}>
        {noAccountYet
          ? 'Crée d’abord un compte dans l’onglet Comptes pour enregistrer une opération.'
          : '« Plus d’options » ouvre l’écran complet : compte, dates, statut, répartition.'}
      </Text>
    </ScrollView>
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
  result: {
    color: colors.ash,
    marginRight: spacing.xs,
    alignSelf: 'center',
  },
  labelField: {
    marginTop: spacing.sm,
  },
  importance: {
    marginTop: spacing.xs,
  },
  importanceLabel: {
    color: colors.ash,
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
  keySpacer: {
    flex: 1,
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
  moreOptions: {
    marginTop: spacing.xs,
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
