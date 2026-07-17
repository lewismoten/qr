const LEAFLET_VERSION = '1.9.4';
const BASE_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist`;
let loading = null;

function ensureStylesheet(document) {
  if (document.querySelector('link[data-leaflet-runtime]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${BASE_URL}/leaflet.css`;
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  link.dataset.leafletRuntime = '';
  document.head.append(link);
}

export function loadLeaflet(document = globalThis.document) {
  if (globalThis.L) return Promise.resolve(globalThis.L);
  if (loading) return loading;
  ensureStylesheet(document);
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${BASE_URL}/leaflet.js`;
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.dataset.leafletRuntime = '';
    script.addEventListener('load', () => resolve(globalThis.L), { once: true });
    script.addEventListener('error', () => reject(new Error('Unable to load the interactive map.')), { once: true });
    document.head.append(script);
  });
  return loading;
}
