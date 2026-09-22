import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { toHex } from './hex';
import { normalizeAnswer, type SecurityQuestionAnswer, type SecurityQuestionId, type SecurityStore } from './security';

const PIN_HASH_KEY = 'nomie.security.pinHash';
const PIN_SALT_KEY = 'nomie.security.pinSalt';
const QUESTIONS_KEY = 'nomie.security.questions';

interface StoredQuestion {
  id: SecurityQuestionId;
  hash: string;
  salt: string;
}

async function hashWithSalt(value: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${value}`);
}

/** A fresh random salt, hashed together with `value` (#19 Implementation Decisions: salted SHA-256, one salt per secret). */
async function saltAndHash(value: string): Promise<{ salt: string; hash: string }> {
  const salt = toHex(Crypto.getRandomBytes(16));
  return { salt, hash: await hashWithSalt(value, salt) };
}

/**
 * Real security boundary: expo-secure-store (Android Keystore / iOS
 * Keychain) for storage, expo-crypto (SHA-256 + random salt) for hashing,
 * expo-local-authentication for biometry. Never touches SQLite (#19
 * exception to ADR 0001) — no PIN or answer ever leaves this module in clear.
 */
export function createExpoSecurityStore(): SecurityStore {
  return {
    async hasPin() {
      return (await SecureStore.getItemAsync(PIN_HASH_KEY)) !== null;
    },

    async setPin(pin, questions) {
      const { salt: pinSalt, hash: pinHash } = await saltAndHash(pin);

      const stored: StoredQuestion[] = [];
      for (const { question, answer } of questions) {
        const { salt, hash } = await saltAndHash(normalizeAnswer(answer));
        stored.push({ id: question, salt, hash });
      }

      await SecureStore.setItemAsync(PIN_HASH_KEY, pinHash);
      await SecureStore.setItemAsync(PIN_SALT_KEY, pinSalt);
      await SecureStore.setItemAsync(QUESTIONS_KEY, JSON.stringify(stored));
    },

    async verifyPin(candidate) {
      const [storedHash, salt] = await Promise.all([
        SecureStore.getItemAsync(PIN_HASH_KEY),
        SecureStore.getItemAsync(PIN_SALT_KEY),
      ]);
      if (!storedHash || !salt) return false;
      return (await hashWithSalt(candidate, salt)) === storedHash;
    },

    async clearPin() {
      await Promise.all([
        SecureStore.deleteItemAsync(PIN_HASH_KEY),
        SecureStore.deleteItemAsync(PIN_SALT_KEY),
        SecureStore.deleteItemAsync(QUESTIONS_KEY),
      ]);
    },

    async getSecurityQuestions() {
      const raw = await SecureStore.getItemAsync(QUESTIONS_KEY);
      if (!raw) return null;
      const stored = JSON.parse(raw) as StoredQuestion[];
      return [stored[0].id, stored[1].id];
    },

    async verifySecurityAnswers(answers) {
      const raw = await SecureStore.getItemAsync(QUESTIONS_KEY);
      if (!raw) return false;
      const stored = JSON.parse(raw) as StoredQuestion[];
      const results = await Promise.all(
        stored.map(async (question, index) => (await hashWithSalt(normalizeAnswer(answers[index]), question.salt)) === question.hash)
      );
      return results.every(Boolean);
    },

    async hasBiometricHardware() {
      return LocalAuthentication.hasHardwareAsync();
    },

    async isBiometricEnrolled() {
      return LocalAuthentication.isEnrolledAsync();
    },

    async authenticateWithBiometrics(promptMessage) {
      // Our own PIN pad is the fallback (#19 Implementation Decisions), not iOS's system passcode.
      const result = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: true });
      return result.success;
    },
  };
}
