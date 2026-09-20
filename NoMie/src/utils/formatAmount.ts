const NBSP = ' ';
const NARROW_NBSP = ' ';
const MINUS = '−';

interface FormatAmountOptions {
  /** Prefix income with `+` — used in lists, not on balances (handoff §4). */
  signed?: boolean;
}

/**
 * Shared amount formatter: `fr-FR`, 2 decimals, thousands separated by a
 * narrow no-break space, no-break space before `€`, typographic minus.
 * Written by hand rather than through `Intl` so the output is identical
 * on Hermes/Android and in the Jest runtime.
 *
 *   formatAmount(1842.6)                  -> "1 842,60 €"
 *   formatAmount(-64.32)                  -> "−64,32 €"
 *   formatAmount(2380, { signed: true })  -> "+2 380,00 €"
 */
export function formatAmount(amount: number, options: FormatAmountOptions = {}): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const integerPart = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
  const decimalPart = String(cents % 100).padStart(2, '0');

  // A value that rounds to zero carries no sign: "−0,00 €" would be noise.
  const sign = cents === 0 ? '' : amount < 0 ? MINUS : options.signed ? '+' : '';
  return `${sign}${integerPart},${decimalPart}${NBSP}€`;
}
