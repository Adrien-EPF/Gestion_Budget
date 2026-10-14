import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDataService, useServiceQuery } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { toTypedDate } from '../utils/dates';
import { Button } from './Button';
import { SettingsGroup } from './SettingsGroup';
import { TextField } from './TextField';

/**
 * Réglages › Développement: moves the app clock forward to test recurrences
 * and forecasts without waiting. Development builds only (`__DEV__`), so a
 * production build never offers it.
 */
export function DevelopmentGroup() {
  const dataService = useDataService();
  const clock = useServiceQuery((s) => s.getSimulatedClock());
  const [daysText, setDaysText] = useState('');
  if (!__DEV__) return null;

  const days = Number(daysText);
  const validDays = daysText.trim() !== '' && Number.isInteger(days) && days >= 1;
  const simulated = clock?.simulatedDate ?? null;

  const advance = async () => {
    await dataService.advanceSimulatedDays(days);
    setDaysText('');
  };

  return (
    <SettingsGroup
      title="Développement"
      note="Revenir à aujourd’hui annule tout ce qui a été créé ou modifié pendant le test."
    >
      <View style={styles.row}>
        <Text style={[textStyle('bodyLg'), styles.state]}>
          {simulated
            ? `La date de l’app est simulée : ${toTypedDate(simulated)}.`
            : 'La date de l’app est la date réelle.'}
        </Text>
      </View>
      <View style={styles.row}>
        <TextField label="Nombre de jours" value={daysText} onChangeText={setDaysText} keyboardType="number-pad" />
        <Button label="Avancer de N jours" variant="secondary" disabled={!validDays} onPress={advance} />
      </View>
      <View style={styles.row}>
        <Button
          label="Revenir à aujourd’hui"
          variant="secondary"
          disabled={!simulated}
          onPress={() => dataService.resetSimulatedDate()}
        />
      </View>
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  state: {
    color: colors.ink,
  },
});
