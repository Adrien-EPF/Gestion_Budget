const OPERATORS = ['+', '−', '×'] as const;
export type Operator = (typeof OPERATORS)[number];

export const isOperator = (char: string): char is Operator => (OPERATORS as readonly string[]).includes(char);

export const hasOperator = (text: string): boolean => [...text].some(isOperator);

const toNumber = (operand: string): number | null => {
  if (operand === '') return null;
  const value = Number(operand.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};

/**
 * Evaluates what the quick-entry keypad typed — `"11,9×2"` — with × before + and −,
 * rounded to the cent. `null` when it is empty or unfinished (`"5+"`). The result may
 * be zero or negative: refusing it is up to the caller.
 */
export function evaluateAmountExpression(text: string): number | null {
  const operands = text.split(/[+−×]/).map(toNumber);
  if (operands.some((n) => n === null)) return null;
  const operators = [...text].filter(isOperator);

  // Collapse the × runs first, then fold the + and − left to right.
  const terms: number[] = [operands[0] as number];
  const signs: Operator[] = [];
  operators.forEach((operator, i) => {
    const next = operands[i + 1] as number;
    if (operator === '×') terms[terms.length - 1] *= next;
    else {
      signs.push(operator);
      terms.push(next);
    }
  });
  const total = terms.slice(1).reduce((sum, term, i) => (signs[i] === '+' ? sum + term : sum - term), terms[0]);
  return Math.round(total * 100) / 100;
}
