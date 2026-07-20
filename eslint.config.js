import eslint from '@eslint/js';
import globals from 'globals';

const magicNumberOptions = {
  detectObjects: false,
  ignore: [-1, 0, 1, 2],
  ignoreArrayIndexes: true,
  ignoreClassFieldInitialValues: true,
  ignoreDefaultValues: true,
};

export default [
  {
    ignores: ['build/**', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  {
    files: ['src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      'no-magic-numbers': ['warn', magicNumberOptions],
    },
  },
  {
    files: [
      'src/js/app/checksum/crc32.js',
      'src/js/app/export/gif.js',
      'src/js/app/export/pdf.js',
      'src/js/app/export/zip.js',
    ],
    rules: {
      'no-magic-numbers': ['error', magicNumberOptions],
    },
  },
  {
    files: [
      '*.mjs',
      'benchmarks/**/*.mjs',
      'scripts/**/*.mjs',
      'tests/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    rules: {
      'max-len': [
        'error',
        {
          code: 80,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      'max-lines': ['error', { max: 300 }],
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
