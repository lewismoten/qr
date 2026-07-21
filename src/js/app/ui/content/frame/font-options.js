import { LANGUAGE_FONT_OPTIONS } from './font-language-options.js';

const FONT_WEIGHT_BOLD = 700;
const FONT_WEIGHT_EXTRA_BOLD = 800;
const MICROSOFT_FONT_INFO =
  'https://learn.microsoft.com/en-us/typography/font-list/';

export const FRAME_FONT_OPTIONS = Object.freeze([
  {
    value: 'sans',
    key: 'frame.sans',
    label: 'Sans',
    family: '"Avenir Next", "Segoe UI", sans-serif',
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'rounded',
    key: 'frame.round',
    label: 'Round',
    family: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
    checkFamily: 'Arial Rounded MT Bold',
    infoUrl: `${MICROSOFT_FONT_INFO}arial-rounded-mt`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'serif',
    key: 'frame.serif',
    label: 'Serif',
    family: 'Georgia, "Times New Roman", serif',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'mono',
    key: 'frame.monospace',
    label: 'Monospace',
    family: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'arial',
    label: 'Arial',
    family: 'Arial, Helvetica, sans-serif',
    checkFamily: 'Arial',
    infoUrl: `${MICROSOFT_FONT_INFO}arial`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'verdana',
    label: 'Verdana',
    family: 'Verdana, Geneva, sans-serif',
    checkFamily: 'Verdana',
    infoUrl: `${MICROSOFT_FONT_INFO}verdana`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'trebuchet',
    label: 'Trebuchet MS',
    family: '"Trebuchet MS", sans-serif',
    checkFamily: 'Trebuchet MS',
    infoUrl: `${MICROSOFT_FONT_INFO}trebuchet-ms`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'times',
    label: 'Times New Roman',
    family: '"Times New Roman", Times, serif',
    checkFamily: 'Times New Roman',
    infoUrl: `${MICROSOFT_FONT_INFO}times-new-roman`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'palatino',
    label: 'Palatino',
    family: 'Palatino, "Palatino Linotype", serif',
    checkFamily: 'Palatino',
    infoUrl: `${MICROSOFT_FONT_INFO}palatino-linotype`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'courier',
    label: 'Courier New',
    family: '"Courier New", Courier, monospace',
    checkFamily: 'Courier New',
    infoUrl: `${MICROSOFT_FONT_INFO}courier-new`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'impact',
    label: 'Impact',
    family: 'Impact, Haettenschweiler, sans-serif',
    checkFamily: 'Impact',
    infoUrl: `${MICROSOFT_FONT_INFO}impact`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'cursive',
    label: 'Comic Sans MS',
    family: '"Comic Sans MS", "Bradley Hand", cursive',
    checkFamily: 'Comic Sans MS',
    infoUrl: `${MICROSOFT_FONT_INFO}comic-sans-ms`,
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  ...LANGUAGE_FONT_OPTIONS,
]);

function getLanguage(locale) {
  return String(locale || '')
    .split('-')[0]
    .toLowerCase();
}

export function isFrameFontRecommended(option, locale) {
  return option.locales?.includes(getLanguage(locale)) === true;
}

export function getFrameFontOption(value) {
  return (
    FRAME_FONT_OPTIONS.find((option) => option.value === value) ||
    FRAME_FONT_OPTIONS[0]
  );
}

export function getFrameFont(value, size) {
  const option = getFrameFontOption(value);
  return `${option.weight} ${size}px ${option.family}`;
}
