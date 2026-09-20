import type { RecurrenceFrequency } from './recurrence';
import { formatDayMonth, dayOfMonth, weekdayName } from './dates';

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  monthly: 'Mensuelle',
  weekly: 'Hebdomadaire',
  yearly: 'Annuelle',
};

/** « Mensuelle · le 5 », « Hebdomadaire · le lundi », « Annuelle · le 12 mars » (handoff §6.4). */
export function describeFrequency(frequency: RecurrenceFrequency, referenceDate: string): string {
  const when =
    frequency === 'monthly'
      ? `le ${dayOfMonth(referenceDate)}`
      : frequency === 'weekly'
        ? `le ${weekdayName(referenceDate)}`
        : `le ${formatDayMonth(referenceDate)}`;
  return `${FREQUENCY_LABELS[frequency]} · ${when}`;
}

interface AutomationState {
  automatic: boolean;
  active: boolean;
  nextOccurrence: string | null;
}

/** The two lines of a rule's automation switch: its label and the sub-text under it. */
export function describeAutomation({ automatic, active, nextOccurrence }: AutomationState): {
  label: string;
  hint: string;
} {
  const label = automatic ? 'Création automatique' : 'Création manuelle';
  if (!active) return { label, hint: 'Règle en pause' };
  if (!nextOccurrence) return { label, hint: 'Règle terminée' };
  return {
    label,
    hint: automatic ? `Prochaine : ${formatDayMonth(nextOccurrence)}` : 'À valider toi-même',
  };
}
