import {
  applyKey,
  parseAmountText,
  parseMoneyInput,
  toMoneyInput,
  type KeypadKey,
} from './amountInput';

const type = (keys: KeypadKey[]) => keys.reduce((text, key) => applyKey(text, key), '');

describe('applyKey', () => {
  it('appends digits', () => {
    expect(type(['1', '2', '5'])).toBe('125');
  });

  it('allows a single comma and starts with 0, when it is pressed first', () => {
    expect(type([','])).toBe('0,');
    expect(type(['1', ',', '5', ','])).toBe('1,5');
  });

  it('does not stack leading zeros', () => {
    expect(type(['0', '0'])).toBe('0');
    expect(type(['0', '7'])).toBe('7');
    expect(type(['0', ',', '0', '5'])).toBe('0,05');
  });

  it('caps the decimals at two', () => {
    expect(type(['1', ',', '2', '5', '9'])).toBe('1,25');
  });

  it('caps the whole entry at nine characters', () => {
    expect(type(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])).toBe('123456789');
  });

  it('erases the last character, and nothing when already empty', () => {
    expect(applyKey('12,5', 'backspace')).toBe('12,');
    expect(applyKey('', 'backspace')).toBe('');
  });
});

describe('parseAmountText', () => {
  it('reads a French decimal', () => {
    expect(parseAmountText('12,5')).toBe(12.5);
    expect(parseAmountText('7')).toBe(7);
    expect(parseAmountText('3,')).toBe(3);
  });

  it('treats empty input as zero', () => {
    expect(parseAmountText('')).toBe(0);
  });
});

describe('parseMoneyInput', () => {
  it('reads French and English decimals', () => {
    expect(parseMoneyInput('1250,5')).toBe(1250.5);
    expect(parseMoneyInput('1250.5')).toBe(1250.5);
  });

  it('ignores thousands spaces, including no-break ones', () => {
    expect(parseMoneyInput('1 250,00')).toBe(1250);
    expect(parseMoneyInput('1 250')).toBe(1250);
  });

  it('accepts a negative balance with a hyphen or a typographic minus', () => {
    expect(parseMoneyInput('-30')).toBe(-30);
    expect(parseMoneyInput('−30,5')).toBe(-30.5);
  });

  it('treats an empty field as zero', () => {
    expect(parseMoneyInput('')).toBe(0);
    expect(parseMoneyInput('  ')).toBe(0);
  });

  it('rejects anything that is not a number', () => {
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('12,3,4')).toBeNull();
    expect(parseMoneyInput('12€')).toBeNull();
  });
});

describe('toMoneyInput', () => {
  it('writes a number the way parseMoneyInput reads it back', () => {
    expect(toMoneyInput(1000.5)).toBe('1000,5');
    expect(parseMoneyInput(toMoneyInput(-42.25))).toBe(-42.25);
  });
});
