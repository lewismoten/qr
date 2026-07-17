import { initializeDialogs } from '../dialogs.js';
import { bindApplicationEvents } from '../events.js';
import { restoreLocationDownload } from '../download/location.js';

export function startApplication({ document, window, elements, defaultChunkVersion,
  systems, runtime }) {
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
    syncWifi: systems.contentSections.wifi.sync,
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
  bindApplicationEvents({ elements, actions: eventActions, defaultChunkVersion });
  const dialogs = initializeDialogs({ document, window });

  systems.style.pixelEditor.initialize();
  systems.contentSections.event.initialize();
  elements.urlInput.value = runtime.getDefaultUrl();
  systems.output.sync();
  systems.syncFormat();
  systems.preview.ensureMaskButtons();
  systems.preview.syncMaskSelection();
  systems.navigation.syncChoices();
  systems.contentSections.wifi.sync();
  systems.contentSections.phone.initialize();
  systems.contentData.syncFileCapacityHint();
  file.settings.syncVersion();
  file.settings.syncChunkLabel();
  systems.contentSections.shared.initialize();
  systems.output.syncSmsLength();
  systems.contentEncoding.emailCapacity.sync();
  systems.debug.outlines.sync();
  systems.navigation.activateContent('data');
  systems.navigation.activateStyle('size');
  systems.navigation.activateDownload('image');
  systems.navigation.activateDebug('encoding');
  systems.navigation.activateTab('content');
  systems.previewControls.setViewMode('fit', true);
  restoreLocationDownload({ window, document });
  systems.preview.render();
  dialogs.syncFromHash();
}
