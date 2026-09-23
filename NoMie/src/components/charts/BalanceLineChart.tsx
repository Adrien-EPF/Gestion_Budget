import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, rounded, spacing, textStyle } from '../../theme/tokens';
import { formatAmount } from '../../utils/formatAmount';
import { describeBelowZero, forecastLegend, monthEndLabel } from '../../utils/yearReportCopy';
import { columnPath, yAxis } from './chartGeometry';
import { MonthLetters, MonthStepper } from './MonthStepper';

const ZONE_HEIGHT = 200;
const PLOT_TOP = 20;
const PLOT_BOTTOM = 28;
const PLOT_HEIGHT = ZONE_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
const FORECAST_OPACITY = 0.4;

export interface BalanceChartAccount {
  id: number;
  name: string;
  color: string;
  /** Twelve end-of-month balances, January first. Réel includes the Prévisions. */
  real: number[];
  pointed: number[];
}

interface BalanceLineChartProps {
  /**
   * The plot is `${testID}-plot`, the band under zero
   * `${testID}-below-zero`, each account's reading `${testID}-reading-${id}`.
   */
  testID: string;
  /** In the user's order, each with its colour. */
  accounts: BalanceChartAccount[];
  /** Last month realized (0-11); `null` for a year to come. Later months are forecasts. */
  lastMonth: number | null;
}

type Mode = 'real' | 'pointed';

interface Curve {
  key: string;
  color: string;
  values: (number | null)[];
  /** Réel runs on through the forecasts, lighter; pointé stops at the last month realized. */
  forecast: boolean;
  dashed: boolean;
}

/**
 * Évolution du solde (handoff §6.7, graphique 2): one curve per account,
 * twelve month-ends, on a round scale that always shows 0. Below zero a
 * curve keeps its colour — the zero line and a sentence tell it, never
 * red. A month is read in a fixed zone under the chart, picked from its
 * column or the stepper.
 */
