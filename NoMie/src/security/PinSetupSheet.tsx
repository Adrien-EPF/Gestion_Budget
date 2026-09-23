import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import { Chips } from '../components/Chips';
import { TextField } from '../components/TextField';
import { useDataService } from '../services/DataServiceContext';
import { colors, spacing, textStyle } from '../theme/tokens';
import { PinCreateFlow } from './PinCreateFlow';
import type { SecurityQuestionId } from './security';
import { SECURITY_QUESTIONS } from './securityQuestions';
import { useSecurityStore } from './SecurityStoreContext';

const QUESTIONS_INCOMPLETE = 'Choisis deux questions différentes et réponds aux deux.';

/** One of the two security-question slots picked while creating a PIN. */
interface QuestionSlot {
  question: SecurityQuestionId | null;
  answer: string;
}

const EMPTY_SLOTS: [QuestionSlot, QuestionSlot] = [
  { question: null, answer: '' },
  { question: null, answer: '' },
];

const SLOT_LABELS = ['Première question', 'Deuxième question'] as const;
const SLOT_TEST_IDS = ['question-a-options', 'question-b-options'] as const;
const SLOT_ANSWER_LABELS = ['Réponse à la première question', 'Réponse à la deuxième question'] as const;

interface PinSetupSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * « Activer Code PIN » (#23, #19 user story 6): create a 4-digit PIN, confirm
 * it, then pick two distinct security questions with their answers. Nothing
 * is persisted — `pinEnabled` included — until every step succeeds; closing
 * the sheet at any point (BottomSheet unmounts its children) drops the draft
 * and leaves the switch off.
 */
export function PinSetupSheet({ visible, onClose }: PinSetupSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible ? <PinSetupWizard onClose={onClose} /> : null}
    </BottomSheet>
  );
}

type Step = 'create' | 'questions';

function PinSetupWizard({ onClose }: { onClose: () => void }) {
  const securityStore = useSecurityStore();
  const dataService = useDataService();
  const [step, setStep] = useState<Step>('create');
  const [pin, setPin] = useState('');
  const [slots, setSlots] = useState<[QuestionSlot, QuestionSlot]>(EMPTY_SLOTS);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const setSlot = (index: 0 | 1, changes: Partial<QuestionSlot>) =>
    setSlots((current) => {
      const next: [QuestionSlot, QuestionSlot] = [...current];
      next[index] = { ...next[index], ...changes };
      return next;
    });

  const submitQuestions = async () => {
    const [first, second] = slots;
    const answersOk = first.answer.trim().length > 0 && second.answer.trim().length > 0;
    if (!first.question || !second.question || first.question === second.question || !answersOk) {
      setQuestionsError(QUESTIONS_INCOMPLETE);
      return;
    }
    await securityStore.setPin(pin, [
      { question: first.question, answer: first.answer },
      { question: second.question, answer: second.answer },
    ]);
    await dataService.setSetting('pinEnabled', true);
    onClose();
  };

  if (step === 'create') {
    return (
      <PinCreateFlow
        createTitle="Crée ton code PIN"
        onConfirmed={(confirmedPin) => {
          setPin(confirmedPin);
          setStep('questions');
        }}
        onClose={onClose}
      />
    );
  }

  const optionsExcluding = (excluded: SecurityQuestionId | null) =>
    SECURITY_QUESTIONS.filter((question) => question.id !== excluded).map((question) => ({
      value: question.id,
      label: question.label,
    }));

  return (
    <View style={styles.form}>
      <Text style={[textStyle('headingMd'), styles.title]}>Questions de secours</Text>
      <Text style={[textStyle('bodyMd'), styles.body]}>
        Elles permettent de réinitialiser ton code si tu l’oublies.
      </Text>

      {slots.map((slot, index) => {
        const otherQuestion = slots[index === 0 ? 1 : 0].question;
        return (
          <View style={styles.field} key={index}>
            <Text style={[textStyle('caption'), styles.label]}>{SLOT_LABELS[index]}</Text>
            <View testID={SLOT_TEST_IDS[index]}>
              <Chips
                options={optionsExcluding(otherQuestion)}
                value={slot.question}
                onChange={(question) => setSlot(index as 0 | 1, { question })}
              />
            </View>
            <TextField
              label={SLOT_ANSWER_LABELS[index]}
              value={slot.answer}
              onChangeText={(answer) => setSlot(index as 0 | 1, { answer })}
            />
          </View>
        );
      })}

      {questionsError ? <Text style={[textStyle('bodySm'), styles.error]}>{questionsError}</Text> : null}

      <View style={styles.actions}>
        <Button label="Annuler" variant="secondary" onPress={onClose} />
        <Button label="Valider" onPress={submitQuestions} style={styles.grow} />
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
  field: {
    width: '100%',
    gap: spacing.xxs,
  },
  label: {
    color: colors.ash,
  },
  error: {
    color: colors.amountNegative,
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
