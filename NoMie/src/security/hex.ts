/** Lower-case hex encoding, e.g. for a random salt drawn from `expo-crypto`'s `getRandomBytes`. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
