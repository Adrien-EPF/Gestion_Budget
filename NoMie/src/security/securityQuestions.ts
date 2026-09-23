import type { SecurityQuestionId } from './security';

/** Fixed, non-intrusive list the user picks two of when creating a PIN (#19 « Implementation Decisions »). */
export const SECURITY_QUESTIONS: { id: SecurityQuestionId; label: string }[] = [
  { id: 'firstPet', label: 'Nom de votre premier animal' },
  { id: 'hometown', label: 'Ville où vous avez grandi' },
  { id: 'bestFriend', label: 'Prénom de votre meilleur ami d’enfance' },
  { id: 'firstJob', label: 'Nom de votre premier lieu de travail' },
  { id: 'firstCar', label: 'Modèle de votre première voiture' },
  { id: 'favoriteDish', label: 'Plat que vous cuisinez le plus souvent' },
];

/** The French label for a question id, as shown when re-asking it (#24 « Code oublié ? »). */
export function questionLabel(id: SecurityQuestionId): string {
  return SECURITY_QUESTIONS.find((question) => question.id === id)?.label ?? '';
}
