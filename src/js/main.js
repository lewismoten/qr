import { setupExternalLinks } from './external-links.js';
import { setupFilePickers } from './app/ui/file-picker.js';
import {
  initializeLanguage,
  isDebugLanguage,
  translateDocument,
} from './i18n/index.js';
import { getSavedLocale, setupLanguagePicker } from './i18n/picker.js';
import { loadFeatureStylesheet } from './stylesheets.js';

async function start() {
  await initializeLanguage({ locale: getSavedLocale() });
  let debugTooltip;
  if (isDebugLanguage()) {
    [, debugTooltip] = await Promise.all([
      loadFeatureStylesheet('i18n-debug').catch(console.error),
      import('./i18n/debug-tooltip.js'),
    ]);
  }
  translateDocument(document);
  setupFilePickers(document);
  setupExternalLinks();
  setupLanguagePicker();
  debugTooltip?.setupTranslationDebugTooltip();
  await import('./app/index.js');
}

start().catch(console.error);
