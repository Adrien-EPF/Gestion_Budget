export type SecurityQuestionId =
  | 'firstPet'
  | 'hometown'
  | 'bestFriend'
  | 'firstJob'
  | 'firstCar'
  | 'favoriteDish';

export interface SecurityQuestionAnswer {
  question: SecurityQuestionId;
  answer: string;
}

/**
 * The narrow seam to the OS: hashed-secret storage (Keystore/Keychain via
 * expo-secure-store, hashed with expo-crypto) and biometric prompting
 * (expo-local-authentication) — the one place a substitute is legitimate in
 * tests (#19 « Testing Decisions »). Deliberately outside the data service
 * (exception to ADR 0001, #19): never touches SQLite, so the PIN and
 * security answers never land in a backup (#12) or CSV export (#13).
 */
export interface SecurityStore {
  hasPin(): Promise<boolean>;
  /** Replaces any existing PIN and security questions. */
  setPin(pin: string, questions: [SecurityQuestionAnswer, SecurityQuestionAnswer]): Promise<void>;
  verifyPin(pin: string): Promise<boolean>;
  clearPin(): Promise<void>;

  /** The two questions chosen at creation, without their answers; `null` before a PIN exists. */
  getSecurityQuestions(): Promise<[SecurityQuestionId, SecurityQuestionId] | null>;
  /** Both answers must be correct (#19 user story 9). */
  verifySecurityAnswers(answers: [string, string]): Promise<boolean>;

  hasBiometricHardware(): Promise<boolean>;
  isBiometricEnrolled(): Promise<boolean>;
  authenticateWithBiometrics(promptMessage: string): Promise<boolean>;
}

/** Case/extra-whitespace-insensitive comparison for security-question answers (#19 user story 10). */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ');
}
