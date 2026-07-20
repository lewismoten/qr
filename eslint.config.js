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
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.name=/^pushUint(?:16|32)LE$/] > Literal',
          message:
            'Pass a named constant to integer writers so the field is clear.',
        },
      ],
    },
  },
  {
    files: [
      'src/js/app/checksum/crc32.js',
      'src/js/app/bytes.js',
      'src/js/app/compression/lzw.js',
      'src/js/app/data/**/*.js',
      'src/js/app/export/**/*.js',
      'src/js/app/qr/qr-finder-regions.js',
      'src/js/app/qr/encoding-units.js',
      'src/js/app/qr/qr-regions.js',
      'src/js/app/qr/qr-stream.js',
      'src/js/app/ui/content/email/email-capacity.js',
      'src/js/app/ui/content/file/transfer/**/*.js',
      'src/js/app/ui/content/geo/mvt/**/*.js',
      'src/js/app/ui/content/geo/pmtiles/**/*.js',
      'src/js/qr/**/*.js',
    ],
    rules: {
      'no-magic-numbers': ['error', magicNumberOptions],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.name=/^pushUint(?:16|32)LE$/] > Literal',
          message:
            'Pass a named constant to integer writers so the field is clear.',
        },
        {
          selector: "CallExpression[callee.property.name='push'] > Literal",
          message:
            'Pass named constants to byte-array push calls so fields are clear.',
        },
      ],
    },
  },
  {
    files: ['src/js/qr/constants.js'],
    rules: {
      // These arrays are named ISO/IEC 18004 lookup tables, not algorithms.
      'no-magic-numbers': 'off',
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
    rules: {
      'no-magic-numbers': ['warn', magicNumberOptions],
    },
  },
  {
    files: [
      'scripts/maps/planning/output-estimate.mjs',
      'scripts/maps/reporting/options.mjs',
      'scripts/maps/vector/budget.mjs',
      'scripts/maps/vector/output.mjs',
    ],
    rules: {
      'no-magic-numbers': ['error', magicNumberOptions],
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
