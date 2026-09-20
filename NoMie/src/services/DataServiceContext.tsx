import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from 'react';
import type { DataService } from './dataService';

const DataServiceContext = createContext<DataService | null>(null);

/**
 * Makes an already-initialized service available to the tree. Opening the
 * on-device database lives in `AppDataServiceProvider`, so the test
 * harness can provide its in-memory service without loading expo-sqlite.
 */
export function DataServiceProvider({
  children,
  dataService,
}: {
  children: React.ReactNode;
  dataService: DataService;
}) {
  return <DataServiceContext.Provider value={dataService}>{children}</DataServiceContext.Provider>;
}

export function useDataService(): DataService {
  const service = useContext(DataServiceContext);
  if (!service) {
    throw new Error('useDataService must be used within a DataServiceProvider');
  }
  return service;
}

/**
 * Runs a read against the data service and keeps it fresh: it re-runs
 * whenever `deps` change and whenever any write lands in the service,
 * because tab screens stay mounted and would otherwise show stale data.
 * Returns `undefined` until the first result arrives.
 */
export function useServiceQuery<T>(
  query: (service: DataService) => Promise<T>,
  deps: DependencyList = []
): T | undefined {
  const service = useDataService();
  const [result, setResult] = useState<T>();
  const latestRequest = useRef(0);

  useEffect(() => {
    let active = true;

    const load = () => {
      const request = ++latestRequest.current;
      query(service).then((value) => {
        // A slower, older read must never overwrite a newer one.
        if (active && request === latestRequest.current) setResult(value);
      });
    };

    load();
    const unsubscribe = service.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [service, ...deps]);

  return result;
}
