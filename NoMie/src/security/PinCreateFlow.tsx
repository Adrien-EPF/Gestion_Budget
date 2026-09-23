import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { colors, spacing, textStyle } from '../theme/tokens';
import { PIN_LENGTH, PinDots, PinPad, type PinKey } from './PinPad';

interface PinCreateFlowProps {
  /** Heading for the first step ("Crée ton code PIN" / "Nouveau code PIN"); the confirm step's heading is fixed. */
  createTitle: string;
  onConfirmed: (pin: string) => void;
  onClose: () => void;
}

/**
 * Shared two-step "pick a 4-digit PIN, then confirm it" wizard (#19, #23,
 * #24) — used both when creating a PIN from Réglages (`PinSetupSheet`) and
 * when replacing one via « Code oublié ? » (`ForgotPinSheet`).
 */
export function PinCreateFlow({ createTitle, onConfirmed, onClose }: PinCreateFlowProps) {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [candidate, setCandidate] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const onCreateKeyPress = (key: PinKey) => {
    if (key === 'backspace') {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => {
      if (current.length >= PIN_LENGTH) return current;
      const next = current + key;
      if (next.length === PIN_LENGTH) setStep('confirm');
      return next;
    });
  };

  const onConfirmKeyPress = (key: PinKey) => {
    if (key === 'backspace') {
      setCandidate((current) => current.slice(0, -1));
      return;
    }
    if (candidate.length >= PIN_LENGTH) return;
    const next = candidate + key;
    if (next.length < PIN_LENGTH) {
      setCandidate(next);
      return;
    }
    if (next === pin) {
      onConfirmed(next);
    } else {
      setMismatch(true);
      setPin('');
      setStep('create');
      setCandidate('');
    }
  };

  if (step === 'create') {
    return (
      <View style={styles.form}>
        <Text style={[textStyle('headingMd'), styles.title]}>{createTitle}</Text>
        <Text style={[textStyle('bodyMd'), styles.body]}>Choisis un code à 4 chiffres.</Text>
        <PinDots length={pin.length} />
        <Text style={[textStyle('bodySm'), styles.error, !mismatch && styles.errorHidden]}>
          Les deux codes ne correspondaient pas, recommence.
        </Text>
        <PinPad onKeyPress={onCreateKeyPress} />
        <Button label="Annuler" variant="secondary" onPress={onClose} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Confirme ton code PIN</Text>
      <Text style={[textStyle('bodyMd'), styles.body]}>Saisis-le une seconde fois.</Text>
      <PinDots length={candidate.length} />
      <PinPad onKeyPress={onConfirmKeyPress} />
      <Button label="Annuler" variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    color: colors.ink,
    alignSelf: 'flex-start',
  },
  body: {
    color: colors.mute,
    alignSelf: 'flex-start',
  },
  error: {
    color: colors.amountNegative,
  },
  errorHidden: {
    opacity: 0,
  },
});
