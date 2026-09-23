import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { colors, spacing, textStyle } from '../theme/tokens';
import { PinCreateFlow } from './PinCreateFlow';
import type { SecurityQuestionId, SecurityStore } from './security';
import { questionLabel } from './securityQuestions';

const ANSWERS_INCOMPLETE = 'Réponds aux deux questions.';
const ANSWERS_WRONG = 'Une des réponses est incorrecte, réessaie.';

interface ForgotPinSheetProps {
  visible: boolean;
  securityStore: SecurityStore;
  onClose: () => void;
  /** Called once the security answers were correct and a new PIN has been set. */
  onReset: () => void;
}

/**
 * « Code oublié ? » (#24, #19 user story 9): both original security-question
 * answers must be correct (case/extra-whitespace-insensitive, user story 10)
 * before a new PIN can be defined. The questions themselves never change —
 * the answers typed here are simply resubmitted through `setPin` alongside
 * the new PIN, so nothing else (accounts, transactions, the questions
 * themselves) is touched. A wrong answer changes nothing and can be retried
 * without limit.
 */
export function ForgotPinSheet({ visible, securityStore, onClose, onReset }: ForgotPinSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible ? <ForgotPinWizard securityStore={securityStore} onClose={onClose} onReset={onReset} /> : null}
    </BottomSheet>
  );
}

type Step = 'answers' | 'create';

function ForgotPinWizard({
  securityStore,
  onClose,
  onReset,
}: {
  securityStore: SecurityStore;
  onClose: () => void;
  onReset: () => void;
}) {
  const [questions, setQuestions] = useState<[SecurityQuestionId, SecurityQuestionId] | null>(null);
  const [answers, setAnswers] = useState<[string, string]>(['', '']);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('answers');

  useEffect(() => {
    let cancelled = false;
    securityStore.getSecurityQuestions().then((result) => {
      if (!cancelled) setQuestions(result);
    });
    return () => {
      cancelled = true;
    };
  }, [securityStore]);

  const setAnswer = (index: 0 | 1, value: string) =>
    setAnswers((current) => {
      const next: [string, string] = [...current];
      next[index] = value;
      return next;
    });

  const submitAnswers = async () => {
    if (!answers[0].trim() || !answers[1].trim()) {
      setAnswersError(ANSWERS_INCOMPLETE);
      return;
    }
    const ok = await securityStore.verifySecurityAnswers(answers);
    if (!ok) {
      setAnswersError(ANSWERS_WRONG);
      return;
    }
    setAnswersError(null);
    setStep('create');
  };

  const finalize = async (newPin: string) => {
    if (!questions) return;
    await securityStore.setPin(newPin, [
      { question: questions[0], answer: answers[0] },
      { question: questions[1], answer: answers[1] },
    ]);
    onReset();
  };

  if (step === 'create') {
    return <PinCreateFlow createTitle="Nouveau code PIN" onConfirmed={finalize} onClose={onClose} />;
  }

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Code oublié ?</Text>
      <Text style={[textStyle('bodyMd'), styles.body]}>
        Réponds à tes deux questions de secours pour définir un nouveau code.
      </Text>
      {questions ? (
        <>
          <TextField
            label={questionLabel(questions[0])}
            value={answers[0]}
            onChangeText={(text) => setAnswer(0, text)}
          />
          <TextField
            label={questionLabel(questions[1])}
            value={answers[1]}
            onChangeText={(text) => setAnswer(1, text)}
          />
        </>
      ) : null}
      <Text style={[textStyle('bodySm'), styles.error, !answersError && styles.errorHidden]}>
        {answersError ?? ' '}
      </Text>
      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button label="Valider" onPress={submitAnswers} style={styles.grow} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  title: {
    color: colors.ink,
    alignSelf: 'flex-start',
  },
  body: {
    color: colors.mute,
    alignSelf: 'flex-start',
  },
  error: {
    color: colors.amountNegative,
  },
  errorHidden: {
    opacity: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    width: '100%',
  },
  grow: {
    flex: 1,
  },
});
