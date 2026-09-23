import { colors } from './tokens';

/**
 * Fixed palette for the category icon circle (#21 "Implementation Decisions":
 * customising a category's "icon" for this V1 means customising this
 * background only, no real pictogram set yet). Ten soft tones, coherent
 * with the pastel `*Soft` tokens already in `theme/tokens.ts` (reused
 * directly where one already matches), all light enough that
 * `colors.mute` text stays readable on top.
 */
export const CATEGORY_COLORS: readonly string[] = [
  colors.primarySoft, // sauge
  colors.statusNonPointeSoft, // ambre
  colors.statusPrevisionSoft, // prune
  '#F1DCCB', // terracotta
  '#F3E1E3', // rose
  '#DCE7F3', // bleu
  '#DCEFEC', // sarcelle
  '#F6EFD1', // jaune
  '#E7ECD8', // olive
  colors.surfaceSunken, // gris
];
