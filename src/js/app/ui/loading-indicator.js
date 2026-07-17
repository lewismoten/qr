import { lookup } from '../../i18n/index.js';

const regionIndicators = new WeakMap();

export function createLoadingIndicator({ region }) {
  if (!region?.ownerDocument) {
    return { track: (request) => Promise.resolve(request) };
  }
  const existing = regionIndicators.get(region);
  if (existing) return existing;

  const indicator = region.ownerDocument.createElement('div');
  const label = lookup('common.loading', 'Loading...');
  indicator.className = 'module-loading-indicator';
  indicator.hidden = true;
  indicator.setAttribute('role', 'status');
  indicator.setAttribute('aria-label', label);
  indicator.title = label;
  region.classList.add('module-loading-region');
  region.appendChild(indicator);

  let pending = 0;
  const begin = () => {
    pending += 1;
    region.setAttribute('aria-busy', 'true');
    indicator.hidden = false;
  };
  const finish = () => {
    pending = Math.max(0, pending - 1);
    if (pending > 0) return;
    region.removeAttribute('aria-busy');
    indicator.hidden = true;
  };

  const controller = {
    track(request) {
      begin();
      return Promise.resolve(request).finally(finish);
    },
  };
  regionIndicators.set(region, controller);
  return controller;
}
