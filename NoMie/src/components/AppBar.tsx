import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, textStyle } from '../theme/tokens';
import { useMonth } from '../navigation/MonthContext';
import { formatMonthLabel } from '../navigation/formatMonthLabel';

interface AppBarProps {
  title: string;
  /** Only Accueil and Budgets show the month selector (handoff §5). */
  showMonthSelector?: boolean;
}

export function AppBar({ title, showMonthSelector = false }: AppBarProps) {
  // Android draws edge-to-edge: the bar's background runs under the status bar, its content stays below it.
  const { top } = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + top, paddingTop: top }]}>
      <Image source={require('../../assets/Logo.jpg')} style={styles.logo} />
      <Text testID="app-bar-title" style={[textStyle('headingMd'), styles.title]} numberOfLines={1}>
        {title}
      </Text>
      {showMonthSelector ? <MonthSelector /> : null}
    </View>
  );
}

function MonthSelector() {
  const { year, month, goToPreviousMonth, goToNextMonth } = useMonth();

  return (
    <View style={styles.monthSelector}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mois précédent"
        onPress={goToPreviousMonth}
        style={styles.chevronButton}
      >
        <Text style={[textStyle('bodyLg'), styles.chevronText]}>‹</Text>
      </Pressable>
      <Text testID="month-label" style={[textStyle('caption'), styles.monthLabel]}>
        {formatMonthLabel(year, month)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mois suivant"
        onPress={goToNextMonth}
        style={styles.chevronButton}
      >
        <Text style={[textStyle('bodyLg'), styles.chevronText]}>›</Text>
      </Pressable>
    </View>
  );
}

const BAR_HEIGHT = 56;

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  logo: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  title: {
    color: colors.ink,
    letterSpacing: -0.2,
    flex: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  chevronButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    color: colors.mute,
  },
  monthLabel: {
    color: colors.ink,
    minWidth: 100,
    textAlign: 'center',
  },
});
