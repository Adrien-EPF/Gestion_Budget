import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, rounded } from '../theme/tokens';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
}

/** Handoff §6.3 switch: 44×26 track, 20×20 white thumb; `surface-sunken` at rest, `primary` when on. */
export function Switch({ value, onValueChange, accessibilityLabel }: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={[styles.track, { backgroundColor: value ? colors.primary : colors.surfaceSunken }]}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: rounded.full,
    padding: 3,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: rounded.full,
    backgroundColor: colors.surface,
  },
  thumbOn: {
    alignSelf: 'flex-end',
  },
});
