import { createNavigation } from './navigation-setup.js';

export function createApplicationNavigation({
  document,
  elements: e,
  render,
  updateMap,
  prepareDebug,
  prepareStyle,
  prepareDownload,
  prepareContent,
  state,
}) {
  return createNavigation({
    elements: {
      tabs: e.tabButtons,
      tabPanels: e.tabPanels,
      contentTabs: e.subtabButtons,
      contentPanels: e.subtabPanels,
      form: e.form,
    },
    document,
    format: e.qrFormat,
    render,
    updateMap,
    prepareDebug,
    prepareStyle,
    prepareDownload,
    prepareContent,
    setActiveTab: state.setActiveTab,
    setActiveDebugSubtab: state.setActiveDebugSubtab,
  });
}
