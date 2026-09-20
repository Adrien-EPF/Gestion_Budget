import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';

export function SettingsScreen() {
  return (
    <Screen title="Réglages">
      <EmptyState message="Les réglages arrivent dans une prochaine étape." />
    </Screen>
  );
}
