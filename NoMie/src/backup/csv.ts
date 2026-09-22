/**
 * Excel-français flavoured CSV (#12 « Implementation Decisions »): UTF-8
 * with a BOM so Excel picks the encoding up on its own, `;` as the column
 * separator since `,` is the decimal mark, and CRLF line endings.
 */

function escapeField(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(';'));
  return '﻿' + lines.map((line) => line + '\r\n').join('');
}

/** `12.5` -> `"12,50"`: two decimals, comma as the decimal mark, no thousands separator. */
export function formatCsvAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',');
}

export const csvBool = (value: boolean): string => (value ? 'Oui' : 'Non');
