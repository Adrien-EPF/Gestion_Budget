/**
 * The one place the backup format's shape and version live (#12
 * « Implementation Decisions »): both `createBackup` and `restoreBackup`
 * in the data service import from here, so the two can never drift apart.
 * Row shapes mirror the SQLite tables exactly — ids are kept as-is so
 * every link (compte, catégorie, transaction miroir, règle de récurrence)
 * survives a round trip.
 */
export const BACKUP_FORMAT_ID = 'nomie-backup';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupAccountRow {
  id: number;
  name: string;
  initial_balance: number;
  created_at: string;
  archived: number;
}

export interface BackupCategoryRow {
  id: number;
  name: string;
  kind: string;
  icon: string | null;
  color: string | null;
  hidden: number;
  sort_order: number;
}

export interface BackupTransactionRow {
  id: number;
  account_id: number;
  operation_date: string;
  bank_date: string | null;
  comment: string;
  amount: number;
  category_id: number | null;
  status: string;
  mirror_transaction_id: number | null;
  recurrence_rule_id: number | null;
}

export interface BackupSplitRow {
  id: number;
  transaction_id: number;
  category_id: number | null;
  amount: number;
  advanced: number;
  reimbursed_at: string | null;
}

export interface BackupBudgetRow {
  id: number;
  category_id: number;
  amount: number;
  period: string;
  carry_over: number;
  start_month: string;
}

export interface BackupRecurrenceRuleRow {
  id: number;
  name: string;
  account_id: number;
  amount: number;
  category_id: number | null;
  frequency: string;
  reference_date: string;
  automatic: number;
  active: number;
  end_date: string | null;
  generated_until: string | null;
}

export interface BackupSettingRow {
  key: string;
  value: string;
}

export interface BackupData {
  accounts: BackupAccountRow[];
  categories: BackupCategoryRow[];
  transactions: BackupTransactionRow[];
  transactionSplits: BackupSplitRow[];
  budgets: BackupBudgetRow[];
  recurrenceRules: BackupRecurrenceRuleRow[];
  settings: BackupSettingRow[];
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT_ID;
  version: number;
  createdAt: string;
  data: BackupData;
}

/** Every table a backup carries, in the order they must be written back in. */
export const BACKUP_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'transactionSplits',
  'budgets',
  'recurrenceRules',
  'settings',
] as const satisfies readonly (keyof BackupData)[];

export type BackupValidation = { ok: true; file: BackupFile } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Every reference a backup's rows may carry — checked before any write, so
 * an inconsistent file never leaves half its data unreachable (#12 story 5).
 */
function checkReferences(data: BackupData): string | null {
  const accountIds = new Set(data.accounts.map((row) => row.id));
  const categoryIds = new Set(data.categories.map((row) => row.id));
  const transactionIds = new Set(data.transactions.map((row) => row.id));
  const ruleIds = new Set(data.recurrenceRules.map((row) => row.id));

  const bad = (ok: boolean) => !ok;
  for (const row of data.transactions) {
    if (bad(accountIds.has(row.account_id))) return `Opération ${row.id} : compte introuvable.`;
    if (row.category_id !== null && bad(categoryIds.has(row.category_id))) {
      return `Opération ${row.id} : catégorie introuvable.`;
    }
    if (row.mirror_transaction_id !== null && bad(transactionIds.has(row.mirror_transaction_id))) {
      return `Opération ${row.id} : opération miroir introuvable.`;
    }
    if (row.recurrence_rule_id !== null && bad(ruleIds.has(row.recurrence_rule_id))) {
      return `Opération ${row.id} : règle de récurrence introuvable.`;
    }
  }
  for (const row of data.transactionSplits) {
    if (bad(transactionIds.has(row.transaction_id))) return `Portion ${row.id} : opération introuvable.`;
    if (row.category_id !== null && bad(categoryIds.has(row.category_id))) {
      return `Portion ${row.id} : catégorie introuvable.`;
    }
  }
  for (const row of data.budgets) {
    if (bad(categoryIds.has(row.category_id))) return `Budget ${row.id} : catégorie introuvable.`;
  }
  for (const row of data.recurrenceRules) {
    if (bad(accountIds.has(row.account_id))) return `Règle ${row.id} : compte introuvable.`;
    if (row.category_id !== null && bad(categoryIds.has(row.category_id))) {
      return `Règle ${row.id} : catégorie introuvable.`;
    }
  }
  return null;
}

/**
 * Parses and fully validates a backup file's text content before anything
 * is written — a bad file must be refused with the data untouched (#12
 * « Décisions de test »).
 */
export function parseBackupFile(text: string): BackupValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Ce fichier n’est pas un JSON valide : ce n’est probablement pas une sauvegarde NoMie.' };
  }

  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT_ID) {
    return { ok: false, reason: 'Ce fichier n’est pas une sauvegarde NoMie.' };
  }
  if (typeof parsed.version !== 'number') {
    return { ok: false, reason: 'Ce fichier n’est pas une sauvegarde NoMie.' };
  }
  if (parsed.version > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      reason: 'Cette sauvegarde vient d’une version plus récente de NoMie. Mets à jour l’app avant de l’importer.',
    };
  }
  if (parsed.version !== BACKUP_FORMAT_VERSION) {
    return { ok: false, reason: 'Le format de cette sauvegarde n’est plus pris en charge.' };
  }
  if (typeof parsed.createdAt !== 'string' || !isRecord(parsed.data)) {
    return { ok: false, reason: 'Ce fichier n’est pas une sauvegarde NoMie.' };
  }

  const data = parsed.data;
  for (const table of BACKUP_TABLES) {
    if (!Array.isArray(data[table])) {
      return { ok: false, reason: `Il manque la table « ${table} » dans cette sauvegarde.` };
    }
  }

  const referenceError = checkReferences(data as unknown as BackupData);
  if (referenceError) return { ok: false, reason: referenceError };

  return {
    ok: true,
    file: {
      format: BACKUP_FORMAT_ID,
      version: parsed.version,
      createdAt: parsed.createdAt,
      data: data as unknown as BackupData,
    },
  };
}
