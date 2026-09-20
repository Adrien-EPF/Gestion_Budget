import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, rounded, textStyle } from '../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** DESIGN.md `button-primary` / `button-secondary` / `button-ghost`: 48px, pill-shaped. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && {
          backgroundColor: pressed ? colors.primaryDeep : colors.primary,
        },
        variant === 'secondary' && styles.secondary,
        variant === 'secondary' && pressed && { backgroundColor: colors.surfaceSoft },
        variant === 'ghost' && pressed && { backgroundColor: colors.primarySoft },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          textStyle('button'),
          { color: variant === 'primary' ? colors.onPrimary : variant === 'ghost' ? colors.primary : colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: rounded.full,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  disabled: {
    opacity: 0.45,
  },
});
