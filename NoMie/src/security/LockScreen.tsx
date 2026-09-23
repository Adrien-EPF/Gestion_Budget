import React, { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, textStyle } from '../theme/tokens';
import { Button } from '../components/Button';
import { ForgotPinSheet } from './ForgotPinSheet';
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
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinConfigured, setPinConfigured] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  // « Code oublié ? » only makes sense on the real app-wide lock (#24, #19 user
  // story 9) — not on this screen's other use as a Réglages re-auth gate
  // (`onCancel` set), where resetting the PIN as a side effect of confirming
  // a *disable* would be surprising and is out of scope.
  const canForgotPin = pinConfigured && !onCancel;

  useEffect(() => {
    if (onCancel) return;
    let cancelled = false;
    securityStore.hasPin().then((hasPin) => {
      if (!cancelled) setPinConfigured(hasPin);
    });
    return () => {
      cancelled = true;
    };
  }, [securityStore, onCancel]);

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
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Image source={require('../../assets/Logo.jpg')} style={styles.logo} />
        <Text style={[textStyle('headingMd'), styles.title]}>{title}</Text>
        {forgotVisible ? null : (
          <>
            <PinDots length={pin.length} />
            <Text style={[textStyle('bodySm'), styles.error, !error && styles.errorHidden]}>
              Code incorrect, réessaie.
            </Text>
            <PinPad onKeyPress={onKeyPress} disabled={busy} />
            {canForgotPin ? (
              <Button
                label="Code oublié ?"
                variant="ghost"
                onPress={() => setForgotVisible(true)}
                style={styles.forgot}
              />
            ) : null}
            {onCancel ? (
              <Button label="Annuler" variant="secondary" onPress={onCancel} style={styles.cancel} />
            ) : null}
          </>
        )}
      </View>
      {canForgotPin ? (
        <ForgotPinSheet
          visible={forgotVisible}
          securityStore={securityStore}
          onClose={() => setForgotVisible(false)}
          onReset={() => {
            setForgotVisible(false);
            onUnlock();
          }}
        />
      ) : null}
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
  forgot: {
    marginTop: spacing.xs,
  },
});
