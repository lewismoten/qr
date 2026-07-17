import { setupExternalLinks } from './external-links.js';
import { initializeLanguage, translateDocument } from './i18n/index.js';
import { getSavedLocale, setupLanguagePicker } from './i18n/picker.js';

async function start() {
  await initializeLanguage({ locale: getSavedLocale() });
  translateDocument(document);
  setupExternalLinks();
  setupLanguagePicker();
  await import('./app/index.js');
}

start().catch(console.error);
