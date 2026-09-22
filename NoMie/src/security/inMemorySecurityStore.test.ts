import { createInMemorySecurityStore } from './inMemorySecurityStore';

describe('createInMemorySecurityStore', () => {
  it('has no PIN before one is set', async () => {
    const store = createInMemorySecurityStore();

    expect(await store.hasPin()).toBe(false);
    expect(await store.verifyPin('1234')).toBe(false);
    expect(await store.getSecurityQuestions()).toBeNull();
  });

  it('verifies the PIN it was given, and rejects any other', async () => {
    const store = createInMemorySecurityStore();

    await store.setPin('1234', [
      { question: 'firstPet', answer: 'Milo' },
      { question: 'hometown', answer: 'Nice' },
    ]);

    expect(await store.hasPin()).toBe(true);
    expect(await store.verifyPin('1234')).toBe(true);
    expect(await store.verifyPin('9999')).toBe(false);
  });

  it('replaces the previous PIN and questions when set again', async () => {
    const store = createInMemorySecurityStore();
    await store.setPin('1234', [
      { question: 'firstPet', answer: 'Milo' },
      { question: 'hometown', answer: 'Nice' },
    ]);

    await store.setPin('5678', [
      { question: 'firstJob', answer: 'Boulangerie' },
      { question: 'firstCar', answer: 'Clio' },
    ]);

    expect(await store.verifyPin('1234')).toBe(false);
    expect(await store.verifyPin('5678')).toBe(true);
    expect(await store.getSecurityQuestions()).toEqual(['firstJob', 'firstCar']);
  });

  it('clears the PIN and questions', async () => {
    const store = createInMemorySecurityStore();
    await store.setPin('1234', [
      { question: 'firstPet', answer: 'Milo' },
      { question: 'hometown', answer: 'Nice' },
    ]);

    await store.clearPin();

    expect(await store.hasPin()).toBe(false);
    expect(await store.verifyPin('1234')).toBe(false);
    expect(await store.getSecurityQuestions()).toBeNull();
  });

  it('verifies security answers ignoring case and extra whitespace, requiring both correct', async () => {
    const store = createInMemorySecurityStore();
    await store.setPin('1234', [
      { question: 'firstPet', answer: 'Milo' },
      { question: 'hometown', answer: 'Nice' },
    ]);

    expect(await store.verifySecurityAnswers(['  MILO ', 'nice'])).toBe(true);
    expect(await store.verifySecurityAnswers(['Milo', 'Paris'])).toBe(false);
    expect(await store.verifySecurityAnswers(['Rex', 'Nice'])).toBe(false);
  });

  it('rejects security answers before any PIN exists', async () => {
    const store = createInMemorySecurityStore();

    expect(await store.verifySecurityAnswers(['Milo', 'Nice'])).toBe(false);
  });

  it('reports biometric hardware, enrollment and prompt outcome as set for the test', async () => {
    const store = createInMemorySecurityStore();

    expect(await store.hasBiometricHardware()).toBe(true);
    expect(await store.isBiometricEnrolled()).toBe(true);
    expect(await store.authenticateWithBiometrics('Déverrouille')).toBe(true);

    store.setBiometricHardware(false);
    store.setBiometricEnrolled(false);
    store.setBiometricAnswer(false);

    expect(await store.hasBiometricHardware()).toBe(false);
    expect(await store.isBiometricEnrolled()).toBe(false);
    expect(await store.authenticateWithBiometrics('Déverrouille')).toBe(false);
  });
});
