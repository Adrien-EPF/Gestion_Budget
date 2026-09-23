import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddCategorySheet, CategoryActionsSheet } from '../components/CategorySheets';
import { Button } from '../components/Button';
import { ModalScreenHeader } from '../components/ModalScreenHeader';
import type { Category } from '../services/dataService';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';

interface CategoriesScreenProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Catégories, reached from Réglages > Structure (#21, #26). Not one of the
 * five tabs — RootNavigator has no stack for it — so it's a full-screen
 * `Modal` owned by Réglages's own state, the same device already used for
 * the app-wide lock screen.
 */
export function CategoriesScreen({ visible, onClose }: CategoriesScreenProps) {
  const dataService = useDataService();
  const categories = useServiceQuery((s) => s.listCategories());
  const [adding, setAdding] = useState(false);
  const [actingOn, setActingOn] = useState<Category | null>(null);

  const list = categories ?? [];

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    dataService.reorderCategories(reordered.map((c) => c.id));
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <ModalScreenHeader title="Catégories" testID="categories-title" onClose={onClose} />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.container}>
            {list.map((category, index) => (
              <View key={category.id} style={[styles.row, index > 0 && styles.divider]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  onPress={() => setActingOn(category)}
                  style={styles.rowMain}
                >
                  <View style={[styles.avatar, { backgroundColor: category.color ?? colors.surfaceSoft }]}>
                    <Text style={[textStyle('bodySm'), styles.avatarText]}>{category.icon ?? '–'}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      style={[textStyle('bodyLg'), styles.rowLabel, category.hidden && styles.hiddenLabel]}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                    {category.hidden ? (
                      <Text style={[textStyle('bodySm'), styles.hiddenHint]}>Masquée</Text>
                    ) : null}
                  </View>
                </Pressable>

                <View style={styles.reorderButtons}>
                  <ReorderButton
                    label={`Monter ${category.name}`}
                    glyph="▲"
                    disabled={index === 0}
                    onPress={() => move(index, -1)}
                  />
                  <ReorderButton
                    label={`Descendre ${category.name}`}
                    glyph="▼"
                    disabled={index === list.length - 1}
                    onPress={() => move(index, 1)}
                  />
                </View>
              </View>
            ))}
          </View>

          <Button label="+ Ajouter une catégorie" variant="ghost" onPress={() => setAdding(true)} />
        </ScrollView>

        <AddCategorySheet visible={adding} onClose={() => setAdding(false)} />
        <CategoryActionsSheet category={actingOn} onClose={() => setActingOn(null)} />
      </View>
    </Modal>
  );
}

function ReorderButton({
  label,
  glyph,
  disabled,
  onPress,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={styles.reorderButton}
    >
      <Text style={[textStyle('bodyMd'), { color: disabled ? colors.faint : colors.mute }]}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.mute,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: colors.ink,
  },
  hiddenLabel: {
    color: colors.ash,
  },
  hiddenHint: {
    color: colors.ash,
  },
  reorderButtons: {
    gap: 2,
  },
  reorderButton: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
