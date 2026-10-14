import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDataService } from '../services/DataServiceContext';

interface MonthState {
  year: number;
  month: number; // 0-11
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
}

const MonthContext = createContext<MonthState | null>(null);

/** Shared across Accueil and Budgets — changing the month affects both (see handoff §7). */
export function MonthProvider({ children }: { children: React.ReactNode }) {
  const dataService = useDataService();
  const [year, setYear] = useState(() => dataService.now().getFullYear());
  const [month, setMonth] = useState(() => dataService.now().getMonth());

  // The current month moves with the app clock (a new month, or a simulated date): follow it.
  const currentMonth = useRef({ year, month });
  useEffect(
    () =>
      dataService.subscribe(() => {
        const now = dataService.now();
        const next = { year: now.getFullYear(), month: now.getMonth() };
        if (next.year === currentMonth.current.year && next.month === currentMonth.current.month) return;
        currentMonth.current = next;
        setYear(next.year);
        setMonth(next.month);
      }),
    [dataService]
  );

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
