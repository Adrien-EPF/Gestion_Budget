import type { StructureSummary } from '../services/dataService';
import { formatAmount } from './formatAmount';

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** « 3 actifs · 1 archivé » (handoff §6.5). */
export function describeAccounts({ activeAccounts, archivedAccounts }: StructureSummary): string {
  if (activeAccounts === 0 && archivedAccounts === 0) return 'Aucun compte pour le moment';
  const parts = [plural(activeAccounts, 'actif', 'actifs')];
  if (archivedAccounts > 0) parts.push(plural(archivedAccounts, 'archivé', 'archivés'));
  return parts.join(' · ');
}

/** « 27 catégories · ordre et couleurs » */
export function describeCategories({ categories }: StructureSummary): string {
  return `${plural(categories, 'catégorie', 'catégories')} · ordre et couleurs`;
}

/** « 2 portions · 64,50 € » */
export function describeAdvances({ advances }: StructureSummary): string {
  if (advances.count === 0) return 'Aucune avance en attente';
  return `${plural(advances.count, 'portion', 'portions')} · ${formatAmount(advances.total)}`;
}
