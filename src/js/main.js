import { setupExternalLinks } from './external-links.js';
import { initializeLanguage, translateDocument } from './i18n/index.js';

async function start() {
  await initializeLanguage();
  translateDocument(document);
  setupExternalLinks();
  await import('./app/index.js');
}

start().catch(console.error);
