import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [locale, inputFile, outputFile] = process.argv.slice(2);

const overrides = {
  ar: {
    Generator: 'المولد',
    'Open generator': 'فتح المولد',
  },
  es: {
    Generator: 'Generador',
    'Open generator': 'Abrir generador',
  },
  'hi-IN': {
    Generator: 'जनरेटर',
    'Open generator': 'जनरेटर खोलें',
  },
  'zh-CN': {
    Generator: '生成器',
    'Open generator': '打开生成器',
  },
};

function normalizeTranslation(source, translated) {
  const overridden = overrides[locale]?.[source] ?? translated;
  if (locale !== 'zh-CN') return overridden;
  return overridden
    .replaceAll('发电机', '生成器')
    .replaceAll('口罩', '掩模')
    .replaceAll('代码字', '码字')
    .replaceAll('代码单词', '码字');
}

if (!locale || !inputFile || !outputFile) {
  throw new Error(
    'Usage: cache-guide-translations.mjs <locale> <input> <output>',
  );
}

const input = JSON.parse(await readFile(inputFile, 'utf8'));
const output = JSON.parse(await readFile(outputFile, 'utf8'));
const sources = input.sources ?? input.values;

if (sources.length !== output.values.length) {
  throw new Error(`Translation count mismatch for ${locale}.`);
}

const translations = Object.fromEntries(
  sources.map((value, index) => {
    const translated = output.values[index]?.trim();
    if (!translated) {
      throw new Error(`Empty translation for ${locale}: ${value}`);
    }
    return [value, normalizeTranslation(value, translated)];
  }),
);

const directory = path.join('src', 'html', 'guides', 'translations');
await mkdir(directory, { recursive: true });
await writeFile(
  path.join(directory, `${locale}.json`),
  `${JSON.stringify(translations, null, 2)}\n`,
);
