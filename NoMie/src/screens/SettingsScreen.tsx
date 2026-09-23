import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { buildCsvZipBase64 } from '../backup/zip';
import { ImportBackupSheet } from '../components/ImportBackupSheet';
import { Screen } from '../components/Screen';
import { LinkRow, SettingsGroup, SwitchRow } from '../components/SettingsGroup';
import { useFileSharer } from '../files/FileSharerContext';
import type { PickedFile } from '../files/fileSharer';
import type { TabScreenProps } from '../navigation/types';
import { DevNotificationTest } from '../notifications/DevNotificationTest';
import { useNotificationScheduler } from '../notifications/NotificationSchedulerContext';
import { isNotificationSetting, setNotificationSetting } from '../notifications/reconcile';
import { LockScreen } from '../security/LockScreen';
import { PinSetupSheet } from '../security/PinSetupSheet';
import { useSecurityStore } from '../security/SecurityStoreContext';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import type { SettingKey } from '../services/dataService';
import { colors, spacing, textStyle } from '../theme/tokens';
import { toIsoDate } from '../utils/dates';
import { describeAccounts, describeAdvances, describeCategories } from '../utils/settingsCopy';

/**
 * Réglages (handoff §6.5). Most switches persist straight through the data
 * service; the notification switches also plan or cancel the matching
 * notification. Code PIN and Empreinte are real actions instead (#23):
 * enabling one runs it through `PinSetupSheet` or an availability check,
 * disabling either requires the `LockScreen` re-authentication gate first.
 */
type AuthGateTarget = 'pinEnabled' | 'biometricEnabled';

const AUTH_GATE_TITLE: Record<AuthGateTarget, string> = {
  pinEnabled: 'Confirme pour désactiver le code PIN',
  biometricEnabled: 'Confirme pour désactiver l’empreinte',
};

const BIOMETRIC_NO_HARDWARE = 'Cet appareil ne dispose pas de lecteur d’empreinte ni de Face ID.';
const BIOMETRIC_NOT_ENROLLED =
  'Aucune empreinte ni visage n’est enregistré sur cet appareil. Ajoute-en un dans ses réglages.';

