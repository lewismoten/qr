import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [locale, inputFile, outputFile] = process.argv.slice(2);

if (!locale || !inputFile || !outputFile) {
  throw new Error(
    'Usage: cache-guide-translations.mjs <locale> <input> <output>',
  );
}

const input = JSON.parse(await readFile(inputFile, 'utf8'));
const output = JSON.parse(await readFile(outputFile, 'utf8'));

if (input.values.length !== output.values.length) {
  throw new Error(`Translation count mismatch for ${locale}.`);
}

const translations = Object.fromEntries(
  input.values.map((value, index) => {
    const translated = output.values[index]?.trim();
    if (!translated) {
      throw new Error(`Empty translation for ${locale}: ${value}`);
    }
    return [value, translated];
  }),
);

const directory = path.join('guides', 'translations');
await mkdir(directory, { recursive: true });
await writeFile(
  path.join(directory, `${locale}.json`),
  `${JSON.stringify(translations, null, 2)}\n`,
);
