/**
 * The arithmetic behind the Bilan annuel charts (#28, #29), kept apart
 * from the drawing so it can be checked without rendering anything.
 */

import { CHART_CATEGORY_COLORS, chartColor, colors } from '../../theme/tokens';

export interface BreakdownItem {
  label: string;
  amount: number;
}

export interface BreakdownSlice extends BreakdownItem {
  /** 0–1 share of the total. */
  share: number;
}

export const OTHERS_LABEL = 'Autres catégories';

/**
 * Largest slices first. Past `maxSlices`, the smallest ones are grouped
 * into a single « Autres catégories » slice — unless only one would be
 * left over, which is then shown as itself.
 */
export function toBreakdown(items: BreakdownItem[], maxSlices = 5): BreakdownSlice[] {
  const sorted = items.filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = sorted.reduce((sum, item) => sum + item.amount, 0);
  const shown =
    sorted.length > maxSlices + 1
      ? [
          ...sorted.slice(0, maxSlices),
          {
            label: OTHERS_LABEL,
            amount: sorted.slice(maxSlices).reduce((sum, item) => sum + item.amount, 0),
          },
        ]
      : sorted;
  return shown.map(({ label, amount }) => ({ label, amount, share: amount / total }));
}

/** One category's spending over the year; `name` is `null` for operations without a category. */
export interface CategorySeries {
  name: string | null;
  /** Twelve amounts, January first. */
  months: number[];
  total: number;
}

export type ExpenseGroupKind = 'category' | 'others' | 'uncategorized';

export interface ExpenseGroupMember {
  label: string;
  total: number;
  share: number;
}

/** One line of the spending chart and of its table — they always show the same lines. */
export interface ExpenseGroup {
  key: string;
  label: string;
  kind: ExpenseGroupKind;
  color: string;
  months: number[];
  total: number;
  /** 0–1 share of the year's spending. */
  share: number;
  /** The categories folded into « Autres », largest first; empty otherwise. */
  members: ExpenseGroupMember[];
}

export const UNCATEGORIZED_LABEL = 'Sans catégorie';

/**
 * Lines of Dépenses par catégorie (§6.7): categories ranked by amount and
 * coloured by rank. Past `topN + 1` categories, the first `topN` stay
 * and the rest fold into « Autres (k) », in taupe. « Sans catégorie » is
 * never folded: always its own line, last.
 */
export function groupExpenses(series: CategorySeries[], topN = 7): ExpenseGroup[] {
  const spent = series.filter((s) => s.total > 0);
  const total = spent.reduce((sum, s) => sum + s.total, 0);
  const share = (amount: number) => amount / total;
  const ranked = spent.filter((s) => s.name !== null).sort((a, b) => b.total - a.total);
  const uncategorized = spent.find((s) => s.name === null);

  const shown = ranked.length > topN + 1 ? ranked.slice(0, topN) : ranked;
  const folded = ranked.slice(shown.length);
  const groups: ExpenseGroup[] = shown.map((s, rank) => ({
    key: s.name!,
    label: s.name!,
    kind: 'category',
    color: chartColor(CHART_CATEGORY_COLORS, rank),
    months: s.months,
    total: s.total,
    share: share(s.total),
    members: [],
  }));
  if (folded.length > 0) {
    const othersTotal = round(folded.reduce((sum, s) => sum + s.total, 0));
    groups.push({
      key: 'others',
      label: `Autres (${folded.length})`,
      kind: 'others',
      color: colors.chartAutres,
      months: Array.from({ length: 12 }, (_, m) => round(folded.reduce((sum, s) => sum + s.months[m], 0))),
      total: othersTotal,
      share: share(othersTotal),
      members: folded.map((s) => ({ label: s.name!, total: s.total, share: share(s.total) })),
    });
  }
  if (uncategorized) {
    groups.push({
      key: 'uncategorized',
      label: UNCATEGORIZED_LABEL,
      kind: 'uncategorized',
      color: colors.chartSansCategorie,
      months: uncategorized.months,
      total: uncategorized.total,
      share: share(uncategorized.total),
      members: [],
    });
  }
  return groups;
}

export interface ValueRange {
  min: number;
  max: number;
}

/**
 * Tight bounds over every series, so a trend stays readable even far
 * from zero. A flat series gets one unit either side.
 */
export function valueRange(series: number[][]): ValueRange {
  const values = series.flat();
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
}

/** SVG path of `values` spread over `width`, `range.max` at the top edge. */
export function linePath(values: number[], range: ValueRange, width: number, height: number): string {
  const y = (value: number) => round(height - ((value - range.min) / (range.max - range.min)) * height);
  if (values.length === 1) return `M0 ${y(values[0])} L${width} ${y(values[0])}`;
  const step = width / (values.length - 1);
  return values.map((value, i) => `${i === 0 ? 'M' : 'L'}${round(i * step)} ${y(value)}`).join(' ');
}

const round = (n: number) => Math.round(n * 100) / 100;
