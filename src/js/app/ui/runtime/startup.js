import { initializeLazyDialogs } from '../lazy-dialogs.js';
import { bindApplicationEvents } from '../events.js';
import { activateNavigationHash } from '../navigation/location.js';

export async function startApplication({
  document,
  window,
  elements,
  defaultChunkVersion,
  systems,
  runtime,
}) {
  const file = systems.contentData.file;
  const eventActions = {
    syncFormat: systems.syncFormat,
    activateContent: systems.navigation.activateContent,
    loadBulkFile: systems.contentData.loadBulkFile,
    render: systems.preview.render,
    syncAnimation: systems.download.syncAnimation,
    syncDownloads: systems.download.syncControls,
    resetTransfer: file.settings.resetDerived,
    scheduleChunkRefresh: file.settings.schedule,
    formatVersion: systems.output.formatVersion,
    syncSmsLength: systems.output.syncSmsLength,
    syncEmailLength: systems.contentEncoding.emailCapacity.sync,
    syncFileCapacity: systems.contentData.syncFileCapacityHint,
    resetFileCache: file.settings.resetCache,
    clearFile: systems.contentData.clearLoadedFile,
    syncChoices: systems.navigation.syncChoices,
    isBulkMode: systems.contentData.isBulkMode,
    setFrameCentered: systems.contentEncoding.pipeline.frame.setCentered,
    syncGradient: systems.style.colors.sync,
    syncModules: systems.style.modules.sync,
    syncEyes: systems.style.eyes.sync,
    syncArtwork: systems.style.artwork.sync,
    syncChunkVersion: file.settings.syncVersion,
    syncEmoji: systems.style.artwork.syncEmoji,
    applyImageContrast: systems.style.colors.applyRecommendedImageContrast,
    invalidateCapacity: systems.contentData.invalidateChunkCapacityCache,
    getCurrentFrame: systems.download.getCurrentFrame,
    setCurrentFrame: systems.download.setCurrentFrame,
    getFrameCount: systems.download.getFrameCount,
    syncNavigation: systems.download.syncNavigation,
    getFileMode: systems.contentData.getSelectedFileEncodingMode,
  };
  bindApplicationEvents({
    elements,
    actions: eventActions,
    defaultChunkVersion,
  });
  initializeLazyDialogs({ document, window });

  systems.contentSections.event.initialize();
  elements.urlInput.value = runtime.getDefaultUrl();
  systems.output.sync();
  systems.syncFormat();
  systems.contentSections.phone.initialize();
  systems.contentData.syncFileCapacityHint();
  file.settings.syncVersion();
  file.settings.syncChunkLabel();
  systems.contentSections.shared.initialize();
  systems.output.syncSmsLength();
  systems.contentEncoding.emailCapacity.sync();
  await systems.navigation.activateContent('data');
  await systems.navigation.activateTab('content');
  systems.previewControls.setViewMode('fit', true);
  if (
    window.location.hash.includes('download=1') &&
    window.location.hash.includes('data=')
  ) {
    import('../download/download-location.js')
      .then(({ restoreLocationDownload }) =>
        restoreLocationDownload({ window, document }),
      )
      .catch(console.error);
  }
  const activateHash = () =>
    activateNavigationHash(systems.navigation, window.location.hash);
  await activateHash();
  window.addEventListener('hashchange', () => void activateHash());
  return systems.preview.render();
}
