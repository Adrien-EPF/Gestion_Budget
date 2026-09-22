import React, { createContext, useContext } from 'react';
import type { SecurityStore } from './security';

const SecurityStoreContext = createContext<SecurityStore | null>(null);

/** Makes the security store available to the tree, the same way the notification scheduler is provided. */
export function SecurityStoreProvider({
  children,
  securityStore,
}: {
  children: React.ReactNode;
  securityStore: SecurityStore;
}) {
  return <SecurityStoreContext.Provider value={securityStore}>{children}</SecurityStoreContext.Provider>;
}

export function useSecurityStore(): SecurityStore {
  const store = useContext(SecurityStoreContext);
  if (!store) {
    throw new Error('useSecurityStore must be used within a SecurityStoreProvider');
  }
  return store;
}
