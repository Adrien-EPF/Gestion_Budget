import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies, rounded, spacing, textStyle } from '../theme/tokens';
import { Switch } from './Switch';

interface SettingsGroupProps {
  title: string;
  /** Optional note under the container, in `mute`. */
  note?: string;
  children: React.ReactNode;
}

/** A Réglages group (handoff §6.5): uppercase caption, a rounded container of rows, an optional note. */
export function SettingsGroup({ title, note, children }: SettingsGroupProps) {
  const rows = React.Children.toArray(children);
  return (
    <View style={styles.group}>
      <Text style={[textStyle('caption'), styles.title]}>{title.toUpperCase()}</Text>
      <View style={styles.container}>
        {rows.map((row, index) => (
          <View key={index} style={index > 0 && styles.divider}>
            {row}
          </View>
        ))}
      </View>
      {note ? <Text style={[textStyle('bodySm'), styles.note]}>{note}</Text> : null}
    </View>
  );
}

interface RowTextProps {
  label: string;
  hint?: string;
}

function RowText({ label, hint }: RowTextProps) {
  return (
    <View style={styles.text}>
      <Text style={[textStyle('bodyLg'), styles.label]}>{label}</Text>
      {hint ? <Text style={[textStyle('bodySm'), styles.hint]}>{hint}</Text> : null}
    </View>
  );
}

interface SwitchRowProps extends RowTextProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** A row with a switch on its right; the switch is named after the row. */
export function SwitchRow({ label, hint, value, onValueChange }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <RowText label={label} hint={hint} />
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

interface LinkRowProps extends RowTextProps {
  /** Without it the row is shown but inert — its destination isn't built yet. */
  onPress?: () => void;
}

/** A row with a chevron on its right. */
export function LinkRow({ label, hint, onPress }: LinkRowProps) {
  const enabled = onPress !== undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.canvas }]}
    >
      <RowText label={label} hint={hint} />
      <Text style={[textStyle('bodyLg'), { color: enabled ? colors.ash : colors.faint }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  title: {
    color: colors.ash,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.ink,
    fontFamily: fontFamilies.medium,
  },
  hint: {
    color: colors.ash,
  },
  note: {
    color: colors.mute,
  },
});
