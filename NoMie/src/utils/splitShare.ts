const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

/**
 * « Partager à N » (#44): my share of `total` split `n` ways, rounded to the
 * cent, and the rest — what the others owe or settle elsewhere. Both are
 * absolute amounts and always add back up to `total` exactly.
 */
export function shareEvenly(total: number, n: number): { mine: number; rest: number } {
  if (!Number.isInteger(n) || n < 2) throw new Error('Partager à N needs N ≥ 2.');
  const totalCents = toCents(Math.abs(total));
  const mineCents = Math.round(totalCents / n);
  return { mine: fromCents(mineCents), rest: fromCents(totalCents - mineCents) };
}

/** What is left to allocate once `parts` are taken out of `total`; zero means the répartition is exact. */
export function remainingToSplit(total: number, parts: number[]): number {
  const allocated = parts.reduce((sum, part) => sum + toCents(part), 0);
  return fromCents(toCents(total) - allocated);
}
