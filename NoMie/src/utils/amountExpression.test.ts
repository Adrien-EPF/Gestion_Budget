import { evaluateAmountExpression, hasOperator } from './amountExpression';

describe('evaluateAmountExpression', () => {
  it('reads a plain amount', () => {
    expect(evaluateAmountExpression('12,5')).toBe(12.5);
  });

  it('multiplies, so 11,9 × 2 is 23,80', () => {
    expect(evaluateAmountExpression('11,9×2')).toBe(23.8);
  });

  it('adds and subtracts from left to right', () => {
    expect(evaluateAmountExpression('10+5−3')).toBe(12);
  });

  it('gives × priority over + and −', () => {
    expect(evaluateAmountExpression('2+3×4')).toBe(14);
    expect(evaluateAmountExpression('20−2×3')).toBe(14);
  });

  it('rounds the result to the cent', () => {
    expect(evaluateAmountExpression('3,33×3,33')).toBe(11.09);
    expect(evaluateAmountExpression('0,1+0,2')).toBe(0.3);
  });

  it('can come out at zero or below, for the caller to refuse', () => {
    expect(evaluateAmountExpression('5−8')).toBe(-3);
    expect(evaluateAmountExpression('4−4')).toBe(0);
  });

  it('is null when the expression is empty or unfinished', () => {
    expect(evaluateAmountExpression('')).toBeNull();
    expect(evaluateAmountExpression('5+')).toBeNull();
    expect(evaluateAmountExpression('×3')).toBeNull();
    expect(evaluateAmountExpression('4,')).toBe(4);
  });
});

describe('hasOperator', () => {
  it('tells a calculation from a plain amount', () => {
    expect(hasOperator('12,5')).toBe(false);
    expect(hasOperator('2×3')).toBe(true);
  });
});
