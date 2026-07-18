import { NAVIGATION_ALIASES } from '../../../i18n/guide-routes.js';

const SUBTABS = Object.freeze({
  content: new Set(['data', 'format', 'frame']),
  style: new Set(['size', 'modules', 'colors', 'artwork']),
  download: new Set(['image', 'document', 'animation']),
  debug: new Set(['encoding', 'mask', 'payload', 'overlay']),
});

export function readNavigationHash(hash) {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  const parameters = new URLSearchParams(value);
  let tab = parameters.get('tab');
  let requestedSubtab = parameters.get('subtab');
  if (!tab) {
    for (const aliases of Object.values(NAVIGATION_ALIASES)) {
      const localizedTab = parameters.get(aliases.keys[0]);
      if (!localizedTab) continue;
      tab = Object.entries(aliases.tabs).find(
        ([, translated]) => translated === localizedTab,
      )?.[0];
      const localizedSubtab = parameters.get(aliases.keys[1]);
      requestedSubtab =
        Object.entries(aliases.subtabs).find(
          ([, translated]) => translated === localizedSubtab,
        )?.[0] || localizedSubtab;
      break;
    }
  }
  if (!Object.hasOwn(SUBTABS, tab)) return null;
  const subtab = SUBTABS[tab].has(requestedSubtab)
    ? requestedSubtab
    : [...SUBTABS[tab]][0];
  return { tab, subtab };
}

export async function activateNavigationHash(navigation, hash) {
  const target = readNavigationHash(hash);
  if (!target) return false;
  await navigation.activateTab(target.tab);
  const activate = {
    content: navigation.activateContent,
    style: navigation.activateStyle,
    download: navigation.activateDownload,
    debug: navigation.activateDebug,
  }[target.tab];
  await activate(target.subtab);
  return true;
}
