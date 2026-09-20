import { formatAmount } from './formatAmount';

describe('formatAmount', () => {
  it('uses a comma, two decimals and a no-break space before €', () => {
    expect(formatAmount(64.32)).toBe('64,32 €');
    expect(formatAmount(5)).toBe('5,00 €');
  });

  it('separates thousands with a narrow no-break space', () => {
    expect(formatAmount(1842.6)).toBe('1 842,60 €');
    expect(formatAmount(1234567.89)).toBe('1 234 567,89 €');
  });

  it('writes negative amounts with the typographic minus, not a hyphen', () => {
    const formatted = formatAmount(-64.32);
    expect(formatted).toBe('−64,32 €');
    expect(formatted).not.toContain('-');
  });

  it('prefixes income with + only when asked', () => {
    expect(formatAmount(2380, { signed: true })).toBe('+2 380,00 €');
    expect(formatAmount(2380)).toBe('2 380,00 €');
    expect(formatAmount(-19.99, { signed: true })).toBe('−19,99 €');
  });

  it('never shows a sign on zero', () => {
    expect(formatAmount(0, { signed: true })).toBe('0,00 €');
    expect(formatAmount(-0.001)).toBe('0,00 €');
  });

  it('rounds to the nearest cent', () => {
    expect(formatAmount(0.005)).toBe('0,01 €');
    expect(formatAmount(10.999)).toBe('11,00 €');
  });
});
