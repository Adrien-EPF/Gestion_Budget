import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useServiceQuery } from '../services/DataServiceContext';
import { LockScreen } from './LockScreen';
import { useSecurityStore } from './SecurityStoreContext';

/**
 * Sits above `RootNavigator` (#19 Implementation Decisions): children stay
 * mounted at all times, so no screen loses its state while locked (user
 * story 11). Locks before the settings are known yet — never a flash of
 * unprotected content — and again every time the app returns from the
 * background (user story 2).
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const securityStore = useSecurityStore();
  const settings = useServiceQuery((s) => s.getSettings());
  const settingsLoaded = settings !== undefined;
  const lockRequired = settingsLoaded && (settings.pinEnabled || settings.biometricEnabled);
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    if (settingsLoaded && !lockRequired) setLocked(false);
  }, [settingsLoaded, lockRequired]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && lockRequired) setLocked(true);
    });
    return () => subscription.remove();
  }, [lockRequired]);

  const unlock = useCallback(() => setLocked(false), []);

  const showLockScreen = locked && (!settingsLoaded || lockRequired);

  return (
    <View style={styles.container}>
      {children}
      {showLockScreen ? (
        <LockScreen
          biometricEnabled={!!settings?.biometricEnabled}
          securityStore={securityStore}
          onUnlock={unlock}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
