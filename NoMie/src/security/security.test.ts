import { normalizeAnswer } from './security';

describe('normalizeAnswer', () => {
  it('ignores case', () => {
    expect(normalizeAnswer('Nice')).toBe(normalizeAnswer('nice'));
  });

  it('trims leading and trailing spaces', () => {
    expect(normalizeAnswer('  Nice  ')).toBe(normalizeAnswer('Nice'));
  });

  it('collapses repeated inner whitespace', () => {
    expect(normalizeAnswer('Le   Chat  Noir')).toBe(normalizeAnswer('le chat noir'));
  });

  it('does not treat different answers as equal', () => {
    expect(normalizeAnswer('Nice')).not.toBe(normalizeAnswer('Paris'));
  });
});
