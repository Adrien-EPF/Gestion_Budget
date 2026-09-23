import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, rounded, spacing, textStyle } from '../theme/tokens';

const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

export interface YearTableRow {
  key: string;
  label: string;
  /** Twelve values, January first. */
  values: number[];
  /** Annual cumul, shown in a last column when the table has one. */
  total?: number;
}

interface YearTableProps {
  /** Each row gets `${testID}-row-${row.key}`, so a test can read one line of the table. */
  testID: string;
  rows: YearTableRow[];
  format: (value: number) => string;
  showTotal?: boolean;
  /** A zero balance is a value; a month without spending is just empty (shown as a dash). */
  showZeros?: boolean;
}

/**
 * A month-by-month table of the Bilan annuel (#25): one line per row,
 * one column per month, then the annual cumul. Twelve columns don't fit a
 * phone's width, so the table scrolls sideways as a whole.
 */
export function YearTable({ testID, rows, format, showTotal = false, showZeros = false }: YearTableProps) {
  return (
    <View testID={testID} style={styles.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.row}>
            <View style={styles.labelCell} />
            {MONTHS_SHORT.map((month) => (
              <Text key={month} style={[textStyle('caption'), styles.cell, styles.headerText]}>
                {month}
              </Text>
            ))}
            {showTotal ? (
              <Text style={[textStyle('caption'), styles.cell, styles.headerText]}>Total</Text>
            ) : null}
          </View>
          {rows.map((row) => (
            <View key={row.key} testID={`${testID}-row-${row.key}`} style={[styles.row, styles.bodyRow]}>
              <Text style={[textStyle('bodySm'), styles.labelCell, styles.label]} numberOfLines={2}>
                {row.label}
              </Text>
              {row.values.map((value, month) => {
                const blank = value === 0 && !showZeros;
                return (
                  <Text key={month} style={[textStyle('bodySm'), styles.cell, blank ? styles.blank : styles.value]}>
                    {blank ? '–' : format(value)}
                  </Text>
                );
              })}
              {showTotal && row.total !== undefined ? (
                <Text style={[textStyle('amountSm'), styles.cell, styles.value]}>{format(row.total)}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    minHeight: 36,
  },
  bodyRow: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  labelCell: {
    width: 128,
    paddingRight: spacing.xs,
  },
  label: {
    color: colors.ink,
  },
  cell: {
    width: 88,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  headerText: {
    color: colors.ash,
  },
  value: {
    color: colors.body,
  },
  blank: {
    color: colors.faint,
  },
});