export function SettingsScreen({ navigation }: TabScreenProps<'Réglages'>) {
  const dataService = useDataService();
  const scheduler = useNotificationScheduler();
  const fileSharer = useFileSharer();
  const securityStore = useSecurityStore();
  const settings = useServiceQuery((s) => s.getSettings());
  const structure = useServiceQuery((s) => s.getStructureSummary());
  const [pendingImport, setPendingImport] = useState<PickedFile | null>(null);
  const [pinSetupVisible, setPinSetupVisible] = useState(false);
  const [authGate, setAuthGate] = useState<AuthGateTarget | null>(null);
  const [biometricMessage, setBiometricMessage] = useState<string | null>(null);

  if (!settings || !structure) return <Screen title="Réglages">{null}</Screen>;

  const switchProps = (key: SettingKey) => ({
    value: settings[key],
    onValueChange: (value: boolean) =>
      isNotificationSetting(key)
        ? setNotificationSetting(dataService, scheduler, key, value)
        : dataService.setSetting(key, value),
  });

  const onPinToggle = (value: boolean) => {
    if (value) {
      setPinSetupVisible(true);
    } else {
      setAuthGate('pinEnabled');
    }
  };

  const onBiometricToggle = async (value: boolean) => {
    if (!value) {
      setAuthGate('biometricEnabled');
      return;
    }
    setBiometricMessage(null);
    if (!(await securityStore.hasBiometricHardware())) {
      setBiometricMessage(BIOMETRIC_NO_HARDWARE);
      return;
    }
    if (!(await securityStore.isBiometricEnrolled())) {
      setBiometricMessage(BIOMETRIC_NOT_ENROLLED);
      return;
    }
    await dataService.setSetting('biometricEnabled', true);
  };

  const confirmAuthGate = async () => {
    if (!authGate) return;
    await dataService.setSetting(authGate, false);
    setAuthGate(null);
  };

  const datedFilename = (prefix: string, extension: string) =>
    `${prefix}-${toIsoDate(new Date())}.${extension}`;

  const backupComplete = async () => {
    const backup = await dataService.createBackup();
    await fileSharer.share({
      filename: datedFilename('nomie-sauvegarde', 'json'),
      content: JSON.stringify(backup),
      mimeType: 'application/json',
    });
  };

  const exportCsv = async () => {
    const files = await dataService.exportCsv();
    await fileSharer.share({
      filename: datedFilename('nomie-export', 'zip'),
      content: buildCsvZipBase64(files),
      base64: true,
      mimeType: 'application/zip',
    });
  };

  const importBackup = async () => {
    const picked = await fileSharer.pickFile();
    if (picked) setPendingImport(picked);
  };

  return (
    <Screen title="Réglages">
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsGroup title="Sécurité" note="L’app se verrouille dès qu’elle passe en arrière-plan.">
          <SwitchRow label="Code PIN" value={settings.pinEnabled} onValueChange={onPinToggle} />
          <SwitchRow label="Empreinte" value={settings.biometricEnabled} onValueChange={onBiometricToggle} />
        </SettingsGroup>
        {biometricMessage ? (
          <Text style={[textStyle('bodySm'), styles.biometricMessage]}>{biometricMessage}</Text>
        ) : null}

        <SettingsGroup title="Structure">
          <LinkRow
            label="Comptes"
            hint={describeAccounts(structure)}
            onPress={() => navigation.navigate('Comptes')}
          />
          <LinkRow label="Catégories" hint={describeCategories(structure)} />
          <LinkRow label="Avances en attente" hint={describeAdvances(structure)} />
        </SettingsGroup>

        <SettingsGroup
          title="Notifications"
          note="Ton détendu, jamais d’alerte : « Tu as dépensé un peu plus en Restaurant ce mois-ci qu’en général »."
        >
          <SwitchRow
            label="Rappel de pointage"
            hint="Le dimanche, en fin de journée"
            {...switchProps('checkReminderEnabled')}
          />
          <SwitchRow
            label="Point budget mensuel"
            hint="Un résumé factuel le 1er du mois"
            {...switchProps('monthlyBudgetReviewEnabled')}
          />
          <DevNotificationTest />
        </SettingsGroup>

        <SettingsGroup
          title="Données"
          note="Tout reste sur ton téléphone. Une sauvegarde de temps en temps évite les mauvaises surprises."
        >
          <LinkRow label="Sauvegarde complète" hint="Fichier réimportable" onPress={backupComplete} />
          <LinkRow label="Export Excel/CSV" hint="Lisible hors app" onPress={exportCsv} />
          <LinkRow
            label="Importer une sauvegarde"
            hint="Remplace les données de l’appareil"
            onPress={importBackup}
          />
        </SettingsGroup>

        <SettingsGroup title="Saisie">
          <SwitchRow label="Clavier en montants arrondis" {...switchProps('roundedKeypad')} />
        </SettingsGroup>

        <Text style={[textStyle('bodySm'), styles.footer]}>
          NoMie · version alpha · données stockées sur cet appareil
        </Text>
      </ScrollView>
      <ImportBackupSheet file={pendingImport} onClose={() => setPendingImport(null)} />
      <PinSetupSheet visible={pinSetupVisible} onClose={() => setPinSetupVisible(false)} />
      {authGate ? (
        <LockScreen
          biometricEnabled={settings.biometricEnabled}
          securityStore={securityStore}
          onUnlock={confirmAuthGate}
          title={AUTH_GATE_TITLE[authGate]}
          onCancel={() => setAuthGate(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 116,
    gap: spacing.xl,
  },
  footer: {
    color: colors.ash,
    textAlign: 'center',
  },
  biometricMessage: {
    color: colors.amountNegative,
  },
});
