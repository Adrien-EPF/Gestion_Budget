import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PickedFile } from '../files/fileSharer';
import { useNotificationScheduler } from '../notifications/NotificationSchedulerContext';
import { reconcileNotifications } from '../notifications/reconcile';
import { useDataService } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

const GENERIC_ERROR = 'Ce fichier n’a pas pu être importé.';

interface ImportBackupSheetProps {
  /** The file just picked from « Importer une sauvegarde »; the sheet is open exactly while this is set. */
  file: PickedFile | null;
  onClose: () => void;
}

/**
 * Confirms before replacing the device's data (#12 story 4), then shows a
 * factual, non-alarmist refusal if the file turns out invalid (story 5/6).
 * A cancelled confirmation changes nothing.
 */
export function ImportBackupSheet({ file, onClose }: ImportBackupSheetProps) {
  return (
    <BottomSheet visible={file !== null} onClose={onClose}>
      {file ? <ImportBackupForm file={file} onClose={onClose} /> : null}
    </BottomSheet>
  );
}

function ImportBackupForm({ file, onClose }: { file: PickedFile; onClose: () => void }) {
  const dataService = useDataService();
  const scheduler = useNotificationScheduler();
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    try {
      await dataService.restoreBackup(file.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
      return;
    }
    await reconcileNotifications(dataService, scheduler).catch(() => {
      // Notifications are a nice-to-have; a successful import must not be undone by this.
    });
    onClose();
  };

  if (error) {
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>Import impossible</Text>
        <Text style={[textStyle('bodyMd'), styles.body]}>{error}</Text>
        <View style={styles.actions}>
          <Button
            label="Fermer"
            accessibilityLabel="Fermer le message d’erreur"
            onPress={onClose}
            style={styles.grow}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Remplacer les données de l’appareil ?</Text>
      <Text style={[textStyle('bodyMd'), styles.body]}>
        {`« ${file.name} » remplace tous les comptes, catégories, opérations, budgets, règles et réglages actuels de NoMie sur cet appareil.`}
      </Text>
      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button label="Importer" onPress={confirm} style={styles.grow} />
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
