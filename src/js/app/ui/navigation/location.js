const SUBTABS = Object.freeze({
  content: new Set(['data', 'format', 'frame']),
  style: new Set(['size', 'modules', 'colors', 'artwork']),
  download: new Set(['image', 'document', 'animation']),
  debug: new Set(['encoding', 'mask', 'payload', 'overlay']),
});

export function readNavigationHash(hash) {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  const parameters = new URLSearchParams(value);
  const tab = parameters.get('tab');
  if (!Object.hasOwn(SUBTABS, tab)) return null;
  const requestedSubtab = parameters.get('subtab');
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
