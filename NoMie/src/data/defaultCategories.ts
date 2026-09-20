import type { CategoryKind } from '../services/dataService';

/** The category that makes the service write a transfer's mirror transaction (CONTEXT.md §7). */
export const TRANSFER_CATEGORY_NAME = 'Mouvement inter-compte';

export interface DefaultCategorySeed {
  name: string;
  kind: CategoryKind;
}

/**
 * The 27 categories from the old Excel (CONTEXT.md §4), pre-loaded on
 * first launch so returning users keep their existing landmarks. `kind`
 * is a best-effort classification (expense/income/both) — the Excel had
 * no such field, categories were used freely on either side.
 */
export const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  { name: 'Alimentation/Entretien essentiel', kind: 'expense' },
  { name: 'Crédit', kind: 'expense' },
  { name: 'Voiture', kind: 'expense' },
  { name: 'Transports autres', kind: 'expense' },
  { name: 'Loisir', kind: 'expense' },
  { name: 'Restaurant', kind: 'expense' },
  { name: 'Culture', kind: 'expense' },
  { name: 'Cadeaux', kind: 'both' },
  { name: 'Habillement', kind: 'expense' },
  { name: 'Santé', kind: 'expense' },
  { name: 'Services', kind: 'expense' },
  { name: 'Sorties/bières', kind: 'expense' },
  { name: 'Logement', kind: 'expense' },
  { name: 'Impôts', kind: 'expense' },
  { name: 'Assurances', kind: 'expense' },
  { name: 'Cotisations/inscriptions', kind: 'expense' },
  { name: 'Frais', kind: 'expense' },
  { name: 'Don', kind: 'both' },
  { name: 'Retrait', kind: 'expense' },
  { name: 'Virement', kind: 'both' },
  { name: TRANSFER_CATEGORY_NAME, kind: 'both' },
  { name: 'Salaire/Intérêts/Avantages', kind: 'income' },
  { name: 'Chèque', kind: 'both' },
  { name: 'Avancé', kind: 'both' },
  { name: 'Aide Etat', kind: 'income' },
  { name: 'Vacances', kind: 'expense' },
  { name: 'Autres', kind: 'both' },
];
