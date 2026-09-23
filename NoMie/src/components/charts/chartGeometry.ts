/**
 * The arithmetic behind the Bilan annuel charts (#28, #29), kept apart
 * from the drawing so it can be checked without rendering anything.
 */

import { CHART_CATEGORY_COLORS, chartColor, colors } from '../../theme/tokens';

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

export interface YAxis {
  min: number;
  max: number;
  /** Graduations, top first; zero is always one of them. */
  ticks: number[];
}

/** 100, 200, 250, 500, 1 000, 2 000, 2 500, 5 000, 10 000 €… */
function* roundSteps(): Generator<number> {
  for (let power = 100; ; power *= 10) {
    for (const factor of [1, 2, 2.5, 5]) yield factor * power;
  }
}

/**
 * The balance chart's scale (§6.7): 3 to 5 round graduations that
 * always include 0, so going below zero reads against a fixed line.
 */
export function yAxis(values: number[]): YAxis {
  const low = Math.min(0, ...values);
  const high = Math.max(0, ...values);
  let step = 0;
  for (step of roundSteps()) {
    if (Math.ceil(high / step) - Math.floor(low / step) <= 4) break;
  }
  let min = Math.floor(low / step) * step;
  let max = Math.ceil(high / step) * step;
  if ((max - min) / step < 2) {
    if (max > 0 || min === 0) max = min + 2 * step;
    else min = max - 2 * step;
  }
  const ticks: number[] = [];
  for (let tick = max; tick >= min; tick -= step) ticks.push(tick);
  return { min, max, ticks };
}

/**
 * SVG path through months `from`…`to`, each at the middle of its twelfth
 * of `width`, `scale.max` at the top edge. A month without a value is
 * skipped.
 */
export function columnPath(
  values: (number | null)[],
  from: number,
  to: number,
  scale: { min: number; max: number },
  width: number,
  height: number
): string {
  const points: string[] = [];
  for (let month = from; month <= to; month++) {
    const value = values[month];
    if (value === null || value === undefined) continue;
    const x = round(((month + 0.5) / 12) * width);
    const y = round(((scale.max - value) / (scale.max - scale.min)) * height);
    points.push(`${points.length === 0 ? 'M' : 'L'}${x} ${y}`);
  }
  return points.join(' ');
}

const round = (n: number) => Math.round(n * 100) / 100;
