import { lookup, translateDocument } from '../../i18n/index.js';

const requests = new WeakMap();

function getParser(document) {
  const Parser = document.defaultView?.DOMParser ?? globalThis.DOMParser;
  if (!Parser) throw new Error('DOMParser is unavailable.');
  return new Parser();
}

export function ensurePanelFragment(
  panel,
  {
    document = panel?.ownerDocument,
    fetcher = document?.defaultView?.fetch?.bind(document.defaultView),
    parse = (source) =>
      getParser(document).parseFromString(source, 'text/html'),
  } = {},
) {
  const url = panel?.dataset.fragmentUrl;
  if (!url || panel.dataset.fragmentLoaded === 'true') {
    return Promise.resolve(panel);
  }
  if (requests.has(panel)) return requests.get(panel);

  panel.setAttribute('aria-busy', 'true');
  const request = Promise.resolve()
    .then(() => {
      if (typeof fetcher !== 'function') {
        throw new Error('Fetch is unavailable.');
      }
      return fetcher(new URL(url, document.baseURI));
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
      panel.replaceChildren(...children);
      panel.dataset.fragmentLoaded = 'true';
      translateDocument(document);
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
      panel.replaceChildren(message);
      throw error;
    })
    .finally(() => panel.removeAttribute('aria-busy'));
  requests.set(panel, request);
  return request;
}
