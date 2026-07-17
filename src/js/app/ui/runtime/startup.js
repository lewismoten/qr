import { initializeDialogs } from '../dialogs.js';
import { bindApplicationEvents } from '../events.js';
import { restoreLocationDownload } from '../download/location.js';

export function startApplication({ document, window, elements, defaultChunkVersion,
  eventActions, initialize }) {
  bindApplicationEvents({ elements, actions: eventActions, defaultChunkVersion });
  const dialogs = initializeDialogs({ document, window });

  initialize.pixelEditor();
  initialize.calendarDefaults();
  elements.urlInput.value = initialize.getDefaultUrl();
  initialize.outputs();
  initialize.formatVisibility();
  initialize.maskButtons();
  initialize.maskSelection();
  initialize.choiceButtons();
  initialize.wifi();
  initialize.phone();
  initialize.fileCapacity();
  initialize.chunkVersion();
  initialize.fileChunkLabel();
  initialize.sharedFields();
  initialize.smsLength();
  initialize.emailLength();
  initialize.debugOutline();
  initialize.contentTab('data');
  initialize.styleTab('size');
  initialize.downloadTab('image');
  initialize.debugTab('encoding');
  initialize.mainTab('content');
  initialize.previewMode('fit', true);
  restoreLocationDownload({ window, document });
  initialize.render();
  dialogs.syncFromHash();
}
