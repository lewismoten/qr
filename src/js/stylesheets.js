const requests = new Map();

function getStylesheetUrl(name, document) {
  return new URL(`dist/chunks/${name}.min.css`, document.baseURI).toString();
}

export function loadFeatureStylesheet(
  name,
  { document = globalThis.document } = {},
) {
  if (!document?.head) return Promise.resolve();

  const url = getStylesheetUrl(name, document);
  if (requests.has(url)) return requests.get(url);

  const request = new Promise((resolve, reject) => {
    const existing = [...document.styleSheets].find(
      (stylesheet) => stylesheet.href === url,
    );
    if (existing) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.dataset.featureStylesheet = name;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener(
      'error',
      () => {
        link.remove();
        requests.delete(url);
        reject(new Error(`Unable to load stylesheet: ${url}`));
      },
      { once: true },
    );
    document.head.appendChild(link);
  });
  requests.set(url, request);
  return request;
}
