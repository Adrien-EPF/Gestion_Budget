import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { Screen } from '../components/Screen';

export function BudgetsScreen() {
  return (
    <Screen title="Budgets" showMonthSelector>
      <EmptyState message="Le suivi des budgets arrive dans une prochaine étape." />
    </Screen>
  );
}