export function BalanceLineChart({ testID, accounts, lastMonth }: BalanceLineChartProps) {
  const realized = lastMonth ?? -1;
  const [width, setWidth] = useState(0);
  const [mode, setMode] = useState<Mode>('real');
  const [isolatedId, setIsolatedId] = useState<number | null>(null);
  const [month, setMonth] = useState(lastMonth ?? 0);

  const single = accounts.length === 1;
  const visible = accounts.filter((a) => isolatedId === null || a.id === isolatedId);
  const pointedSoFar = (a: BalanceChartAccount) => a.pointed.map((v, m) => (m <= realized ? v : null));
  const curves: Curve[] = single
    ? [
        { key: 'real', color: accounts[0].color, values: accounts[0].real, forecast: true, dashed: false },
        { key: 'pointed', color: accounts[0].color, values: pointedSoFar(accounts[0]), forecast: false, dashed: true },
      ]
    : visible.map((a) => ({
        key: String(a.id),
        color: a.color,
        values: mode === 'real' ? a.real : pointedSoFar(a),
        forecast: mode === 'real',
        dashed: false,
      }));

  const axis = yAxis(curves.flatMap((c) => c.values.filter((v): v is number => v !== null)));
  const y = (value: number) => ((axis.max - value) / (axis.max - axis.min)) * PLOT_HEIGHT;
  const x = (m: number) => ((m + 0.5) / 12) * width;
  const belowZero = describeBelowZero(visible, lastMonth);

  return (
    <View testID={testID} style={styles.card}>
      {!single && (
        <View style={styles.segmented}>
          {(['real', 'pointed'] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={m === 'real' ? 'Réel' : 'Pointé'}
              accessibilityState={{ selected: mode === m }}
              onPress={() => setMode(m)}
              style={[styles.segment, mode === m && styles.segmentActive]}
            >
              <Text style={[textStyle('bodyMdMedium'), { color: mode === m ? colors.ink : colors.mute }]}>
                {m === 'real' ? 'Réel' : 'Pointé'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.zone}>
        <View
          testID={`${testID}-plot`}
          style={styles.plot}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          {axis.min < 0 && (
            <View testID={`${testID}-below-zero`} style={[styles.belowZero, { top: y(0) }]} />
          )}
          {axis.ticks.map((tick) => (
            <View
              key={tick}
              style={[
                styles.tick,
                { top: y(tick), borderTopColor: tick === 0 && axis.min < 0 ? colors.hairlineStrong : colors.hairline },
              ]}
            >
              <Text style={[textStyle('caption'), styles.tickLabel]}>{formatAmount(tick, { whole: true })}</Text>
            </View>
          ))}
          {width > 0 && (
            <Svg width={width} height={PLOT_HEIGHT} style={StyleSheet.absoluteFill}>
              <Line x1={x(month)} x2={x(month)} y1={0} y2={PLOT_HEIGHT} stroke={colors.hairlineStrong} strokeWidth={1} />
              {curves.flatMap((curve) => {
                const stroke = {
                  stroke: curve.color,
                  strokeWidth: 2,
                  strokeLinecap: 'round' as const,
                  strokeLinejoin: 'round' as const,
                  strokeDasharray: curve.dashed ? '3 4' : undefined,
                  fill: 'none',
                };
                const path = (from: number, to: number) => columnPath(curve.values, from, to, axis, width, PLOT_HEIGHT);
                return [
                  realized >= 0 ? <Path key={`${curve.key}-realized`} d={path(0, realized)} {...stroke} /> : null,
                  curve.forecast && realized < 11 ? (
                    <Path
                      key={`${curve.key}-forecast`}
                      d={path(Math.max(realized, 0), 11)}
                      {...stroke}
                      strokeOpacity={FORECAST_OPACITY}
                    />
                  ) : null,
                ];
              })}
              {curves.map((curve) => {
                const value = curve.values[month];
                return value === null ? null : (
                  <Circle
                    key={curve.key}
                    cx={x(month)}
                    cy={y(value)}
                    r={4}
                    fill={colors.surface}
                    stroke={curve.color}
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>
          )}
          <View style={styles.columns}>
            {Array.from({ length: 12 }, (_, m) => (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityLabel={monthEndLabel(m)}
                onPress={() => setMonth(m)}
                style={styles.column}
              />
            ))}
          </View>
        </View>
        <View style={styles.letters}>
          <MonthLetters selected={month} />
        </View>
      </View>

      {single ? (
        <View style={styles.legend}>
          <LegendLine color={accounts[0].color} label="Réel" />
          <LegendLine color={accounts[0].color} label="Pointé" dashed />
        </View>
      ) : (
        <>
          <View style={styles.chips}>
            {accounts.map((a) => {
              const isolated = isolatedId === a.id;
              const dimmed = isolatedId !== null && !isolated;
              return (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityLabel={a.name}
                  accessibilityState={{ selected: isolated }}
                  onPress={() => setIsolatedId(isolated ? null : a.id)}
                  style={styles.chipTarget}
                >
                  <View style={[styles.chip, { backgroundColor: isolated ? colors.primarySoft : colors.surfaceSoft }]}>
                    <View style={[styles.chipStroke, { backgroundColor: a.color, opacity: dimmed ? 0.35 : 1 }]} />
                    <Text
                      style={[
                        textStyle('bodySm'),
                        { color: dimmed ? colors.ash : isolated ? colors.primaryDeep : colors.ink },
                      ]}
                    >
                      {a.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={[textStyle('bodySm'), styles.ash]}>
            {isolatedId === null ? 'Touche un compte pour l’isoler.' : 'Touche à nouveau pour revoir tous les comptes.'}
          </Text>
        </>
      )}
      {realized < 11 && (
        <View style={styles.legendRow}>
          <View style={[styles.legendStroke, { borderTopColor: accounts[0].color, opacity: FORECAST_OPACITY }]} />
          <Text style={[textStyle('bodySm'), styles.ash]}>{forecastLegend(lastMonth)}</Text>
        </View>
      )}

      <View style={styles.reading}>
        <MonthStepper
          month={month}
          onChange={setMonth}
          title={monthEndLabel(month)}
          pill={
            month > realized
              ? { label: 'Prévision', color: colors.statusPrevision, background: colors.statusPrevisionSoft }
              : null
          }
        />
        {visible.map((a) => {
          const real = a.real[month];
          const pointed = month <= realized ? a.pointed[month] : null;
          const showsPointed = mode === 'pointed' && !single;
          const value = showsPointed ? (pointed ?? real) : real;
          return (
            <View key={a.id} testID={`${testID}-reading-${a.id}`} style={styles.readingRow}>
              <View style={[styles.dot, { backgroundColor: a.color }]} />
              <Text numberOfLines={1} style={[textStyle('bodyMdMedium'), styles.readingName]}>
                {a.name}
              </Text>
              <View style={styles.readingValues}>
                <Text
                  style={[textStyle('amountSm'), styles.tabular, { color: value < 0 ? colors.amountNegative : colors.ink }]}
                >
                  {formatAmount(value)}
                </Text>
                <Text style={[textStyle('bodySm'), styles.ash, styles.tabular]}>
                  {showsPointed
                    ? `Réel ${formatAmount(real)}`
                    : pointed === null
                      ? 'Rien de pointé à cette date'
                      : `Pointé ${formatAmount(pointed)}`}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      {belowZero ? <Text style={[textStyle('bodySm'), styles.mute, styles.note]}>{belowZero}</Text> : null}
    </View>
  );
}

function LegendLine({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendStroke, { borderTopColor: color, borderStyle: dashed ? 'dashed' : 'solid' }]} />
      <Text style={[textStyle('bodySm'), styles.mute]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  segmented: {
    height: 48,
    flexDirection: 'row',
    padding: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.full,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  zone: {
    height: ZONE_HEIGHT,
    marginTop: spacing.sm,
  },
  plot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PLOT_TOP,
    height: PLOT_HEIGHT,
  },
  belowZero: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.chartSousZero,
  },
  tick: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
  },
  tickLabel: {
    position: 'absolute',
    left: 0,
    bottom: 3,
    paddingRight: 4,
    color: colors.ash,
    fontVariant: ['tabular-nums'],
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  columns: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  letters: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  legendStroke: {
    width: 16,
    height: 0,
    borderTopWidth: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 4,
    marginTop: spacing.xxs,
  },
  chipTarget: {
    height: 48,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: rounded.full,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipStroke: {
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  reading: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    marginTop: spacing.sm,
  },
  readingRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: rounded.full,
  },
  readingName: {
    flex: 1,
    color: colors.ink,
  },
  readingValues: {
    alignItems: 'flex-end',
  },
  note: {
    paddingTop: spacing.xxs,
    paddingBottom: spacing.sm,
  },
  ash: {
    color: colors.ash,
  },
  mute: {
    color: colors.mute,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
