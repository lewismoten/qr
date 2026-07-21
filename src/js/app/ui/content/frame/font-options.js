const FONT_WEIGHT_BOLD = 700;
const FONT_WEIGHT_EXTRA_BOLD = 800;
const FONT_CHECK_SIZE_PX = 16;

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
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'verdana',
    label: 'Verdana',
    family: 'Verdana, Geneva, sans-serif',
    checkFamily: 'Verdana',
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'trebuchet',
    label: 'Trebuchet MS',
    family: '"Trebuchet MS", sans-serif',
    checkFamily: 'Trebuchet MS',
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_EXTRA_BOLD,
  },
  {
    value: 'times',
    label: 'Times New Roman',
    family: '"Times New Roman", Times, serif',
    checkFamily: 'Times New Roman',
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'palatino',
    label: 'Palatino',
    family: 'Palatino, "Palatino Linotype", serif',
    checkFamily: 'Palatino',
    locales: ['en', 'es'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'courier',
    label: 'Courier New',
    family: '"Courier New", Courier, monospace',
    checkFamily: 'Courier New',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'impact',
    label: 'Impact',
    family: 'Impact, Haettenschweiler, sans-serif',
    checkFamily: 'Impact',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'cursive',
    label: 'Comic Sans MS',
    family: '"Comic Sans MS", "Bradley Hand", cursive',
    checkFamily: 'Comic Sans MS',
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'notoNaskh',
    label: 'Noto Naskh Arabic',
    family: '"Noto Naskh Arabic", serif',
    checkFamily: 'Noto Naskh Arabic',
    locales: ['ar'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'geeza',
    label: 'Geeza Pro',
    family: '"Geeza Pro", sans-serif',
    checkFamily: 'Geeza Pro',
    locales: ['ar'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'traditional',
    label: 'Traditional Arabic',
    family: '"Traditional Arabic", serif',
    checkFamily: 'Traditional Arabic',
    locales: ['ar'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'devanagari',
    label: 'Noto Sans Devanagari',
    family: '"Noto Sans Devanagari", sans-serif',
    checkFamily: 'Noto Sans Devanagari',
    locales: ['hi'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'kohinoor',
    label: 'Kohinoor Devanagari',
    family: '"Kohinoor Devanagari", sans-serif',
    checkFamily: 'Kohinoor Devanagari',
    locales: ['hi'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'nirmala',
    label: 'Nirmala UI',
    family: '"Nirmala UI", sans-serif',
    checkFamily: 'Nirmala UI',
    locales: ['hi'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'mangal',
    label: 'Mangal',
    family: 'Mangal, sans-serif',
    checkFamily: 'Mangal',
    locales: ['hi'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'pingfang',
    label: 'PingFang SC',
    family: '"PingFang SC", sans-serif',
    checkFamily: 'PingFang SC',
    locales: ['zh'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'yahei',
    label: 'Microsoft YaHei',
    family: '"Microsoft YaHei", sans-serif',
    checkFamily: 'Microsoft YaHei',
    locales: ['zh'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'notoCjk',
    label: 'Noto Sans CJK SC',
    family: '"Noto Sans CJK SC", sans-serif',
    checkFamily: 'Noto Sans CJK SC',
    locales: ['zh'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'simsun',
    label: 'SimSun',
    family: 'SimSun, serif',
    checkFamily: 'SimSun',
    locales: ['zh'],
    weight: FONT_WEIGHT_BOLD,
  },
  {
    value: 'kaiti',
    label: 'KaiTi',
    family: 'KaiTi, serif',
    checkFamily: 'KaiTi',
    locales: ['zh'],
    weight: FONT_WEIGHT_BOLD,
  },
]);

function getLanguage(locale) {
  return String(locale || '')
    .split('-')[0]
    .toLowerCase();
}

export function isFrameFontRecommended(option, locale) {
  return option.locales?.includes(getLanguage(locale)) === true;
}

function isFrameFontAvailable(option, document) {
  if (!option.checkFamily) return true;
  if (typeof document?.fonts?.check !== 'function') return false;
  try {
    const query = `${FONT_CHECK_SIZE_PX}px "${option.checkFamily}"`;
    return document.fonts.check(query);
  } catch {
    return false;
  }
}

export function getVisibleFrameFontOptions({ document, locale, selected }) {
  return FRAME_FONT_OPTIONS.filter(
    (option) =>
      option.value === selected || isFrameFontAvailable(option, document),
  ).sort(
    (left, right) =>
      Number(isFrameFontRecommended(right, locale)) -
      Number(isFrameFontRecommended(left, locale)),
  );
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
