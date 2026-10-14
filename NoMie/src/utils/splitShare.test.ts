import { remainingToSplit, shareEvenly } from './splitShare';

describe('shareEvenly', () => {
  it('splits an exact amount without remainder', () => {
    expect(shareEvenly(60, 3)).toEqual({ mine: 20, rest: 40 });
  });

  it('rounds my share to the cent and keeps the rest exact', () => {
    expect(shareEvenly(100, 3)).toEqual({ mine: 33.33, rest: 66.67 });
    expect(shareEvenly(10, 3)).toEqual({ mine: 3.33, rest: 6.67 });
  });

  it('rounds half a cent up', () => {
    expect(shareEvenly(0.05, 2)).toEqual({ mine: 0.03, rest: 0.02 });
  });

  it('works on the absolute amount', () => {
    expect(shareEvenly(-90, 2)).toEqual({ mine: 45, rest: 45 });
  });

  it('refuses N below 2', () => {
    expect(() => shareEvenly(50, 1)).toThrow();
    expect(() => shareEvenly(50, 2.5)).toThrow();
  });
});

describe('remainingToSplit', () => {
  it('is the total minus the parts, free of float drift', () => {
    expect(remainingToSplit(0.3, [0.1, 0.2])).toBe(0);
    expect(remainingToSplit(100, [33.33, 33.33])).toBe(33.34);
    expect(remainingToSplit(50, [])).toBe(50);
  });

  it('goes negative when the parts overshoot', () => {
    expect(remainingToSplit(10, [6, 6])).toBe(-2);
  });
});
