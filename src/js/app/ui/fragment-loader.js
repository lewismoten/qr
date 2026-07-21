import {
  getActiveLocale,
  lookup,
  translateDocument,
} from '../../i18n/index.js';
import { getLocalizedGuidePath } from '../../i18n/guide-path.js';
import { MEDIA_TYPE_HTML } from '../media-types.js';

const requests = new WeakMap();
let helpDialogId = 0;

function getParser(document) {
  const Parser = document.defaultView?.DOMParser ?? globalThis.DOMParser;
  if (!Parser) throw new Error('DOMParser is unavailable.');
  return new Parser();
}

function initializeHelpFeatures(content) {
  if (!content.querySelector?.('[data-centered-map-samples]')) return;
  import('../../info/geo-layer-samples.js')
    .then(({ initializeGeoLayerSamples }) => initializeGeoLayerSamples(content))
    .catch(console.error);
}

function installFragmentHelp({
  document,
  panel,
  parsed,
  link,
  initializeFeatures,
}) {
  const sources = [
    ...(parsed.querySelectorAll?.('[data-fragment-help]') ?? []),
  ];
  if (!link || sources.length === 0) return;

  const dialog = document.createElement('dialog');
  const header = document.createElement('header');
  const content = document.createElement('div');
  const footer = document.createElement('footer');
  const close = document.createElement('button');
  dialog.className = 'fragment-help-dialog';
  header.className = 'fragment-help-header';
  content.className = 'fragment-help-dialog-content';
  footer.className = 'fragment-help-footer';
  close.className = 'secondary-button fragment-help-close';
  close.type = 'button';
  close.textContent = lookup('common.close', 'Close');
  sources.forEach((source) => {
    const section = document.importNode(source, true);
    section.removeAttribute('data-fragment-help');
    content.append(section);
  });
  const heading = content.querySelector('h2');
  helpDialogId += 1;
  heading.id = 'fragment-help-title-' + helpDialogId;
  header.append(heading);
  footer.append(close);
  dialog.setAttribute('aria-labelledby', heading.id);
  close.addEventListener('click', () => dialog.close());
  link.addEventListener('click', (event) => {
    event.preventDefault();
    dialog.showModal();
    initializeFeatures(content);
  });
  dialog.append(header, content, footer);
  panel.append(dialog);
}

export function ensurePanelFragment(
  panel,
  {
    document = panel?.ownerDocument,
    fetcher = document?.defaultView?.fetch?.bind(document.defaultView),
    parse = (source) =>
      getParser(document).parseFromString(source, MEDIA_TYPE_HTML),
    initializeHelp = initializeHelpFeatures,
  } = {},
) {
  const url = panel?.dataset.fragmentUrl;
  if (!url || panel.dataset.fragmentLoaded === 'true') {
    return Promise.resolve(panel);
  }
  if (requests.has(panel)) return requests.get(panel);

  const helpLink = panel.querySelector?.('[data-fragment-help-link]');
  panel.setAttribute('aria-busy', 'true');
  const request = Promise.resolve()
    .then(() => {
      if (typeof fetcher !== 'function') {
        throw new Error('Fetch is unavailable.');
      }
      const localizedUrl = getLocalizedGuidePath(url, getActiveLocale());
      return fetcher(new URL(localizedUrl, document.baseURI));
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Unable to load fragment: ' + response.status);
      }
      return response.text();
    })
    .then((source) => {
      const parsed = parse(source);
      const fragment = parsed.querySelector('[data-app-fragment]');
      if (!fragment) throw new Error('Fragment content is missing.');
      const children = [...fragment.childNodes].map((node) =>
        document.importNode(node, true),
      );
      if (helpLink) children.push(helpLink);
      panel.replaceChildren(...children);
      panel.dataset.fragmentLoaded = 'true';
      translateDocument(document);
      installFragmentHelp({
        document,
        panel,
        parsed,
        link: helpLink,
        initializeFeatures: initializeHelp,
      });
      panel.dispatchEvent(new Event('fragmentload'));
      return panel;
    })
    .catch((error) => {
      requests.delete(panel);
      const message = document.createElement('p');
      message.className = 'validation-message';
      message.textContent = lookup(
        'common.fragmentLoadError',
        'Unable to load this section. Check your connection and try again.',
      );
      const children = helpLink ? [message, helpLink] : [message];
      panel.replaceChildren(...children);
      throw error;
    })
    .finally(() => panel.removeAttribute('aria-busy'));
  requests.set(panel, request);
  return request;
}
