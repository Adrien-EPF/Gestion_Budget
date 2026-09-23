import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamilies, rounded, textStyle } from '../theme/tokens';

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DASH = '—';

export interface YearTableRow {
  key: string;
  label: string;
  /** The row's colour on the chart above the table; no dot without one. */
  color?: string;
  /** Twelve values, January first. */
  values: number[];
  /** Annual cumul, shown in a last column when the table has one. */
  total?: number;
  /** The Total line. */
  bold?: boolean;
}

interface YearTableProps {
  /**
   * A row's values get `${testID}-row-${row.key}` and its label
   * `${testID}-label-${row.key}`: the label column stays put while the
   * months scroll, so they are two separate views.
   */
  testID: string;
  /** Heading of the label column: « Catégorie », « Solde réel »… */
  heading: string;
  rows: YearTableRow[];
  format: (value: number) => string;
  showTotal?: boolean;
  /** A zero balance is a value; a month without spending is just empty (shown as a dash). */
  showZeros?: boolean;
  /** First month (0-11) whose values are forecasts, shown in `ash`. */
  forecastFrom?: number;
}

/**
 * A month-by-month table of the Bilan annuel (handoff §6.7 « Tableaux
 * mois par mois »): the label column stays in place, twelve months and
 * the annual total scroll sideways behind it.
 */
export function YearTable({
  testID,
  heading,
  rows,
  format,
  showTotal = false,
  showZeros = false,
  forecastFrom = 12,
}: YearTableProps) {
  return (
    <View testID={testID} style={styles.card}>
      <View style={styles.labelColumn}>
        <View style={styles.headerRow}>
          <Text style={[textStyle('caption'), styles.headerText]}>{heading}</Text>
        </View>
        {rows.map((row) => (
          <View key={row.key} testID={`${testID}-label-${row.key}`} style={[styles.bodyRow, styles.labelCell]}>
            {row.color ? <View style={[styles.dot, { backgroundColor: row.color }]} /> : <View style={styles.dot} />}
            <Text numberOfLines={1} style={[textStyle('bodySm'), styles.label, row.bold && styles.bold]}>
              {row.label}
            </Text>
          </View>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.headerRow, styles.valueRow]}>
            {MONTHS_SHORT.map((month) => (
              <Text key={month} style={[textStyle('caption'), styles.cell, styles.headerText]}>
                {month}
              </Text>
            ))}
            {showTotal ? <Text style={[textStyle('caption'), styles.cell, styles.headerText]}>Total</Text> : null}
          </View>
          {rows.map((row) => (
            <View key={row.key} testID={`${testID}-row-${row.key}`} style={[styles.bodyRow, styles.valueRow]}>
              {row.values.map((value, month) => (
                <Cell
                  key={month}
                  text={value === 0 && !showZeros ? null : format(value)}
                  color={value < 0 ? colors.amountNegative : month >= forecastFrom ? colors.ash : colors.ink}
                  bold={row.bold}
                />
              ))}
              {showTotal && row.total !== undefined ? (
                <Cell
                  text={format(row.total)}
                  color={row.total < 0 ? colors.amountNegative : colors.ink}
                  bold
                />
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/** A `null` text is an empty cell: a dash in `faint`. */
function Cell({ text, color, bold = false }: { text: string | null; color: string; bold?: boolean }) {
  return (
    <Text
      style={[
        textStyle('bodySm'),
        styles.cell,
        { color: text === null ? colors.faint : color },
        bold && styles.bold,
      ]}
    >
      {text ?? DASH}
    </Text>
  );
}

const ROW_HEIGHT = 44;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  labelColumn: {
    width: 124,
  },
  headerRow: {
    height: 40,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 0,
  },
  bodyRow: {
    height: ROW_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  labelCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 3,
  },
  label: {
    flex: 1,
    color: colors.ink,
  },
  bold: {
    fontFamily: fontFamilies.semiBold,
  },
  cell: {
    width: 92,
    paddingRight: 12,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  headerText: {
    color: colors.ash,
  },
});
