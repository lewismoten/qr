import { setupExternalLinks } from '../external-links.js';
import { initializeLanguage, translateDocument } from '../i18n/index.js';

function syncLanguageSwitcher(locale) {
  document.querySelectorAll('.guide-language-switcher').forEach((switcher) => {
    const links = [...switcher.querySelectorAll('a[hreflang]')];
    const active = links.find(
      (link) => link.getAttribute('hreflang') === locale,
    );
    if (!active) return;
    links.forEach((link) => link.removeAttribute('aria-current'));
    active.setAttribute('aria-current', 'page');
    const summary = switcher.querySelector('summary');
    summary?.replaceChildren(
      ...[...active.childNodes].map((node) => node.cloneNode(true)),
    );
  });
}

const guideLocale = document.documentElement.dataset.guideLocale;
if (guideLocale) {
  const localeBase = document.documentElement.dataset.localeBase || 'locales/';
  const result = await initializeLanguage({
    locale: guideLocale,
    baseUrl: new URL(localeBase, document.baseURI),
  });
  translateDocument(document);
  syncLanguageSwitcher(result.locale);
}

const isEmbedded = new URLSearchParams(window.location.search).has('embed');
if (isEmbedded && window.parent !== window) {
  document.querySelectorAll('[data-parent-dialog-target]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      window.parent.location.hash = link.dataset.parentDialogTarget;
    });
  });
}

setupExternalLinks();
