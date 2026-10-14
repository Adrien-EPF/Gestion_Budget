/** Lowercase, no accents, no punctuation, single spaces: « Café, Épicerie ! » -> « cafe epicerie ». */
export function normalizeLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
