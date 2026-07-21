import emojiMessages from './emoji.json' with { type: 'json' };

import { findMessageIn } from './locale-resources.js';

export function getEmoji(key) {
  const value = findMessageIn(emojiMessages, key);
  return typeof value === 'string' ? value : '';
}

export function applyEmoji(element, key) {
  const emoji = getEmoji(key);
  if (emoji) element.dataset.i18nEmoji = emoji;
  else delete element.dataset.i18nEmoji;
}
