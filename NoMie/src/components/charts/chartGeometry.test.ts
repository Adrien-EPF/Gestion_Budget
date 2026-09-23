import { colors } from '../../theme/tokens';
import { columnPath, groupExpenses, yAxis } from './chartGeometry';

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

  describe('yAxis', () => {
    it('picks a round step giving at most four intervals, from zero', () => {
      expect(yAxis([1320, 1640, 980])).toEqual({ min: 0, max: 2000, ticks: [2000, 1500, 1000, 500, 0] });
    });

    it('always includes zero, below it too', () => {
      expect(yAxis([-240, 690]).ticks).toEqual([750, 500, 250, 0, -250]);
      expect(yAxis([-300, -50]).ticks).toEqual([0, -100, -200, -300]);
    });

    it('keeps at least three graduations for small or flat balances', () => {
      expect(yAxis([0, 0]).ticks).toEqual([200, 100, 0]);
      expect(yAxis([50]).ticks).toEqual([200, 100, 0]);
    });

    it('goes on with round steps past 10 000 €', () => {
      expect(yAxis([45000]).ticks).toEqual([60000, 40000, 20000, 0]);
    });
  });

  describe('columnPath', () => {
    const scale = { min: 0, max: 100 };

    it('joins the months at the middle of their twelve columns, highest value on top', () => {
      expect(columnPath([100, 50, 0], 0, 2, scale, 1200, 100)).toBe('M50 0 L150 50 L250 100');
    });

    it('draws only the months asked for, skipping the ones without a value', () => {
      expect(columnPath([0, 50, null, 100], 1, 3, scale, 1200, 100)).toBe('M150 50 L350 0');
    });
  });
});
