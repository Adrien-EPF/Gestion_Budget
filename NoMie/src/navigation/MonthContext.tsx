import React, { createContext, useContext, useMemo, useState } from 'react';

interface MonthState {
  year: number;
  month: number; // 0-11
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

const MonthContext = createContext<MonthState | null>(null);

/** Shared across Accueil and Budgets — changing the month affects both (see handoff §7). */
export function MonthProvider({ children }: { children: React.ReactNode }) {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const value = useMemo<MonthState>(
    () => ({
      year,
      month,
      goToPreviousMonth: () => {
        if (month === 0) {
          setMonth(11);
          setYear((y) => y - 1);
        } else {
          setMonth((m) => m - 1);
        }
      },
      goToNextMonth: () => {
        if (month === 11) {
          setMonth(0);
          setYear((y) => y + 1);
        } else {
          setMonth((m) => m + 1);
        }
      },
    }),
    [year, month]
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthState {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}
