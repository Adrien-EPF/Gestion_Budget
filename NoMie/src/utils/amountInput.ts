export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'backspace';

/** Handoff §6.6: "9 caractères max", a single comma. */
const MAX_LENGTH = 9;
const MAX_DECIMALS = 2;

/** Applies one keypad press to the amount typed so far (a string like `"12,5"`). */
export function applyKey(current: string, key: KeypadKey): string {
  if (key === 'backspace') return current.slice(0, -1);
  if (current.length >= MAX_LENGTH) return current;

  if (key === ',') {
    if (current.includes(',')) return current;
    return current === '' ? '0,' : `${current},`;
  }

  const commaAt = current.indexOf(',');
  if (commaAt !== -1 && current.length - commaAt - 1 >= MAX_DECIMALS) return current;
  // "0" followed by a digit is just that digit, not "05".
  if (current === '0') return key;
  return current + key;
}

/** `"12,5"` -> `12.5`; empty or unparsable input is `0`. */
export function parseAmountText(text: string): number {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Parses a balance typed on the system keyboard: French or English
 * decimal separator, optional thousands spaces, optional leading minus
 * (hyphen or typographic). Returns `null` when it isn't a number; an
 * empty field is `0`, as for a brand-new account.
 */
export function parseMoneyInput(text: string): number | null {
  const cleaned = text.replace(/[\s  ]/g, '').replace('−', '-').replace(',', '.');
  if (cleaned === '') return 0;
  if (!/^-?\d*\.?\d+$|^-?\d+\.$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Inverse of `parseMoneyInput` for pre-filling a field: `1000.5` -> `"1000,5"`. */
export function toMoneyInput(amount: number): string {
  return String(amount).replace('.', ',');
}
