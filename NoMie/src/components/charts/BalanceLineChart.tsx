import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Path } from 'react-native-svg';
import { colors, rounded, spacing, textStyle } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';
import { linePath, valueRange } from './chartGeometry';

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const PLOT_HEIGHT = 140;
/** Keeps the stroke's round caps and thickness inside the drawing area. */
const INSET = 4;

interface BalanceLineChartProps {
  testID: string;
  /** Twelve end-of-month balances, January first. */
  real: number[];
  pointed: number[];
  /** Whose balance it is, for the spoken summary: « tous les comptes », an account name. */
  subject: string;
}

/**
 * Évolution du solde (#28): réel as the main sage line, pointé as a
 * dashed neutral one. The scale hugs the values so a trend reads even far
 * from zero; the zero line only shows when the balance crosses it, and
 * nothing turns red below it.
 */
export function BalanceLineChart({ testID, real, pointed, subject }: BalanceLineChartProps) {
  const [width, setWidth] = useState(0);
  const range = valueRange([real, pointed]);
  const plotWidth = width - 2 * INSET;
  const plotHeight = PLOT_HEIGHT - 2 * INSET;
  const zeroY = plotHeight - ((0 - range.min) / (range.max - range.min)) * plotHeight;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Solde réel de ${subject} : ${formatAmount(real[0])} fin janvier, ${formatAmount(real[11])} fin décembre`}
      style={styles.card}
    >
      <Text style={[textStyle('caption'), styles.axis]}>{formatAmount(range.max)}</Text>
      <View testID={`${testID}-plot`} style={styles.plot} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={PLOT_HEIGHT}>
            <G x={INSET} y={INSET}>
              {range.min < 0 && range.max > 0 && (
                <Line x1={0} x2={plotWidth} y1={zeroY} y2={zeroY} stroke={colors.hairlineStrong} strokeWidth={1} />
              )}
              <Path
                d={linePath(pointed, range, plotWidth, plotHeight)}
                stroke={colors.ash}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeLinejoin="round"
                fill="none"
              />
              <Path
                d={linePath(real, range, plotWidth, plotHeight)}
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </G>
          </Svg>
        )}
      </View>
      <Text style={[textStyle('caption'), styles.axis]}>{formatAmount(range.min)}</Text>
      <View style={styles.months}>
        {MONTH_INITIALS.map((initial, i) => (
          <Text key={i} style={[textStyle('caption'), styles.month]}>
            {initial}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <LegendItem color={colors.primary} label="Réel" />
        <LegendItem color={colors.ash} label="Pointé" dashed />
      </View>
    </View>
  );
}

function LegendItem({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          dashed ? { height: 0, borderColor: color, borderStyle: 'dashed', borderTopWidth: 2 } : { backgroundColor: color },
        ]}
      />
      <Text style={[textStyle('caption'), styles.axis]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    padding: spacing.lg,
    gap: spacing.xxs,
  },
  plot: {
    height: PLOT_HEIGHT,
  },
  axis: {
    color: colors.mute,
    fontVariant: ['tabular-nums'],
  },
  months: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: INSET - 2,
  },
  month: {
    color: colors.ash,
    width: 10,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  legendSwatch: {
    width: 16,
    height: 2,
    borderRadius: rounded.full,
  },
});
