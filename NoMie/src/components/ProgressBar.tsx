import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, rounded } from '../theme/tokens';

interface ProgressBarProps {
  /** 0–1; anything beyond is clipped so the fill never leaves its track. */
  ratio: number;
  color: string;
  testID?: string;
}

/** Handoff §6.3 `progress-track`: 8px, `surface-sunken` track, pill-shaped fill. */
export function ProgressBar({ ratio, color, testID }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={styles.track}
    >
      <View
        testID={testID}
        style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: rounded.full,
  },
});
