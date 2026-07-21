const SUBTABS = Object.freeze({
  content: new Set(['data', 'format', 'frame']),
  style: new Set(['size', 'modules', 'colors', 'artwork']),
  download: new Set(['image', 'document', 'animation']),
  debug: new Set(['encoding', 'mask', 'payload', 'overlay']),
});

export function readNavigationHash(hash, aliases = []) {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  const parameters = new URLSearchParams(value);
  let tab = parameters.get('tab');
  let requestedSubtab = parameters.get('subtab');
  if (!tab) {
    for (const alias of aliases) {
      const localizedTab = parameters.get(alias.keys[0]);
      if (!localizedTab) continue;
      tab = Object.entries(alias.tabs).find(
        ([, translated]) => translated === localizedTab,
      )?.[0];
      const localizedSubtab = parameters.get(alias.keys[1]);
      requestedSubtab =
        Object.entries(alias.subtabs).find(
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
  let target = readNavigationHash(hash);
  if (!target && hash && !/[#&]?tab=/.test(hash)) {
    const { NAVIGATION_ALIASES } =
      await import('../../../i18n/guide-routes.js');
    target = readNavigationHash(hash, Object.values(NAVIGATION_ALIASES));
  }
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
