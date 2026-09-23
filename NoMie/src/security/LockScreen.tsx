import React, { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, textStyle } from '../theme/tokens';
import { Button } from '../components/Button';
import { PIN_LENGTH, PinDots, PinPad, type PinKey } from './PinPad';
import type { SecurityStore } from './security';

interface LockScreenProps {
  biometricEnabled: boolean;
  securityStore: SecurityStore;
  onUnlock: () => void;
  title?: string;
  /**
   * When set, an "Annuler" button lets the caller back out — used when this
   * screen is reused as a re-authentication gate from Réglages (#23), where
   * backing out must be possible, unlike the real app-wide lock.
   */
  onCancel?: () => void;
}

/**
 * Full-screen lock (#19 user stories 1-5): tries biometrics automatically
 * when enabled, the PIN pad is always the fallback. A wrong PIN never says
 * which digit is wrong and can be retried without limit. The Android back
 * button is swallowed (`onRequestClose`) when there is no `onCancel`, so it
 * can't be used to bypass the real lock.
 */
export function LockScreen({
  biometricEnabled,
  securityStore,
  onUnlock,
  title = 'NoMie est verrouillé',
  onCancel,
}: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!biometricEnabled) return;
    let cancelled = false;
    securityStore.authenticateWithBiometrics('Déverrouille NoMie').then((success) => {
      if (!cancelled && success) onUnlock();
    });
    return () => {
      cancelled = true;
    };
  }, [biometricEnabled, securityStore, onUnlock]);

  const submit = async (candidate: string) => {
    setBusy(true);
    const ok = await securityStore.verifyPin(candidate);
    if (ok) {
      onUnlock();
      return;
    }
    setError(true);
    setPin('');
    setBusy(false);
  };

  const onKeyPress = (key: PinKey) => {
    if (busy) return;
    setError(false);
    if (key === 'backspace') {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => {
      if (current.length >= PIN_LENGTH) return current;
      const next = current + key;
      if (next.length === PIN_LENGTH) submit(next);
      return next;
    });
  };

  return (
    <Modal
      visible
      transparent={false}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel ?? (() => {})}
    >
      <View style={styles.root}>
        <Image source={require('../../assets/Logo.jpg')} style={styles.logo} />
        <Text style={[textStyle('headingMd'), styles.title]}>{title}</Text>
        <PinDots length={pin.length} />
        <Text style={[textStyle('bodySm'), styles.error, !error && styles.errorHidden]}>
          Code incorrect, réessaie.
        </Text>
        <PinPad onKeyPress={onKeyPress} disabled={busy} />
        {onCancel ? (
          <Button label="Annuler" variant="secondary" onPress={onCancel} style={styles.cancel} />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  title: {
    color: colors.ink,
  },
  error: {
    color: colors.amountNegative,
    minHeight: 18,
  },
  errorHidden: {
    opacity: 0,
  },
  cancel: {
    marginTop: spacing.xs,
  },
});
