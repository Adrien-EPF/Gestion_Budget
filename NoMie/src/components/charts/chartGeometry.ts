/**
 * The arithmetic behind the Bilan annuel charts (#28, #29), kept apart
 * from the drawing so it can be checked without rendering anything.
 */

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
