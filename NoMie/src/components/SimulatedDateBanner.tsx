import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServiceQuery } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { toTypedDate } from '../utils/dates';

/** Permanent notice while the app clock is moved: a test must never be mistaken for the real date. */
export function SimulatedDateBanner() {
  const clock = useServiceQuery((s) => s.getSimulatedClock());
  const { top } = useSafeAreaInsets();
  if (!clock?.simulatedDate) return null;

  return (
    <View style={[styles.banner, { paddingTop: top + spacing.xs }]}>
      <Text style={[textStyle('caption'), styles.text]}>
        {`Date simulée : ${toTypedDate(clock.simulatedDate)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.statusPrevisionSoft,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  text: {
    color: colors.statusPrevision,
  },
});
