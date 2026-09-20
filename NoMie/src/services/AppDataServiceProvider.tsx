import React, { useEffect, useState } from 'react';
import { openExpoSqliteDatabase } from '../db/expoSqliteDatabase';
import { DataServiceProvider } from './DataServiceContext';
import { createDataService, type DataService } from './dataService';

/** Opens the on-device SQLite database once, then renders the app against it. */
export function AppDataServiceProvider({ children }: { children: React.ReactNode }) {
  const [dataService, setDataService] = useState<DataService | null>(null);

  useEffect(() => {
    let cancelled = false;
    openExpoSqliteDatabase('nomie.db')
      .then(createDataService)
      .then(async (service) => {
        await service.initialize();
        if (!cancelled) setDataService(service);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!dataService) return null;

  return <DataServiceProvider dataService={dataService}>{children}</DataServiceProvider>;
}
