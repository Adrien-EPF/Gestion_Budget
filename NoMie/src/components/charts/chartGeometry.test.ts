import { linePath, toBreakdown, valueRange } from './chartGeometry';

describe('chartGeometry', () => {
  describe('toBreakdown', () => {
    it('sorts the slices from the largest, each with its share of the total', () => {
      expect(
        toBreakdown([
          { label: 'Loisirs', amount: 25 },
          { label: 'Restaurant', amount: 75 },
        ])
      ).toEqual([
        { label: 'Restaurant', amount: 75, share: 0.75 },
        { label: 'Loisirs', amount: 25, share: 0.25 },
      ]);
    });

    it('groups the smallest slices beyond the limit under « Autres catégories »', () => {
      const slices = toBreakdown(
        [
          { label: 'A', amount: 40 },
          { label: 'B', amount: 30 },
          { label: 'C', amount: 20 },
          { label: 'D', amount: 6 },
          { label: 'E', amount: 4 },
        ],
        2
      );

      expect(slices).toEqual([
        { label: 'A', amount: 40, share: 0.4 },
        { label: 'B', amount: 30, share: 0.3 },
        { label: 'Autres catégories', amount: 30, share: 0.3 },
      ]);
    });

    it('keeps a lone extra slice rather than grouping it on its own', () => {
      const slices = toBreakdown(
        [
          { label: 'A', amount: 50 },
          { label: 'B', amount: 30 },
          { label: 'C', amount: 20 },
        ],
        2
      );

      expect(slices.map((s) => s.label)).toEqual(['A', 'B', 'C']);
    });

    it('leaves out empty slices', () => {
      expect(toBreakdown([{ label: 'A', amount: 0 }])).toEqual([]);
    });
  });

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
});
