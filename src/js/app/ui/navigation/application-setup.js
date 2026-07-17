import { createNavigation } from './setup.js';

export function createApplicationNavigation({ elements: e, render, updateMap, prepareDebug, state }) {
  return createNavigation({
    elements: {
      tabs: e.tabButtons,
      tabPanels: e.tabPanels,
      debugTabs: e.debugSubtabButtons,
      debugPanels: e.debugSubtabPanels,
      styleTabs: e.styleSubtabButtons,
      stylePanels: e.styleSubtabPanels,
      downloadTabs: e.downloadSubtabButtons,
      downloadPanels: e.downloadSubtabPanels,
      contentTabs: e.contentSubtabButtons,
      contentPanels: e.contentSubtabPanels,
      choices: e.choiceButtons,
    },
    format: e.qrFormat,
    render,
    updateMap,
    prepareDebug,
    setActiveTab: state.setActiveTab,
    setActiveDebugSubtab: state.setActiveDebugSubtab,
  });
}
