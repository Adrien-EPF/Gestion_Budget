import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoFocus?: boolean;
  /** Sober message under the field — in `amount-negative`, never red, no alert icon (handoff §7). */
  error?: string | null;
}

/** DESIGN.md `text-input`: 52px, radius 12, `hairline` at rest and `primary` on focus. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoFocus,
  error,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[textStyle('caption'), styles.label]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          textStyle('bodyLg'),
          styles.input,
          { borderColor: focused ? colors.primary : colors.hairline },
        ]}
      />
      {error ? <Text style={[textStyle('bodySm'), styles.error]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xxs,
  },
  label: {
    color: colors.ash,
  },
  input: {
    height: 52,
    backgroundColor: colors.surface,
    color: colors.ink,
    borderWidth: 1,
    borderRadius: rounded.md,
    paddingHorizontal: 14,
  },
  error: {
    color: colors.amountNegative,
  },
});
