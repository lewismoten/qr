import { lookup } from '../../../../i18n/index.js';

export function createTextPlugin(document) {
  const input = document.getElementById('text-input');
  return {
    build: () => input.value,
    preview: () =>
      input.value || lookup('content.preview.text', '[Enter text]'),
  };
}
