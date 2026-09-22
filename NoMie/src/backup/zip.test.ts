import { unzipSync } from 'fflate';
import { buildCsvZipBase64 } from './zip';

describe('buildCsvZipBase64', () => {
  it('round-trips a set of CSV files, accents and all padding lengths included, through zip + base64', () => {
    const files = [
      { filename: 'transactions.csv', content: '﻿Id;Montant\r\n1;12,50\r\n' },
      { filename: 'empty.csv', content: '' },
      { filename: 'accents.csv', content: 'Catégorie;Créé le\r\nRestauration;2026-09-10\r\n' },
      // Exercises every base64 padding case (byte length mod 3 = 0, 1, 2).
      { filename: 'a.txt', content: 'x' },
      { filename: 'ab.txt', content: 'xy' },
      { filename: 'abc.txt', content: 'xyz' },
    ];

    const base64 = buildCsvZipBase64(files);
    expect(base64).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);

    // Compared as raw bytes, not decoded text: decoding would silently strip a leading BOM.
    const unzipped = unzipSync(new Uint8Array(Buffer.from(base64, 'base64')));
    for (const file of files) {
      expect(Buffer.from(unzipped[file.filename])).toEqual(Buffer.from(file.content, 'utf8'));
    }
  });
});
