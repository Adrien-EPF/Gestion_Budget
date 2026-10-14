import type { CategoryKind, CategorySystemRole } from '../services/dataService';

/** Seed name of the category carrying the `virement` role, which makes the service write a transfer's mirror transaction (CONTEXT.md §7). The role, not this name, is what the service looks for. */
export const TRANSFER_CATEGORY_NAME = 'Mouvement inter-compte';

/** Seed name of the category a Fantôme's contrepartie lands in unless the user picks another. */
export const COUNTERPART_DEFAULT_CATEGORY_NAME = 'Salaire/Intérêts/Avantages';

export interface DefaultCategorySeed {
  name: string;
  kind: CategoryKind;
  systemRole?: CategorySystemRole;
}

/**
 * The 28 categories from the old Excel (CONTEXT.md §4), pre-loaded on
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
  { name: 'Internet/téléphone', kind: 'expense' },
  { name: 'Sorties/bières', kind: 'expense' },
  { name: 'Logement', kind: 'expense' },
  { name: 'Impôts', kind: 'expense' },
  { name: 'Assurances', kind: 'expense' },
  { name: 'Cotisations/inscriptions', kind: 'expense' },
  { name: 'Frais', kind: 'expense' },
  { name: 'Don', kind: 'both' },
  { name: 'Retrait', kind: 'expense' },
  { name: 'Virement', kind: 'both' },
  { name: TRANSFER_CATEGORY_NAME, kind: 'both', systemRole: 'virement' },
  { name: COUNTERPART_DEFAULT_CATEGORY_NAME, kind: 'income' },
  { name: 'Chèque', kind: 'both' },
  { name: 'Avancé', kind: 'both', systemRole: 'avance' },
  { name: 'Aide Etat', kind: 'income' },
  { name: 'Vacances', kind: 'expense' },
  { name: 'Autres', kind: 'both' },
];
