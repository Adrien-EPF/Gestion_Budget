import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';

export function RecurrencesScreen() {
  return (
    <Screen title="Récurrences">
      <EmptyState message="Les règles récurrentes arrivent dans une prochaine étape." />
    </Screen>
  );
}
