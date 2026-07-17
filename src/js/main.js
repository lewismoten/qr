import { setupExternalLinks } from './external-links.js';
import { setupFilePickers } from './app/ui/file-picker.js';
import {
  initializeLanguage,
  isDebugLanguage,
  lookup,
  translateDocument,
} from './i18n/index.js';
import { getSavedLocale, setupLanguagePicker } from './i18n/picker.js';
import { loadFeatureStylesheet } from './stylesheets.js';

function waitForApplicationStyles() {
  const stylesheet = document.getElementById('app-styles');
  if (!stylesheet || stylesheet.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    stylesheet.addEventListener('load', resolve, { once: true });
    stylesheet.addEventListener('error', resolve, { once: true });
  });
}

async function start() {
  const stylesReady = waitForApplicationStyles();
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
  const application = await import('./app/index.js');
  await Promise.all([application.applicationReady, stylesReady]);
}

const bootLoading = document.getElementById('boot-loading');
start()
  .then(() => bootLoading?.remove())
  .catch((error) => {
    console.error(error);
    if (!bootLoading) return;
    bootLoading.classList.add('has-error');
    const label = bootLoading.querySelector('[data-i18n="common.loading"]');
    if (label) {
      label.textContent = lookup(
        'common.loadError',
        'Unable to load the QR Code Generator.',
      );
    }
  });
