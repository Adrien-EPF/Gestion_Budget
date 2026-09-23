import { colors } from '../../theme/tokens';
import { groupExpenses, linePath, valueRange } from './chartGeometry';

const months = (entries: Record<number, number>) => {
  const values = Array<number>(12).fill(0);
  for (const [month, value] of Object.entries(entries)) values[Number(month)] = value;
  return values;
};
const series = (name: string | null, total: number, byMonth: Record<number, number> = { 0: total }) => ({
  name,
  months: months(byMonth),
  total,
});

describe('chartGeometry', () => {
  describe('valueRange', () => {
    it('spans every value of every series', () => {
      expect(valueRange([[3, 8, 5], [1, 4]])).toEqual({ min: 1, max: 8 });
    });

    it('opens a flat series around its value so it can be drawn mid-height', () => {
      expect(valueRange([[100, 100]])).toEqual({ min: 99, max: 101 });
      expect(valueRange([[0, 0]])).toEqual({ min: -1, max: 1 });
    });
  });

  describe('linePath', () => {
    it('spreads the points evenly across the width, highest value on top', () => {
      expect(linePath([0, 10, 5], { min: 0, max: 10 }, 200, 100)).toBe('M0 100 L100 0 L200 50');
    });

    it('draws a single value as a flat line across the width', () => {
      expect(linePath([5], { min: 0, max: 10 }, 200, 100)).toBe('M0 50 L200 50');
    });
  });

  describe('groupExpenses', () => {
    it('ranks the categories by amount and colours them by rank, each with its share', () => {
      const groups = groupExpenses([series('Loisir', 25), series('Restaurant', 75)]);

      expect(groups.map((g) => [g.label, g.color, g.share])).toEqual([
        ['Restaurant', colors.chart1, 0.75],
        ['Loisir', colors.chart2, 0.25],
      ]);
    });

    it('groups the categories past the first N under « Autres (k) », summed month by month', () => {
      const groups = groupExpenses(
        [
          series('A', 40),
          series('B', 30),
          series('C', 20, { 0: 15, 3: 5 }),
          series('D', 6, { 3: 6 }),
          series('E', 4),
        ],
        2
      );

      expect(groups.map((g) => [g.label, g.kind, g.total])).toEqual([
        ['A', 'category', 40],
        ['B', 'category', 30],
        ['Autres (3)', 'others', 30],
      ]);
      const others = groups[2];
      expect(others.color).toBe(colors.chartAutres);
      expect(others.months).toEqual(months({ 0: 19, 3: 11 }));
      expect(others.members.map((m) => [m.label, m.total, m.share])).toEqual([
        ['C', 20, 0.2],
        ['D', 6, 0.06],
        ['E', 4, 0.04],
      ]);
    });

    it('keeps up to N + 1 categories as themselves', () => {
      const groups = groupExpenses([series('A', 50), series('B', 30), series('C', 20)], 2);

      expect(groups.map((g) => g.label)).toEqual(['A', 'B', 'C']);
    });

    it('always sets « Sans catégorie » apart, last, however small', () => {
      const groups = groupExpenses(
        [series(null, 1), series('A', 50), series('B', 30), series('C', 10), series('D', 9)],
        2
      );

      expect(groups.map((g) => [g.label, g.kind])).toEqual([
        ['A', 'category'],
        ['B', 'category'],
        ['Autres (2)', 'others'],
        ['Sans catégorie', 'uncategorized'],
      ]);
      expect(groups[3].color).toBe(colors.chartSansCategorie);
      expect(groups[3].share).toBe(0.01);
    });

    it('leaves out what had no spending', () => {
      expect(groupExpenses([series('A', 0), series(null, 0)])).toEqual([]);
    });
  });
});
