import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';

export function HomeScreen() {
  return (
    <Screen title="NoMie" showMonthSelector>
      <EmptyState message="L'accueil arrive dans une prochaine étape." />
    </Screen>
  );
}
