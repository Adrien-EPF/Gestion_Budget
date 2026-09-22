import React, { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, textStyle } from '../theme/tokens';
import { PinPad, type PinKey } from './PinPad';
import type { SecurityStore } from './security';

const PIN_LENGTH = 4;

interface LockScreenProps {
  biometricEnabled: boolean;
  securityStore: SecurityStore;
  onUnlock: () => void;
}

/**
 * Full-screen lock (#19 user stories 1-5): tries biometrics automatically
 * when enabled, the PIN pad is always the fallback. A wrong PIN never says
 * which digit is wrong and can be retried without limit. The Android back
 * button is swallowed (`onRequestClose`), so it can't be used to bypass it.
 */
export function LockScreen({ biometricEnabled, securityStore, onUnlock }: LockScreenProps) {
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
    <Modal visible transparent={false} animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.root}>
        <Image source={require('../../assets/Logo.jpg')} style={styles.logo} />
        <Text style={[textStyle('headingMd'), styles.title]}>NoMie est verrouillé</Text>
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <View key={index} style={[styles.dot, index < pin.length && styles.dotFilled]} />
          ))}
        </View>
        <Text style={[textStyle('bodySm'), styles.error, !error && styles.errorHidden]}>
          Code incorrect, réessaie.
        </Text>
        <PinPad onKeyPress={onKeyPress} disabled={busy} />
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
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.surface,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  error: {
    color: colors.amountNegative,
    minHeight: 18,
  },
  errorHidden: {
    opacity: 0,
  },
});
