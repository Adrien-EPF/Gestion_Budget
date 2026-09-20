import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';

export function AccountsScreen() {
  return (
    <Screen title="Comptes">
      <EmptyState message="La liste des comptes arrive dans une prochaine étape." />
    </Screen>
  );
}
