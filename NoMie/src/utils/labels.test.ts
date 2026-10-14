import { normalizeLabel } from './labels';

describe('normalizeLabel', () => {
  it('lowercases and drops accents', () => {
    expect(normalizeLabel('Café Épicerie')).toBe('cafe epicerie');
  });

  it('drops punctuation and superfluous spaces', () => {
    expect(normalizeLabel('  Lidl,   Rue-Neuve! ')).toBe('lidl rue neuve');
  });

  it('is empty for an empty or punctuation-only label', () => {
    expect(normalizeLabel('')).toBe('');
    expect(normalizeLabel(' ?! ')).toBe('');
  });

  it('treats the same label typed differently as one', () => {
    expect(normalizeLabel('LIDL')).toBe(normalizeLabel('lídl.'));
  });
});
