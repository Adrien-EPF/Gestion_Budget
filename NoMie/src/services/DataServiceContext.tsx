import React, { createContext, useContext, useEffect, useState } from 'react';
import { openExpoSqliteDatabase } from '../db/expoSqliteDatabase';
import { createDataService, type DataService } from './dataService';

const DataServiceContext = createContext<DataService | null>(null);

export function DataServiceProvider({ children }: { children: React.ReactNode }) {
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

  return <DataServiceContext.Provider value={dataService}>{children}</DataServiceContext.Provider>;
}

export function useDataService(): DataService {
  const service = useContext(DataServiceContext);
  if (!service) {
    throw new Error('useDataService must be used within a DataServiceProvider');
  }
  return service;
}
