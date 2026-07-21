import { FRAME_FONT_OPTIONS } from './font-options.js';

const FONT_CHECK_SIZE_PX = 16;
const GROUPS = Object.freeze([
  {
    id: 'latin',
    flag: '\u{1F1FA}\u{1F1F8} ' + '\u{1F1EC}\u{1F1E7} ' + '\u{1F1EA}\u{1F1F8}',
    languages: ['en', 'es'],
  },
  {
    id: 'arabic',
    flag: '\u{1F1F8}\u{1F1E6}',
    languages: ['ar'],
  },
  {
    id: 'hindi',
    flag: '\u{1F1EE}\u{1F1F3}',
    languages: ['hi'],
  },
  {
    id: 'chinese',
    flag: '\u{1F1E8}\u{1F1F3}',
    languages: ['zh'],
  },
  {
    id: 'general',
    flag: '\u{1F310}',
    languages: [],
  },
]);

function getLanguage(locale) {
  return String(locale || '')
    .split('-')[0]
    .toLowerCase();
}

function getOptionGroup(option) {
  return (
    GROUPS.find((group) =>
      option.locales?.some((locale) => group.languages.includes(locale)),
    ) || GROUPS.at(-1)
  );
}

export function isFrameFontAvailable(option, document) {
  if (!option.checkFamily) return true;
  if (typeof document?.fonts?.check !== 'function') return false;
  try {
    const query = `${FONT_CHECK_SIZE_PX}px "${option.checkFamily}"`;
    return document.fonts.check(query);
  } catch {
    return false;
  }
}

export function getFrameFontGroups({ document, locale }) {
  const language = getLanguage(locale);
  const currentGroup = GROUPS.find((group) =>
    group.languages.includes(language),
  );
  const orderedGroups = [...GROUPS].sort((left, right) => {
    if (left.id === 'general') return -1;
    if (right.id === 'general') return 1;
    if (left === currentGroup) return -1;
    if (right === currentGroup) return 1;
    return 0;
  });
  return orderedGroups.map((group) => ({
    ...group,
    options: FRAME_FONT_OPTIONS.filter(
      (option) => getOptionGroup(option) === group,
    ).map((option) => ({
      option,
      installed: isFrameFontAvailable(option, document),
    })),
  }));
}
