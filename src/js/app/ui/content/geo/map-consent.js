export const OPENSTREETMAP_CONSENT_KEY = 'qr.geo.openStreetMapConsent';

function defaultStorage() {
  try {
    return globalThis.window?.localStorage;
  } catch {
    return undefined;
  }
}

export function hasOpenStreetMapConsent(storage = defaultStorage()) {
  try {
    return storage?.getItem(OPENSTREETMAP_CONSENT_KEY) === 'allow';
  } catch {
    return false;
  }
}

export function rememberOpenStreetMapConsent(storage = defaultStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(OPENSTREETMAP_CONSENT_KEY, 'allow');
    return true;
  } catch {
    return false;
  }
}
