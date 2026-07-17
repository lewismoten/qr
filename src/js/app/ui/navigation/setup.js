import { createContentSubtabs } from '../content/subtabs.js';
import { createDebugSubtabs } from '../debug/subtabs.js';
import { createDownloadSubtabs } from '../download/subtabs.js';
import { createStyleSubtabs } from '../style/subtabs.js';
import { createPrimaryTabs } from '../navigation.js';

export function createNavigation({ elements: e, format, render, updateMap, setActiveTab, setActiveDebugSubtab }) {
  const activateTab = createPrimaryTabs({
    buttons: e.tabs,
    panels: e.tabPanels,
    onActivate(name) {
      setActiveTab(name);
      if (name === 'content' && format.value === 'geo') window.requestAnimationFrame(updateMap);
      render();
    },
  });
  const activateDebug = createDebugSubtabs({
    buttons: e.debugTabs,
    panels: e.debugPanels,
    onActivate(name) {
      setActiveDebugSubtab(name);
      render();
    },
  });
  const activateStyle = createStyleSubtabs({ buttons: e.styleTabs, panels: e.stylePanels });
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
