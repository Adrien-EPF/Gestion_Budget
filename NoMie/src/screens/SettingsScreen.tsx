import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { LinkRow, SettingsGroup, SwitchRow } from '../components/SettingsGroup';
import type { TabScreenProps } from '../navigation/types';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import type { SettingKey } from '../services/dataService';
import { colors, spacing, textStyle } from '../theme/tokens';
import { describeAccounts, describeAdvances, describeCategories } from '../utils/settingsCopy';

/**
 * Réglages (handoff §6.5). Every switch persists through the data service;
 * the actions behind them (lock, notifications, backup, export, import) are
 * not built yet, so those rows only hold state or sit inert (#3 « Hors périmètre »).
 */
export function SettingsScreen({ navigation }: TabScreenProps<'Réglages'>) {
  const dataService = useDataService();
  const settings = useServiceQuery((s) => s.getSettings());
  const structure = useServiceQuery((s) => s.getStructureSummary());

  if (!settings || !structure) return <Screen title="Réglages">{null}</Screen>;

  const switchProps = (key: SettingKey) => ({
    value: settings[key],
    onValueChange: (value: boolean) => dataService.setSetting(key, value),
  });

  return (
    <Screen title="Réglages">
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsGroup title="Sécurité" note="L’app se verrouille dès qu’elle passe en arrière-plan.">
          <SwitchRow label="Code PIN" {...switchProps('pinEnabled')} />
          <SwitchRow label="Empreinte" {...switchProps('biometricEnabled')} />
        </SettingsGroup>

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
        </SettingsGroup>

        <SettingsGroup
          title="Données"
          note="Tout reste sur ton téléphone. Une sauvegarde de temps en temps évite les mauvaises surprises."
        >
          <LinkRow label="Sauvegarde complète" hint="Fichier réimportable" />
          <LinkRow label="Export Excel/CSV" hint="Lisible hors app" />
          <LinkRow label="Importer une sauvegarde" hint="Remplace les données de l’appareil" />
        </SettingsGroup>

        <SettingsGroup title="Saisie">
          <SwitchRow label="Clavier en montants arrondis" {...switchProps('roundedKeypad')} />
        </SettingsGroup>

        <Text style={[textStyle('bodySm'), styles.footer]}>
          NoMie · version alpha · données stockées sur cet appareil
        </Text>
      </ScrollView>
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
});
