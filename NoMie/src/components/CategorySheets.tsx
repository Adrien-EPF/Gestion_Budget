import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Category, CategoryKind } from '../services/dataService';
import { useDataService } from '../services/DataServiceContext';
import { CATEGORY_COLORS } from '../theme/categoryColors';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Chips, type ChipOption } from './Chips';
import { MenuRow } from './MenuRow';
import { TextField } from './TextField';

const NAME_REQUIRED = 'Donne un nom à cette catégorie.';

const KIND_OPTIONS: ChipOption<CategoryKind>[] = [
  { value: 'expense', label: 'Dépense' },
  { value: 'income', label: 'Recette' },
  { value: 'both', label: 'Les deux' },
];

/** Row of swatches from the fixed palette (#21) — `null` keeps the placeholder tint. */
function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  return (
    <View style={styles.swatchRow}>
      {CATEGORY_COLORS.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`Couleur ${color}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(selected ? null : color)}
            style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected]}
          />
        );
      })}
    </View>
  );
}

/** « + Ajouter une catégorie » — no limit on how many, per the cahier des charges (#21 story 8). */
export function AddCategorySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AddCategoryForm onClose={onClose} />
    </BottomSheet>
  );
}

function AddCategoryForm({ onClose }: { onClose: () => void }) {
  const dataService = useDataService();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [color, setColor] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    setNameError(trimmed === '' ? NAME_REQUIRED : null);
    if (trimmed === '') return;

    await dataService.createCategory({ name: trimmed, kind, color });
    onClose();
  };

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Nouvelle catégorie</Text>
      <TextField
        label="Nom de la catégorie"
        value={name}
        onChangeText={setName}
        placeholder="Abonnements, Animaux…"
        autoFocus
        error={nameError}
      />
      <Chips options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <ColorPicker value={color} onChange={setColor} />
      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button label="Ajouter" onPress={submit} style={styles.grow} />
      </View>
    </View>
  );
}

type ActionsMode = 'menu' | 'rename' | 'color';

interface CategoryActionsSheetProps {
  /** The category being acted on; the sheet is open exactly while this is set. */
  category: Category | null;
  onClose: () => void;
}

/** Per-category actions (#21, #26): renommer, couleur, masquer/afficher. */
export function CategoryActionsSheet({ category, onClose }: CategoryActionsSheetProps) {
  return (
    <BottomSheet visible={category !== null} onClose={onClose}>
      {category ? <CategoryActions category={category} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function CategoryActions({ category, onClose }: { category: Category; onClose: () => void }) {
  const dataService = useDataService();
  const [mode, setMode] = useState<ActionsMode>('menu');
  const [name, setName] = useState(category.name);
  const [color, setColor] = useState(category.color);
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
    await dataService.updateCategory(category.id, { name: trimmed });
    onClose();
  };

  const saveColor = async () => {
    await dataService.updateCategory(category.id, { color });
    onClose();
  };

  const toggleHidden = async () => {
    await dataService.updateCategory(category.id, { hidden: !category.hidden });
    onClose();
  };

  if (mode === 'rename') {
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>Renommer la catégorie</Text>
        <TextField label="Nom de la catégorie" value={name} onChangeText={setName} autoFocus error={error} />
        <View style={styles.actions}>
          <Button label="Retour" variant="secondary" onPress={back} />
          <Button label="Enregistrer" onPress={saveName} style={styles.grow} />
        </View>
      </View>
    );
  }

  if (mode === 'color') {
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>Couleur</Text>
        <ColorPicker value={color} onChange={setColor} />
        <View style={styles.actions}>
          <Button label="Retour" variant="secondary" onPress={back} />
          <Button label="Enregistrer" onPress={saveColor} style={styles.grow} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>{category.name}</Text>
      <View style={styles.menu}>
        <MenuRow label="Renommer" onPress={() => setMode('rename')} />
        <MenuRow label="Couleur" onPress={() => setMode('color')} />
        <MenuRow label={category.hidden ? 'Afficher' : 'Masquer'} onPress={toggleHidden} />
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
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: rounded.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: colors.primary,
  },
});
