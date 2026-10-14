import { evaluateAmountExpression, isOperator, type Operator } from './amountExpression';

export type KeypadKey =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | ','
  | 'backspace'
  | Operator;

/** Handoff §6.6: "9 caractères max" per number, a single comma. */
const MAX_LENGTH = 9;
const MAX_DECIMALS = 2;
/** A whole calculation stays short enough for the amount line. */
const MAX_EXPRESSION_LENGTH = 24;

/**
 * Applies one keypad press to the amount typed so far: a number like `"12,5"`, or a
 * calculation like `"11,9×2"`. The limits apply to the number being typed.
 */
export function applyKey(current: string, key: KeypadKey): string {
  if (key === 'backspace') return current.slice(0, -1);

  if (isOperator(key)) {
    if (current === '') return current;
    // Pressing a second operator changes the first one.
    if (isOperator(current.slice(-1))) return current.slice(0, -1) + key;
    if (current.length >= MAX_EXPRESSION_LENGTH) return current;
    return current.endsWith(',') ? current.slice(0, -1) + key : current + key;
  }

  const operandStart = Math.max(...['+', '−', '×'].map((op) => current.lastIndexOf(op))) + 1;
  const head = current.slice(0, operandStart);
  const operand = current.slice(operandStart);
  if (operand.length >= MAX_LENGTH || current.length >= MAX_EXPRESSION_LENGTH) return current;

  if (key === ',') {
    if (operand.includes(',')) return current;
    return operand === '' ? `${head}0,` : `${current},`;
  }

  const commaAt = operand.indexOf(',');
  if (commaAt !== -1 && operand.length - commaAt - 1 >= MAX_DECIMALS) return current;
  // "0" followed by a digit is just that digit, not "05".
  if (operand === '0') return head + key;
  return current + key;
}

/**
 * What the keypad text is worth: the number itself, or the result of the calculation
 * rounded to the cent. Empty or unfinished input is `0`.
 */
export function parseAmountText(text: string): number {
  return evaluateAmountExpression(text) ?? 0;
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
