import { toHex } from './hex';

describe('toHex', () => {
  it('encodes each byte as two lower-case hex digits', () => {
    expect(toHex(new Uint8Array([0, 1, 255, 16]))).toBe('0001ff10');
  });

  it('encodes an empty array as an empty string', () => {
    expect(toHex(new Uint8Array([]))).toBe('');
  });

  it('pads single-digit bytes with a leading zero', () => {
    expect(toHex(new Uint8Array([5]))).toBe('05');
  });
});
