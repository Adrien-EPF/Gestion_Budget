import type { TransactionStatus } from '../services/dataService';

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  non_pointe: 'Non pointé',
  pointe: 'Pointé',
  prevision: 'Prévision',
  fantome: 'Fantôme',
};
