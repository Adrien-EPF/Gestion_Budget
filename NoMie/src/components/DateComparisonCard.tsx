import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DateComparison } from '../services/dataService';
import { colors, rounded, shadows, spacing, textStyle } from '../theme/tokens';
import { describeComparedAmounts, describeDateComparison } from '../utils/dateComparisonCopy';
import { IMPORTANCE_LABELS } from '../utils/importanceCopy';

const UNCATEGORIZED = 'Sans catégorie';

interface DateComparisonCardProps {
  comparison: DateComparison;
  testID: string;
}

/**
 * Comparaison à date: one factual sentence, and under a tap the same comparison per
 * category and per importance. No colour and no verdict: more or less than usual is just a fact.
 */
export function DateComparisonCard({ comparison, testID }: DateComparisonCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <View testID={testID} style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Détail de la comparaison"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.summary}
      >
        <Text testID={`${testID}-summary`} style={[textStyle('bodyMd'), styles.sentence]}>
          {describeDateComparison(comparison)}
        </Text>
        <Text style={[textStyle('caption'), styles.chevron]}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open ? (
        <View testID={`${testID}-detail`} style={styles.detail}>
          <Text style={[textStyle('headingSm'), styles.heading]}>Par importance</Text>
          {comparison.byImportance.map((line) => (
            <Line key={line.importance} label={IMPORTANCE_LABELS[line.importance]} {...line} />
          ))}
          <Text style={[textStyle('headingSm'), styles.heading, styles.headingGap]}>Par catégorie</Text>
          {comparison.byCategory.map((line) => (
            <Line key={String(line.categoryId)} label={line.name ?? UNCATEGORIZED} {...line} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Line({ label, current, average }: { label: string; current: number; average: number }) {
  return (
    <View style={styles.line}>
      <Text numberOfLines={1} style={[textStyle('bodyMd'), styles.label]}>
        {label}
      </Text>
      <Text style={[textStyle('bodySm'), styles.values]}>{describeComparedAmounts({ current, average })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    ...shadows.card,
    padding: spacing.lg,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
  },
  sentence: {
    flex: 1,
    color: colors.ink,
  },
  chevron: {
    color: colors.ash,
  },
  detail: {
    marginTop: spacing.sm,
    gap: spacing.xxs,
  },
  heading: {
    color: colors.ink,
  },
  headingGap: {
    marginTop: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  label: {
    flex: 1,
    color: colors.ink,
  },
  values: {
    color: colors.mute,
    fontVariant: ['tabular-nums'],
  },
});
