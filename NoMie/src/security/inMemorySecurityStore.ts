import { normalizeAnswer, type SecurityQuestionAnswer, type SecurityStore } from './security';

export interface InMemorySecurityStore extends SecurityStore {
  /** Whether the device reports a fingerprint/Face scanner (#19 user story 8). */
  setBiometricHardware(available: boolean): void;
  /** Whether an actual fingerprint/Face is enrolled on the device (#19 user story 8). */
  setBiometricEnrolled(enrolled: boolean): void;
  /** What the next `authenticateWithBiometrics` call resolves to. */
  setBiometricAnswer(success: boolean): void;
}

/**
 * Test substitute for the OS boundary (#19 « Testing Decisions »): no real
 * Keystore/Keychain, no real biometric prompt. Also the implementation used
 * on the web target, where those are unavailable (#19 « Implementation
 * Decisions »).
 */
export function createInMemorySecurityStore(): InMemorySecurityStore {
  let pin: string | null = null;
  let questions: [SecurityQuestionAnswer, SecurityQuestionAnswer] | null = null;
  let biometricHardware = true;
  let biometricEnrolled = true;
  let biometricAnswer = true;

  return {
    async hasPin() {
      return pin !== null;
    },
    async setPin(newPin, newQuestions) {
      pin = newPin;
      questions = newQuestions;
    },
    async verifyPin(candidate) {
      return pin !== null && candidate === pin;
    },
    async clearPin() {
      pin = null;
      questions = null;
    },
    async getSecurityQuestions() {
      return questions ? [questions[0].question, questions[1].question] : null;
    },
    async verifySecurityAnswers(answers) {
      if (!questions) return false;
      return (
        normalizeAnswer(answers[0]) === normalizeAnswer(questions[0].answer) &&
        normalizeAnswer(answers[1]) === normalizeAnswer(questions[1].answer)
      );
    },
    async hasBiometricHardware() {
      return biometricHardware;
    },
    async isBiometricEnrolled() {
      return biometricEnrolled;
    },
    async authenticateWithBiometrics() {
      return biometricAnswer;
    },
    setBiometricHardware(value) {
      biometricHardware = value;
    },
    setBiometricEnrolled(value) {
      biometricEnrolled = value;
    },
    setBiometricAnswer(value) {
      biometricAnswer = value;
    },
  };
}

/** Web/Expo Go: no Keystore/Keychain, no biometric sensor — nothing to store, nothing that can succeed. */
export function createInertSecurityStore(): SecurityStore {
  return {
    async hasPin() {
      return false;
    },
    async setPin() {},
    async verifyPin() {
      return false;
    },
    async clearPin() {},
    async getSecurityQuestions() {
      return null;
    },
    async verifySecurityAnswers() {
      return false;
    },
    async hasBiometricHardware() {
      return false;
    },
    async isBiometricEnrolled() {
      return false;
    },
    async authenticateWithBiometrics() {
      return false;
    },
  };
}
