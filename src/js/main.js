import './app/index.js';
import { setupExternalLinks } from './external-links.js';
import { initializeLanguage, translateDocument } from './i18n/index.js';

setupExternalLinks();
initializeLanguage().then(() => translateDocument(document)).catch(console.error);
