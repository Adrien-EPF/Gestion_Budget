import { strToU8, zipSync } from 'fflate';

export interface CsvFile {
  filename: string;
  content: string;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** No `Buffer` / `btoa` on Hermes: encoded by hand so it works on-device and on web alike. */
function toBase64(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const chunk = (b0 << 16) | ((b1 ?? 0) << 8) | (b2 ?? 0);
    result += BASE64_CHARS[(chunk >> 18) & 63];
    result += BASE64_CHARS[(chunk >> 12) & 63];
    result += b1 === undefined ? '=' : BASE64_CHARS[(chunk >> 6) & 63];
    result += b2 === undefined ? '=' : BASE64_CHARS[chunk & 63];
  }
  return result;
}

/** Bundles CSV files into one ZIP archive, base64-encoded for a file-system write. */
export function buildCsvZipBase64(files: CsvFile[]): string {
  const zipped = zipSync(
    Object.fromEntries(files.map(({ filename, content }) => [filename, strToU8(content)]))
  );
  return toBase64(zipped);
}
