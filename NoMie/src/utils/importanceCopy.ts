import type { AdvanceType, Importance } from '../services/dataService';

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  essentiel: 'Essentiel',
  secondaire_important: 'Secondaire important',
  secondaire_superflu: 'Secondaire superflu',
  exceptionnel: 'Exceptionnel',
};

export const ADVANCE_TYPE_LABELS: Record<AdvanceType, string> = {
  reglee_ailleurs: 'Réglée ailleurs',
  en_attente: 'En attente',
};
