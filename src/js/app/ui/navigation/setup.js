import { createContentSubtabs } from '../content/subtabs.js';
import { createPrimaryTabs } from '../navigation.js';
import { createLoadingIndicator } from '../loading-indicator.js';

export function createNavigation({
  elements: e,
  document,
  format,
  render,
  updateMap,
  prepareDebug,
  prepareStyle,
  prepareDownload,
  prepareContent,
  setActiveTab,
  setActiveDebugSubtab,
}) {
  let activeStyleSubtab = 'size';
  let activeDownloadSubtab = 'image';
  let activeDebugSubtab = 'encoding';
  const subtabRequests = new Map();
  const loading = createLoadingIndicator({
    region: e.tabPanels[0]?.parentElement,
  });
  const load = (prepare, name) =>
    loading
      .track(
        Promise.resolve()
          .then(() => prepare?.(name))
          .then(render),
      )
      .catch(console.error);
  const loadDebug = (name) => load(prepareDebug, name);
  const loadStyle = (name) => load(prepareStyle, name);
  const loadDownload = (name) => load(prepareDownload, name);
  const loadContent = (name) => load(prepareContent, name);
  const getSubtabElements = (name) => ({
    buttons: document.querySelectorAll(`.${name}-subtab-button`),
    panels: document.querySelectorAll(`.${name}-subtab-panel`),
  });
  const ensureSubtabs = (name, importer, create) => {
    if (!subtabRequests.has(name)) {
      subtabRequests.set(
        name,
        importer().then((module) => create(module, getSubtabElements(name))),
      );
    }
    return subtabRequests.get(name);
  };
  const ensureDebugSubtabs = () =>
    ensureSubtabs(
      'debug',
      () => import('../tab-set.js'),
      (module, elements) =>
        module.createTabSet({
          ...elements,
          buttonData: 'subtab',
          panelData: 'subtabPanel',
          defaultValue: 'encoding',
          setAriaPressed: false,
          onActivate(name) {
            activeDebugSubtab = name;
            setActiveDebugSubtab(name);
            loadDebug(name);
          },
        }),
    );
  const ensureStyleSubtabs = () =>
    ensureSubtabs(
      'style',
      () => import('../style/subtabs.js'),
      (module, elements) =>
        module.createStyleSubtabs({
          ...elements,
          onActivate(name) {
            activeStyleSubtab = name;
            loadStyle(name);
          },
        }),
    );
  const ensureDownloadSubtabs = () =>
    ensureSubtabs(
      'download',
      () => import('./download-subtabs.js'),
      (module, elements) =>
        module.createDownloadSubtabs({
          ...elements,
          onActivate(name) {
            activeDownloadSubtab = name;
            loadDownload(name);
          },
        }),
    );
  const activateTab = createPrimaryTabs({
    buttons: e.tabs,
    panels: e.tabPanels,
    onActivate(name) {
      setActiveTab(name);
      if (name === 'debug') {
        ensureDebugSubtabs().then(() => loadDebug(activeDebugSubtab));
        return;
      }
      if (name === 'style') {
        ensureStyleSubtabs().then(() => loadStyle(activeStyleSubtab));
        return;
      }
      if (name === 'download') {
        ensureDownloadSubtabs().then(() => loadDownload(activeDownloadSubtab));
        return;
      }
      if (name === 'content' && format.value === 'geo')
        window.requestAnimationFrame(updateMap);
      render();
    },
  });
  const activateDebug = (name) =>
    ensureDebugSubtabs().then((activate) => activate(name));
  const activateStyle = (name) =>
    ensureStyleSubtabs().then((activate) => activate(name));
  const activateDownload = (name) =>
    ensureDownloadSubtabs().then((activate) => activate(name));
  const activateContent = createContentSubtabs({
    buttons: e.contentTabs,
    panels: e.contentPanels,
    onActivate(name) {
      loadContent(name);
      if (name === 'data' && format.value === 'geo')
        window.requestAnimationFrame(updateMap);
    },
  });
  const syncChoices = (targetName) => {
    const selector = targetName
      ? `.choice-button[data-choice-target="${targetName}"]`
      : '.choice-button';
    e.form.querySelectorAll(selector).forEach((button) => {
      const target = document.getElementById(button.dataset.choiceTarget);
      const active =
        Boolean(target) && target.value === button.dataset.choiceValue;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  return {
    activateTab,
    activateDebug,
    activateStyle,
    activateDownload,
    activateContent,
    syncChoices,
  };
}
