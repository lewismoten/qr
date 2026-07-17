import { createContentSubtabs } from '../content/subtabs.js';
import { createDownloadSubtabs } from '../download/subtabs.js';
import { createStyleSubtabs } from '../style/subtabs.js';
import { createPrimaryTabs } from '../navigation.js';
import { createTabSet } from '../tab-set.js';

export function createNavigation({ elements: e, format, render, updateMap, prepareDebug, prepareStyle,
  setActiveTab, setActiveDebugSubtab }) {
  let activeStyleSubtab = 'size';
  const loadStyle = (name) => Promise.resolve(prepareStyle?.(name)).then(render).catch(console.error);
  const activateTab = createPrimaryTabs({
    buttons: e.tabs,
    panels: e.tabPanels,
    onActivate(name) {
      setActiveTab(name);
      if (name === 'debug') {
        Promise.resolve(prepareDebug?.()).then(render).catch(console.error);
        return;
      }
      if (name === 'style') {
        loadStyle(activeStyleSubtab);
        return;
      }
      if (name === 'content' && format.value === 'geo') window.requestAnimationFrame(updateMap);
      render();
    },
  });
  const activateDebug = createTabSet({
    buttons: e.debugTabs,
    panels: e.debugPanels,
    buttonData: 'subtab',
    panelData: 'subtabPanel',
    defaultValue: 'encoding',
    setAriaPressed: false,
    onActivate(name) {
      setActiveDebugSubtab(name);
      render();
    },
  });
  const activateStyle = createStyleSubtabs({
    buttons: e.styleTabs,
    panels: e.stylePanels,
    onActivate(name) {
      activeStyleSubtab = name;
      loadStyle(name);
    },
  });
  const activateDownload = createDownloadSubtabs({ buttons: e.downloadTabs, panels: e.downloadPanels });
  const activateContent = createContentSubtabs({
    buttons: e.contentTabs,
    panels: e.contentPanels,
    onActivate(name) {
      if (name === 'data' && format.value === 'geo') window.requestAnimationFrame(updateMap);
    },
  });
  const syncChoices = () => e.choices.forEach((button) => {
    const target = document.getElementById(button.dataset.choiceTarget);
    const active = Boolean(target) && target.value === button.dataset.choiceValue;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  return { activateTab, activateDebug, activateStyle, activateDownload, activateContent, syncChoices };
}
