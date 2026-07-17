import { colorWithTransparency, getContrastingHex } from './colors.js';
import { parseBoolean as parseBulkBoolean } from './csv.js';
import { getSupportedMp4MimeType } from './mp4.js';
import { validatePrintableText } from './validation.js';
import {
  getAlignmentPatternCenters,
  isAlignmentRegion,
  isDarkModuleRegion,
  isFinderRegion,
  isFormatRegion,
  isTimingRegion,
  isVersionRegion,
} from './qr-regions.js';
import { createContentSubtabs } from './ui/content/subtabs.js';
import { createEmailCapacity } from './ui/content/email/capacity.js';
import { createContentPayload, createFilePayloadPreview } from './ui/content/payload.js';
import { createFormatValidator } from './ui/content/validation.js';
import { createBulkImportSection } from './ui/content/bulk/section.js';
import { serializeBulkRow } from './ui/content/bulk/payload.js';
import { createEventSection } from './ui/content/event/section.js';
import {
  arrayBufferToBase64,
  createCompactFileId,
} from './ui/content/file/protocol.js';
import { createFileManifestController } from './ui/content/file/manifest.js';
import { createFileCapacityCalculator } from './ui/content/file/capacity.js';
import { createFileCache } from './ui/content/file/cache.js';
import { createFilePayloadBuilder } from './ui/content/file/payload.js';
import { createFileSection } from './ui/content/file/section.js';
import { createFrameSection } from './ui/content/frame/section.js';
import { createGeoSection } from './ui/content/geo/section.js';
import { createNumberSection } from './ui/content/number/section.js';
import { createPhoneSection } from './ui/content/phone/section.js';
import { createSharedFieldsSection } from './ui/content/shared-fields.js';
import { createVCardSection } from './ui/content/vcard/section.js';
import { createWifiSection } from './ui/content/wifi/section.js';
import { createDebugSubtabs } from './ui/debug/subtabs.js';
import { createMaskSelector } from './ui/debug/mask-selector.js';
import { createEncodingDiagnostics } from './ui/debug/encoding.js';
import { createDebugStyles } from './ui/debug/styles.js';
import { getActiveOutlineGroups } from './ui/debug/boundaries.js';
import {
  buildDebugOverlayModel,
  getDebugCategory,
  moduleIsDark,
} from './ui/debug/model.js';
import { createOutlineSelector } from './ui/debug/outline.js';
import { createDownloadSubtabs } from './ui/download/subtabs.js';
import { restoreLocationDownload } from './ui/download/location.js';
import { createQrConfiguration } from './ui/encoding/configuration.js';
import { createAnimationSection } from './ui/download/animation/section.js';
import { createDownloadActions } from './ui/download/actions.js';
import { createFrameNavigation } from './ui/download/frames.js';
import { initializeDialogs } from './ui/dialogs.js';
import { bindApplicationEvents } from './ui/events.js';
import { getApplicationElements } from './ui/elements.js';
import { createPrimaryTabs } from './ui/navigation.js';
import { createPreviewViewport } from './ui/preview/viewport.js';
import { createInvalidPreviewRenderer } from './ui/preview/invalid.js';
import { createRenderController } from './ui/preview/render.js';
import { createQrRenderer } from './ui/preview/qr-renderer.js';
import { createPreviewSizeControls } from './ui/preview/size.js';
import { createStyleSubtabs } from './ui/style/subtabs.js';
import { createColorSection } from './ui/style/colors/section.js';
import { createPixelArtEditor } from './ui/style/art/pixel-editor.js';
import { createImageInputController } from './ui/style/art/image-input.js';
import { createEyeShapeSection } from './ui/style/eyes/section.js';
import { createModuleShapeSection } from './ui/style/modules/section.js';
import qrEncoder from '../qr/index.js';

const {
  form, canvas, qrPreviewViewport, previewViewControls, previewViewFit, previewViewActual, chunkPreviewNav,
  chunkPreviewPrev, chunkPreviewNext, chunkPreviewStatus, optionsPreview, encodedPreview, payloadRevealSecrets, payloadRevealToggle,
  qrFormat, bulkEnabled, bulkFields, bulkExpectedFields, bulkRequiredFields, bulkFileInput, bulkRowIndex,
  bulkStatus, bulkClear, choiceButtons, formatFieldsets, qrVersion, qrVersionValue, versionAuto,
  maskPattern, maskGrid, qrWidth, qrWidthValue, qrWidthAuto, qrScale, qrScaleValue,
  qrMargin, qrMarginValue, colorDark, colorLight, colorDarkTransparency, colorDarkTransparencyValue, colorLightTransparency,
  colorLightTransparencyValue, gradientType, gradientControls, gradientAngleControls, gradientAngle, gradientAngleValue, colorGradientEnd,
  colorGradientEndTransparency, colorGradientEndTransparencyValue, imageFillControls, imageFillInput, imageFillRecommended, imageFillClear, frameMessageMode,
  customFrameMessageField, customFrameMessage, frameMessageCenter, frameMessageCenterArt, frameFont, frameMessageColor, frameLineHeight,
  frameLineHeightValue, moduleShape, moduleCustomControls, moduleRounding, moduleRoundingValue, moduleInset, moduleInsetValue,
  moduleRotation, moduleRotationValue, eyeShape, eyeCustomControls, eyeOuterRounding, eyeOuterRoundingValue, eyeCenterRounding,
  eyeCenterRoundingValue, eyeCustomColorsEnabled, eyeColorControls, eyeOuterColor, eyeCenterColor, centerArtMode, centerArtControls,
  centerArtSize, centerArtSizeValue, centerArtBackground, centerArtBackgroundLabel, centerLogoControls, centerLogoInput, centerLogoClear,
  centerEmojiControls, centerEmoji, emojiOptions, centerPixelControls, pixelArtColor, pixelArtClear, pixelArtPalette,
  pixelArtMatchModuleShape, pixelArtSizeInput, pixelArtSizeValue, pixelArtGrid, downloadFormat, downloadQualityControls, downloadQuality,
  downloadQualityValue, printWidthAuto, printWidth, printWidthValue, downloadCurrent, downloadCurrentPdf, downloadZip,
  downloadAllPdf, downloadActions, downloadStatus, optionsJson, errorCorrection, errorCorrectionLabel, errorCorrectionValue,
  errorCorrectionHelp, modeAuto, encodingMode, encodingModeButtons, detectedMode, segmentSummary, versionSummary,
  capacitySummary, unusedSummary, modeValidation, formatValidation, tabButtons, tabPanels, debugSubtabButtons,
  debugSubtabPanels, styleSubtabButtons, styleSubtabPanels, downloadSubtabButtons, downloadSubtabPanels, downloadSubtabBar, downloadAnimationTab,
  animationTimingMode, animationMinutes, animationSeconds, animationMilliseconds, animationDurationSummary, downloadAnimatedGif, downloadAnimationMp4,
  contentSubtabButtons, contentSubtabPanels, debugEnabled, debugUnmask, debugOutlineModeButtons, urlInput, textInput,
  numberStart, numberEnd, numberStep, numberPrefix, numberSuffix, numberSequenceIndex, numberSequenceValue,
  wifiSsid, wifiPassword, wifiEncryption, wifiHidden, emailTo, emailSubject, emailBody,
  emailBodyLengthHint, phoneNumber, phoneFormatButtons, smsNumber, smsBody, smsLengthHint, eventTitle,
  eventAllDay, eventStartDate, eventStartTime, eventEndDate, eventEndTime, eventLocation, eventDescription,
  eventUrl, eventTimeFields, geoLatitude, geoLongitude, geoQuery, geoMapElement, vcardName,
  vcardOrg, vcardTitle, vcardPhone, vcardEmail, vcardUrl, fileInput, fileEncodingMode,
  fileChunkControls, fileChunkVersionAuto, fileChunkVersion, fileChunkVersionValue, fileIncludeManifest, fileCompressTransfer, fileCustomMetadata,
  fileChunkIndex, fileChunkIndexValue, fileCapacityHint, clearFileButton,
} = getApplicationElements(document);

const debugColors = {
  data: document.getElementById('debug-data-color'),
  mode: document.getElementById('debug-mode-color'),
  charCount: document.getElementById('debug-char-count-color'),
  ecLevel: document.getElementById('debug-ecl-color'),
  mask: document.getElementById('debug-mask-color'),
  errorCorrection: document.getElementById('debug-ecc-color'),
  remainder: document.getElementById('debug-remainder-color'),
  padding: document.getElementById('debug-padding-color'),
  terminator: document.getElementById('debug-terminator-color'),
  finder: document.getElementById('debug-finder-color'),
  alignment: document.getElementById('debug-alignment-color'),
  timing: document.getElementById('debug-timing-color'),
  format: document.getElementById('debug-format-color'),
  darkModule: document.getElementById('debug-dark-module-color'),
  version: document.getElementById('debug-version-color'),
};

const MASK_VALUES = ['', '0', '1', '2', '3', '4', '5', '6', '7'];

const ERROR_LEVELS = [
  {
    value: 'L',
    label: 'Low',
    detail: 'Uses the least redundancy and can still scan if about 7% of the symbol area is damaged or covered.',
  },
  {
    value: 'M',
    label: 'Medium',
    detail: 'Balances capacity and resilience, with recovery for about 15% of damaged or covered area.',
  },
  {
    value: 'Q',
    label: 'Quartile',
    detail: 'Spends more of the code on correction data, allowing recovery from about 25% damage or occlusion.',
  },
  {
    value: 'H',
    label: 'High',
    detail: 'Uses the most correction data, so the code can often survive about 30% of its area being obscured.',
  },
];

const MODE_LABELS = {
  numeric: 'Numeric',
  alphanumeric: 'Alphanumeric',
  byte: 'Byte / Binary',
  kanji: 'Kanji',
  mixed: 'Mixed',
};

const MODE_CAPACITY = {
  numeric: { L: 7089, M: 5596, Q: 3993, H: 3057 },
  alphanumeric: { L: 4296, M: 3391, Q: 2420, H: 1852 },
  byte: { L: 2953, M: 2331, Q: 1663, H: 1273 },
  kanji: { L: 1817, M: 1435, Q: 1024, H: 784 },
};

const MASK_LABELS = {
  '': 'Best fit',
  0: '(row + col) mod 2 = 0',
  1: 'row mod 2 = 0',
  2: 'col mod 3 = 0',
  3: '(row + col) mod 3 = 0',
  4: '(floor(row / 2) + floor(col / 3)) mod 2 = 0',
  5: 'row * col mod 2 + row * col mod 3 = 0',
  6: '((row * col mod 2) + (row * col mod 3)) mod 2 = 0',
  7: '((row + col mod 2) + (row * col mod 3)) mod 2 = 0',
};

let chunkSettingsRefreshTimer = 0;
let chunkSettingsRefreshRequest = 0;
let cancelRenderRequest = () => {};
let renderedQrWidth = null;
let renderedQrModuleScale = null;
const previewViewport = createPreviewViewport({
  viewport: qrPreviewViewport,
  canvas,
  controls: previewViewControls,
  fitButton: previewViewFit,
  actualButton: previewViewActual,
  getRenderMetrics: () => ({ renderedWidth: renderedQrWidth, moduleScale: renderedQrModuleScale }),
});
const setPreviewViewMode = previewViewport.setMode;
const schedulePreviewViewportSync = previewViewport.scheduleSync;
const pixelArtEditor = createPixelArtEditor({
  paletteElement: pixelArtPalette,
  customColorInput: pixelArtColor,
  clearButton: pixelArtClear,
  grid: pixelArtGrid,
  sizeInput: pixelArtSizeInput,
  sizeValue: pixelArtSizeValue,
  onChange: renderQr,
});
let activeTabName = 'content';
let activeDebugSubtab = 'encoding';
let activeDebugOutlineMode = 'codewords';
const SMS_MAX_LENGTH = 160;
const EMAIL_SUBJECT_MAX_LENGTH = 120;
const NUMBER_SERIES_MAX_FRAMES = 10000;
const MAX_QR_TARGET_WIDTH = 2048;
const QR_ALPHANUMERIC_CHARACTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const PRINT_PIXELS_PER_INCH = 192;
const MIN_PRINT_MODULE_INCHES = 0.02;
const CALENDAR_TITLE_MAX_LENGTH = 120;
const CALENDAR_LOCATION_MAX_LENGTH = 160;
const CALENDAR_DESCRIPTION_MAX_LENGTH = 500;
const FILE_PROTOCOL_VERSION = '1';
const FILE_MANIFEST_MAGIC = 'FILE';
const DEFAULT_CHUNK_AUTO_VERSION = 8;
const FILE_MANIFEST_HEADER_BYTES = 10;
const FILE_TLV_HEADER_BYTES = 3;
const FILE_MANIFEST_FLAGS = {
  gzip: 0x01,
};
const FILE_MANIFEST_FIELDS = {
  name: 1,
  mimeType: 2,
  modifiedAt: 3,
  originalSize: 4,
  validationType: 5,
  validationValue: 6,
  customMetadata: 8,
};
const fileCache = createFileCache({
  input: fileInput,
  createId: createCompactFileId,
  encodeBase64: arrayBufferToBase64,
  isCompressionEnabled: isTransferCompressionEnabled,
});
const getActiveFile = fileCache.getFile;
const ensureFileCacheOwnership = fileCache.ensureOwnership;
const getTransferFileBytes = fileCache.getTransferBytes;
const fileManifestController = createFileManifestController({
  cache: fileCache,
  includeManifest: () => fileIncludeManifest.checked,
  getCustomMetadata: () => fileCustomMetadata.value,
  isCompressionEnabled: isTransferCompressionEnabled,
  protocol: {
    version: FILE_PROTOCOL_VERSION,
    magic: FILE_MANIFEST_MAGIC,
    headerBytes: FILE_MANIFEST_HEADER_BYTES,
    fieldHeaderBytes: FILE_TLV_HEADER_BYTES,
    flags: FILE_MANIFEST_FLAGS,
    fieldTypes: FILE_MANIFEST_FIELDS,
  },
});
const getManifestByteLength = fileManifestController.getByteLength;
const getActiveFileManifest = fileManifestController.getManifest;
const fileCapacityCalculator = createFileCapacityCalculator({
  encoder: qrEncoder,
  cache: fileCache,
  getOptions: buildOptions,
  buildPayload,
  getConfiguredVersion: getConfiguredChunkVersion,
  isAutoVersion: () => versionAuto.checked,
  getCurrentChunk: () => Number.parseInt(fileChunkIndex.value, 10) || 1,
  includeManifest: () => fileIncludeManifest.checked,
  isCompressionEnabled: isTransferCompressionEnabled,
  getCustomMetadata: () => fileCustomMetadata.value.trim(),
  getManualMode: getCurrentEncodingMode,
  getManifestLength: getManifestByteLength,
  getShareableAppUrl,
});
const invalidateChunkCapacityCache = fileCapacityCalculator.invalidate;
const getFileCapacityBytes = fileCapacityCalculator.getDataUrlCapacity;
const getBlobUrlCapacityBytes = fileCapacityCalculator.getDownloadUrlCapacity;
const getChunkedFileCapacityInfo = fileCapacityCalculator.getChunkInfo;
const fileSection = createFileSection({
  format: qrFormat,
  mode: fileEncodingMode,
  input: fileInput,
  capacityHint: fileCapacityHint,
  clearButton: clearFileButton,
  chunkControls: fileChunkControls,
  chunkVersionAuto: fileChunkVersionAuto,
  includeManifest: fileIncludeManifest,
  compressTransfer: fileCompressTransfer,
  customMetadata: fileCustomMetadata,
  chunkIndex: fileChunkIndex,
  cache: fileCache,
  getDataUrlCapacity: getFileCapacityBytes,
  getDownloadUrlCapacity: getBlobUrlCapacityBytes,
  getChunkInfo: getChunkedFileCapacityInfo,
  isCompressionEnabled: isTransferCompressionEnabled,
  syncChunkVersionControls,
  syncChunkLabel: syncFileChunkLabel,
  syncNavigation: () => syncChunkPreviewNavigation(),
  resetCache: resetCachedFileState,
});
const getSelectedFileEncodingMode = fileSection.getMode;
const syncFileModeVisibility = fileSection.syncMode;
const syncFileCapacityHint = fileSection.syncCapacity;
const clearLoadedFile = fileSection.clear;
const bulkImportSection = createBulkImportSection({
  enabled: bulkEnabled,
  format: qrFormat,
  fields: bulkFields,
  expectedFields: bulkExpectedFields,
  requiredFields: bulkRequiredFields,
  fileInput: bulkFileInput,
  rowIndex: bulkRowIndex,
  status: bulkStatus,
  clearButton: bulkClear,
  fileFormatButton: document.querySelector('[data-choice-target="qr-format"][data-choice-value="file"]'),
  onFormatFallback: syncChoiceButtons,
  onChange: renderQr,
});
const getBulkSchema = bulkImportSection.getSchema;
const isBulkMode = bulkImportSection.isMode;
const getBulkCurrentRow = bulkImportSection.getCurrentRow;
const getBulkRowCount = bulkImportSection.getRowCount;
const getBulkParseError = bulkImportSection.getError;
const syncBulkStatus = bulkImportSection.syncStatus;
const syncBulkControls = bulkImportSection.syncControls;
const clearBulkData = bulkImportSection.clear;
const loadBulkFile = bulkImportSection.load;

function isDebugOverlayActive() {
  return (activeTabName === 'debug' && activeDebugSubtab === 'overlay') || debugEnabled.checked;
}

function getDefaultUrlValue() {
  if (window.location.protocol === 'file:') {
    return 'https://qr.lewismoten.com';
  }

  return window.location.href;
}

function getShareableAppUrl() {
  if (window.location.protocol === 'file:') {
    return 'https://qr.lewismoten.com/';
  }

  return `${window.location.origin}${window.location.pathname}`;
}

function clearCanvas() {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function readInteger(inputElement) {
  if (!inputElement?.value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(inputElement.value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getSelectedErrorLevel() {
  return ERROR_LEVELS[Number.parseInt(errorCorrection.value, 10)] ?? ERROR_LEVELS[1];
}

function getCurrentEncodingMode() {
  return modeAuto.checked ? undefined : encodingMode.value;
}

const previewSizeControls = createPreviewSizeControls({
  canvas,
  elements: { width: qrWidth, widthValue: qrWidthValue, widthAuto: qrWidthAuto,
    scale: qrScale, scaleValue: qrScaleValue, margin: qrMargin, marginValue: qrMarginValue,
    printAuto: printWidthAuto, printWidth, printValue: printWidthValue },
  getMetrics: () => ({ width: renderedQrWidth, scale: renderedQrModuleScale }),
  pixelsPerInch: PRINT_PIXELS_PER_INCH,
  minPrintModuleInches: MIN_PRINT_MODULE_INCHES,
});
const getPrintWidthInches = previewSizeControls.getPrintWidth;
const syncPrintWidthControls = previewSizeControls.syncPrint;
const formatWidthLabel = previewSizeControls.formatWidth;
const syncSizeLabels = previewSizeControls.syncLabels;

const moduleShapeSection = createModuleShapeSection({
  shape: moduleShape,
  controls: moduleCustomControls,
  rounding: moduleRounding,
  roundingValue: moduleRoundingValue,
  inset: moduleInset,
  insetValue: moduleInsetValue,
  rotation: moduleRotation,
  rotationValue: moduleRotationValue,
});
const syncModuleShapeControls = moduleShapeSection.sync;
const getCurrentModuleShapeOptions = moduleShapeSection.getOptions;

const eyeShapeSection = createEyeShapeSection({
  shape: eyeShape,
  controls: eyeCustomControls,
  outerRounding: eyeOuterRounding,
  outerRoundingValue: eyeOuterRoundingValue,
  centerRounding: eyeCenterRounding,
  centerRoundingValue: eyeCenterRoundingValue,
  customColorsEnabled: eyeCustomColorsEnabled,
  colorControls: eyeColorControls,
  isImageFill: () => gradientType.value === 'image',
});
const syncEyeShapeControls = eyeShapeSection.sync;
const getCurrentEyeShapeOptions = eyeShapeSection.getOptions;

function syncEmojiSelection() {
  emojiOptions.forEach((button) => {
    const isActive = button.dataset.emoji === centerEmoji.value;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function syncCenterArtworkControls() {
  const mode = centerArtMode.value;
  centerArtControls.hidden = mode === 'none';
  centerLogoControls.hidden = mode !== 'logo';
  centerEmojiControls.hidden = mode !== 'emoji';
  centerPixelControls.hidden = mode !== 'pixel';
  centerArtSizeValue.textContent = `${centerArtSize.value}%`;
  centerArtBackgroundLabel.textContent =
    mode === 'emoji' ? 'Protect with a light outline' : 'Protect with a light background';
  pixelArtEditor.syncSizeLabel();
  syncEmojiSelection();
}

function formatVersionLabel() {
  qrVersionValue.textContent = versionAuto.checked ? 'Auto' : qrVersion.value;
}

function formatErrorCorrection() {
  const selected = getSelectedErrorLevel();
  errorCorrectionLabel.textContent = selected.label;
  errorCorrectionValue.textContent = selected.value;
  errorCorrectionHelp.textContent = selected.detail;
}

function syncOutputs() {
  syncSizeLabels();
  formatColorTransparency();
  syncGradientControls();
  syncNumberSequenceControls();
  getCurrentFrameMessage();
  frameMessageCenterArt.checked = frameMessageCenter.checked;
  frameLineHeightValue.textContent = `${frameLineHeight.value} px`;
  syncModuleShapeControls();
  syncEyeShapeControls();
  syncCenterArtworkControls();
  syncChunkPreviewNavigation();
  syncPrintWidthControls();
  formatVersionLabel();
  formatErrorCorrection();
  qrVersion.disabled = versionAuto.checked;
  encodingMode.disabled = modeAuto.checked;
  encodingModeButtons.forEach((button) => {
    button.disabled = modeAuto.checked;
    button.setAttribute('aria-disabled', String(modeAuto.checked));
  });
  syncEmailBodyLengthHint();
  syncFileCapacityHint();
}

function syncDownloadControls() {
  const isJpg = downloadFormat.value === 'jpg';
  downloadQualityControls.hidden = !isJpg;
  downloadQualityValue.textContent = `${downloadQuality.value}%`;
  const frameCount = getDownloadFrameCount();
  const hasAnimation = frameCount > 1;
  downloadZip.hidden = frameCount <= 1;
  downloadAllPdf.hidden = frameCount <= 1;
  downloadAnimationTab.hidden = !hasAnimation;
  downloadSubtabBar.classList.toggle('has-animation', hasAnimation);
  if (!hasAnimation && downloadAnimationTab.classList.contains('is-active')) {
    activateDownloadSubtab('image');
  }
  downloadActions.forEach((actions) => {
    actions.classList.toggle('has-multiple', frameCount > 1);
  });
  if (frameCount > 1) {
    downloadZip.textContent = `Download all ${frameCount} as ZIP`;
    downloadAllPdf.textContent = `Download all ${frameCount} as PDF`;
  }
  syncAnimationDurationSummary();
}

function syncFileChunkLabel() {
  const current = Number.parseInt(fileChunkIndex.value, 10) || 1;
  const total = Number.parseInt(fileChunkIndex.max, 10) || 1;
  fileChunkIndexValue.textContent = `${Math.min(current, total)} / ${total}`;
}

function getConfiguredChunkVersion() {
  const version = Number.parseInt(fileChunkVersion.value, 10);
  return Number.isFinite(version) ? version : DEFAULT_CHUNK_AUTO_VERSION;
}

function syncFileChunkVersionLabel() {
  fileChunkVersionValue.textContent = `V${getConfiguredChunkVersion()}`;
}

function syncChunkVersionControls() {
  fileChunkVersionAuto.checked = versionAuto.checked;
  fileChunkVersion.value = qrVersion.value || String(DEFAULT_CHUNK_AUTO_VERSION);
  const isChunked = qrFormat.value === 'file' && getSelectedFileEncodingMode() === 'chunked';
  fileChunkVersion.disabled = !isChunked || fileChunkVersionAuto.checked;
  syncFileChunkVersionLabel();
}

function resetTransferDerivedState() {
  fileCache.resetDerived();
  invalidateChunkCapacityCache();
}

function isTransferCompressionEnabled() {
  return fileIncludeManifest.checked && fileCompressTransfer.checked;
}

function scheduleChunkSettingsRefresh({ resetChunkIndex = false, delay = 160 } = {}) {
  chunkSettingsRefreshRequest += 1;
  const refreshRequestId = chunkSettingsRefreshRequest;
  cancelRenderRequest();

  if (chunkSettingsRefreshTimer) {
    window.clearTimeout(chunkSettingsRefreshTimer);
  }

  if (resetChunkIndex) {
    fileChunkIndex.value = '1';
  }

  // Never let an in-flight render reuse a capacity calculated for the old version.
  invalidateChunkCapacityCache();

  chunkSettingsRefreshTimer = window.setTimeout(() => {
    if (refreshRequestId !== chunkSettingsRefreshRequest) {
      return;
    }

    chunkSettingsRefreshTimer = 0;
    syncFileCapacityHint();
    renderQr();
  }, delay);
}

function resetCachedFileState({ clearInput = false } = {}) {
  fileCache.reset({ clearInput });
  invalidateChunkCapacityCache();
}

function syncSmsLengthHint() {
  smsLengthHint.textContent = `${smsBody.value.length} / ${SMS_MAX_LENGTH}`;
}

function setFormatVisibility() {
  syncBulkControls();
  const activeFormat = qrFormat.value;
  formatFieldsets.forEach((fieldset) => {
    const isActive = !bulkEnabled.checked && fieldset.dataset.formatFields === activeFormat;
    fieldset.hidden = !isActive;
    fieldset.classList.toggle('is-active', isActive);
    fieldset.setAttribute('aria-hidden', String(!isActive));
  });

  const showSecretToggle = activeFormat === 'wifi';
  payloadRevealToggle.hidden = !showSecretToggle;
  payloadRevealToggle.setAttribute('aria-hidden', String(!showSecretToggle));
  syncFileModeVisibility();
  syncCalendarEventControls();
}

const filePayloadBuilder = createFilePayloadBuilder({
  cache: fileCache,
  getMode: getSelectedFileEncodingMode,
  getShareableAppUrl,
  includeManifest: () => fileIncludeManifest.checked,
  chunkIndex: fileChunkIndex,
  getManifest: getActiveFileManifest,
  getCapacityInfo: getChunkedFileCapacityInfo,
  syncCapacity: syncFileCapacityHint,
});
const buildFilePayload = filePayloadBuilder.build;

function placeholderValue(value, placeholder) {
  return value.trim() || placeholder;
}

const eventSection = createEventSection({
  title: eventTitle,
  allDay: eventAllDay,
  startDate: eventStartDate,
  startTime: eventStartTime,
  endDate: eventEndDate,
  endTime: eventEndTime,
  location: eventLocation,
  description: eventDescription,
  url: eventUrl,
  timeFields: eventTimeFields,
});
const initializeCalendarEventDefaults = eventSection.initialize;
const syncCalendarEventControls = eventSection.sync;
const buildCalendarEventPayload = eventSection.buildPayload;

const geoSection = createGeoSection({
  latitudeInput: geoLatitude,
  longitudeInput: geoLongitude,
  labelInput: geoQuery,
  mapElement: geoMapElement,
  isActive: () => qrFormat.value === 'geo',
  onChange: renderQr,
});
const buildGeoPayload = geoSection.buildPayload;
const updateGeoMap = geoSection.update;

const phoneSection = createPhoneSection({
  buttons: phoneFormatButtons,
  inputs: [phoneNumber, smsNumber, vcardPhone],
  onChange: renderQr,
});

const numberSection = createNumberSection({
  startInput: numberStart,
  endInput: numberEnd,
  stepInput: numberStep,
  prefixInput: numberPrefix,
  suffixInput: numberSuffix,
  indexInput: numberSequenceIndex,
  statusElement: numberSequenceValue,
  maxFrames: NUMBER_SERIES_MAX_FRAMES,
  alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
  validatePrintableText,
});
const getNumberSequenceInfo = numberSection.getSequenceInfo;
const getNumberPayload = numberSection.getPayload;
const syncNumberSequenceControls = numberSection.sync;

const frameNavigation = createFrameNavigation({
  format: qrFormat,
  isBulkMode,
  getBulkRowCount,
  bulkRowIndex,
  syncBulkStatus,
  getFileEncodingMode: getSelectedFileEncodingMode,
  fileChunkIndex,
  syncFileChunkLabel,
  numberSequenceIndex,
  getNumberSequenceInfo,
  syncNumberSequenceControls,
  maxNumberFrames: NUMBER_SERIES_MAX_FRAMES,
  navigation: chunkPreviewNav,
  status: chunkPreviewStatus,
  previousButton: chunkPreviewPrev,
  nextButton: chunkPreviewNext,
  onDownloadStateChange: syncDownloadControls,
});
const getDownloadFrameCount = frameNavigation.getFrameCount;
const getCurrentFrameIndex = frameNavigation.getCurrentFrame;
const setCurrentFrameIndex = frameNavigation.setCurrentFrame;
const syncChunkPreviewNavigation = frameNavigation.sync;

const animationSection = createAnimationSection({
  timingMode: animationTimingMode,
  minutesInput: animationMinutes,
  secondsInput: animationSeconds,
  millisecondsInput: animationMilliseconds,
  summary: animationDurationSummary,
  mp4Button: downloadAnimationMp4,
  getFrameCount: getDownloadFrameCount,
  getSupportedMp4MimeType,
});
const getAnimationTiming = animationSection.getTiming;
const formatAnimationDuration = animationSection.formatDuration;
const syncAnimationDurationSummary = animationSection.sync;

createDownloadActions({
  canvas,
  formatInput: downloadFormat,
  qualityInput: downloadQuality,
  status: downloadStatus,
  currentButton: downloadCurrent,
  currentPdfButton: downloadCurrentPdf,
  zipButton: downloadZip,
  allPdfButton: downloadAllPdf,
  gifButton: downloadAnimatedGif,
  mp4Button: downloadAnimationMp4,
  getPrintWidthInches,
  getFrameCount: getDownloadFrameCount,
  getCurrentFrame: getCurrentFrameIndex,
  setCurrentFrame: setCurrentFrameIndex,
  syncFrameNavigation: syncChunkPreviewNavigation,
  render: renderQr,
  getAnimationTiming,
  formatAnimationDuration,
});

const wifiSection = createWifiSection({
  ssid: wifiSsid,
  password: wifiPassword,
  encryption: wifiEncryption,
  hidden: wifiHidden,
  revealSecrets: payloadRevealSecrets,
  onChange() {
    syncChoiceButtons();
    renderQr();
  },
});
const syncWifiSecurityState = wifiSection.sync;
const buildWifiPayload = wifiSection.buildPayload;
const maskWifiPayload = wifiSection.maskPayload;

const sharedFieldsSection = createSharedFieldsSection({
  emailInputs: [emailTo, vcardEmail],
  messageInputs: [textInput, smsBody, emailBody],
  emailSubject,
  onMessageChange() {
    syncSmsLengthHint();
    syncEmailBodyLengthHint();
  },
});
const buildEmailPayload = sharedFieldsSection.buildEmailPayload;
const buildEmailPayloadWithBody = sharedFieldsSection.buildEmailPayloadWithBody;

let imageFillController = null;
const colorSection = createColorSection({
  darkColor: colorDark,
  lightColor: colorLight,
  darkTransparency: colorDarkTransparency,
  darkTransparencyValue: colorDarkTransparencyValue,
  lightTransparency: colorLightTransparency,
  lightTransparencyValue: colorLightTransparencyValue,
  gradientType,
  gradientControls,
  gradientAngleControls,
  gradientAngle,
  gradientAngleValue,
  gradientEndColor: colorGradientEnd,
  gradientEndTransparency: colorGradientEndTransparency,
  gradientEndTransparencyValue: colorGradientEndTransparencyValue,
  imageFillControls,
  imageFillClear,
  hasImageFill: () => Boolean(imageFillController?.getImage()),
  colorWithTransparency,
});
const formatColorTransparency = colorSection.formatTransparency;
const syncGradientControls = colorSection.sync;
const getCurrentGradientOptions = colorSection.getGradientOptions;
const applyRecommendedImageContrast = colorSection.applyRecommendedImageContrast;

imageFillController = createImageInputController({
  input: imageFillInput,
  clearButton: imageFillClear,
  onUpdate(image) {
    if (image) applyRecommendedImageContrast();
    syncGradientControls();
    renderQr();
  },
});

const centerLogoController = createImageInputController({
  input: centerLogoInput,
  clearButton: centerLogoClear,
  onUpdate: renderQr,
});

const vcardSection = createVCardSection({
  name: vcardName,
  organization: vcardOrg,
  title: vcardTitle,
  phone: vcardPhone,
  email: vcardEmail,
  website: vcardUrl,
});
const buildVCardPayload = vcardSection.buildPayload;

function buildBulkEncodedText(row = getBulkCurrentRow()) {
  return serializeBulkRow({
    row,
    format: qrFormat.value,
    frameIndex: getCurrentFrameIndex(),
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
  });
}

const frameSection = createFrameSection({
  format: qrFormat,
  isBulkMode,
  getBulkRow: getBulkCurrentRow,
  buildBulkText: buildBulkEncodedText,
  parseBoolean: parseBulkBoolean,
  getNumberPayload,
  getActiveFile,
  getFileMode: getSelectedFileEncodingMode,
  fileIndex: fileChunkIndex,
  mode: frameMessageMode,
  customField: customFrameMessageField,
  customMessage: customFrameMessage,
  centerCheckbox: frameMessageCenter,
  artCenterCheckbox: frameMessageCenterArt,
  artMode: centerArtMode,
  font: frameFont,
  values: {
    url: urlInput,
    text: textInput,
    wifi: wifiSsid,
    email: emailTo,
    phone: phoneNumber,
    sms: smsNumber,
    geoLabel: geoQuery,
    latitude: geoLatitude,
    longitude: geoLongitude,
    vcardName,
    vcardOrg,
    vcardEmail,
  },
  event: {
    title: eventTitle,
    allDay: eventAllDay,
    startDate: eventStartDate,
    startTime: eventStartTime,
    endDate: eventEndDate,
    endTime: eventEndTime,
  },
  onDisableArtwork() {
    centerArtMode.value = 'none';
    syncChoiceButtons();
    syncCenterArtworkControls();
  },
});
const getCurrentFrameMessage = frameSection.getMessage;
const setFrameMessageCenter = frameSection.setCentered;
const getFrameFont = frameSection.getFont;

const contentPayload = createContentPayload({
  elements: { qrFormat, urlInput, textInput, phoneNumber, smsNumber, smsBody, wifiEncryption, wifiSsid, wifiPassword, wifiHidden, emailTo, emailSubject, emailBody, geoLatitude, geoLongitude, geoQuery, vcardName, vcardOrg, vcardTitle, vcardPhone, vcardEmail, vcardUrl },
  bulk: { isMode: isBulkMode, build: buildBulkEncodedText },
  builders: { number: getNumberPayload, wifi: buildWifiPayload, email: buildEmailPayload, event: buildCalendarEventPayload, geo: buildGeoPayload, vcard: buildVCardPayload, file: buildFilePayload },
  file: { preview: createFilePayloadPreview({ getFile: getActiveFile, getMode: getSelectedFileEncodingMode, getCapacity: getChunkedFileCapacityInfo, includeManifest: fileIncludeManifest }) },
});
const buildEncodedText = contentPayload.build;
const buildEncodedPreviewTemplate = contentPayload.preview;

const qrConfiguration = createQrConfiguration({
  elements: { qrMargin, qrScale, colorDark, colorDarkTransparency, colorLight,
    colorLightTransparency, qrWidthAuto, qrWidth, qrFormat, versionAuto, qrVersion,
    maskPattern, optionsJson, modeAuto },
  encoder: qrEncoder,
  helpers: { getErrorLevel: getSelectedErrorLevel, readInteger, colorWithTransparency,
    getFileMode: getSelectedFileEncodingMode, getChunkVersion: getConfiguredChunkVersion,
    getEncodingMode: getCurrentEncodingMode },
  alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
});
const buildOptions = qrConfiguration.buildOptions;
const buildPayload = qrConfiguration.buildPayload;
const createQrDefinition = qrConfiguration.createDefinition;

function updateOptionsPreview(options) {
  optionsPreview.textContent = JSON.stringify(options, null, 2);
}

function getEncodedPreviewText(encodedText) {
  const previewText = encodedText || buildEncodedPreviewTemplate();

  if (qrFormat.value === 'wifi') {
    return maskWifiPayload(previewText);
  }

  return previewText;
}

function updateEncodedPreview(encodedText) {
  encodedPreview.textContent = getEncodedPreviewText(encodedText);
}

const emailCapacity = createEmailCapacity({
  body: emailBody, hint: emailBodyLengthHint, encoder: qrEncoder,
  buildOptions, buildPayload, buildEmail: buildEmailPayloadWithBody,
});
const getEmailBodyCapacityInfo = emailCapacity.getInfo;
const syncEmailBodyLengthHint = emailCapacity.sync;

const getFormatValidationState = createFormatValidator({
  elements: {
    qrFormat, bulkFileInput, urlInput, emailTo, emailSubject, emailBody,
    phoneNumber, smsNumber, smsBody, geoLatitude, geoLongitude, geoQuery,
    vcardName, vcardOrg, vcardTitle, vcardPhone, vcardEmail, vcardUrl,
    eventTitle, eventAllDay, eventStartDate, eventStartTime, eventEndDate,
    eventEndTime, eventLocation, eventDescription, eventUrl,
  },
  bulk: {
    isMode: isBulkMode,
    getError: getBulkParseError,
    getRow: getBulkCurrentRow,
    getFrameIndex: getCurrentFrameIndex,
    getSchema: getBulkSchema,
  },
  numberSection,
  file: {
    getActive: getActiveFile,
    getMode: getSelectedFileEncodingMode,
    getCapacity: getChunkedFileCapacityInfo,
  },
  getEmailCapacity: getEmailBodyCapacityInfo,
  limits: {
    emailSubject: EMAIL_SUBJECT_MAX_LENGTH,
    byteCapacity: MODE_CAPACITY.byte.L,
    sms: SMS_MAX_LENGTH,
    calendarTitle: CALENDAR_TITLE_MAX_LENGTH,
    calendarLocation: CALENDAR_LOCATION_MAX_LENGTH,
    calendarDescription: CALENDAR_DESCRIPTION_MAX_LENGTH,
  },
});

const encodingDiagnostics = createEncodingDiagnostics({
  encoder: qrEncoder,
  modeLabels: MODE_LABELS,
  modeCapacity: MODE_CAPACITY,
  alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
  elements: {
    detectedMode,
    segmentSummary,
    versionSummary,
    capacitySummary,
    unusedSummary,
    modeValidation,
    formatValidation,
    encodedPreview,
    bulkFields,
  },
  getCurrentMode: getCurrentEncodingMode,
  getFormat: () => qrFormat.value,
  getActiveFieldset: (format) => document.querySelector(`.format-fields[data-format-fields="${format}"]`),
  isBulkMode,
  buildDebugModel: buildDebugOverlayModel,
});
const setValidationMessage = encodingDiagnostics.setValidation;
const validateManualMode = encodingDiagnostics.validateManualMode;
const updateEncodingSummary = encodingDiagnostics.updateSummary;

function buildMaskPreviewOptions(maskValue) {
  const selectedErrorLevel = getSelectedErrorLevel();
  const options = {
    errorCorrectionLevel: selectedErrorLevel.value,
    margin: 1,
    width: 72,
    color: {
      dark: colorWithTransparency(colorDark.value.trim() || '#111827', colorDarkTransparency),
      light: colorWithTransparency(colorLight.value.trim() || '#ffffff', colorLightTransparency),
    },
  };

  if (maskValue !== '') {
    options.maskPattern = Number.parseInt(maskValue, 10);
  }

  return options;
}

const debugStyles = createDebugStyles({
  colors: debugColors,
  getContrastingHex,
  getCategory: getDebugCategory,
});
const getCodewordStyle = debugStyles.getCodewordStyle;
const getModuleContrastColor = debugStyles.getModuleContrastColor;



const drawQr = createQrRenderer({
  canvas, qrWidth, qrWidthAuto, colorLight, eyeCustomColorsEnabled, eyeOuterColor,
  eyeCenterColor, debugColors, debugUnmask, centerArtMode, centerEmoji, centerArtSize,
  centerArtBackground, pixelArtMatchModuleShape, moduleShape, frameMessageCenter,
  frameLineHeight, frameMessageColor, maxTargetWidth: MAX_QR_TARGET_WIDTH,
  formatWidthLabel, getCurrentFrameMessage, getFrameFont, isDebugOverlayActive,
  getCurrentModuleShapeOptions, getCurrentEyeShapeOptions, getCurrentGradientOptions,
  imageFillController, getCodewordStyle, getModuleContrastColor, centerLogoController,
  pixelArtEditor, readInteger, schedulePreviewViewportSync,
  setRenderMetrics(width, scale) { renderedQrWidth = width; renderedQrModuleScale = scale; },
  getActiveDebugOutlineMode: () => activeDebugOutlineMode,
});

const renderInvalidPreview = createInvalidPreviewRenderer({
  canvas,
  encoder: qrEncoder,
  drawQr,
  clearCanvas,
});

const maskSelector = createMaskSelector({
  grid: maskGrid,
  input: maskPattern,
  values: MASK_VALUES,
  labels: MASK_LABELS,
  encoder: qrEncoder,
  moduleIsDark,
  buildOptions: buildMaskPreviewOptions,
  onChange: renderQr,
});
const ensureMaskButtons = maskSelector.ensure;
const syncMaskSelection = maskSelector.sync;
const renderMaskPreviews = maskSelector.renderPreviews;

const activateTab = createPrimaryTabs({
  buttons: tabButtons,
  panels: tabPanels,
  onActivate(tabName) {
    activeTabName = tabName;
    if (tabName === 'content' && qrFormat.value === 'geo') {
      window.requestAnimationFrame(updateGeoMap);
    }
    renderQr();
  },
});

const activateDebugSubtab = createDebugSubtabs({
  buttons: debugSubtabButtons,
  panels: debugSubtabPanels,
  onActivate(subtabName) {
    activeDebugSubtab = subtabName;
    renderQr();
  },
});

const activateStyleSubtab = createStyleSubtabs({
  buttons: styleSubtabButtons,
  panels: styleSubtabPanels,
});

const activateDownloadSubtab = createDownloadSubtabs({
  buttons: downloadSubtabButtons,
  panels: downloadSubtabPanels,
});

const activateContentSubtab = createContentSubtabs({
  buttons: contentSubtabButtons,
  panels: contentSubtabPanels,
  onActivate(subtabName) {
    if (subtabName === 'data' && qrFormat.value === 'geo') {
      window.requestAnimationFrame(updateGeoMap);
    }
  },
});

function syncChoiceButtons() {
  choiceButtons.forEach((button) => {
    const targetId = button.dataset.choiceTarget;
    const choiceValue = button.dataset.choiceValue;
    const target = document.getElementById(targetId);
    const isActive = Boolean(target) && target.value === choiceValue;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

const debugOutlineSelector = createOutlineSelector({
  buttons: debugOutlineModeButtons,
  defaultValue: activeDebugOutlineMode,
  onChange(value) {
    activeDebugOutlineMode = value;
    renderQr();
  },
});
const syncDebugOutlineSelection = debugOutlineSelector.sync;

const renderController = createRenderController({
  syncOutputs,
  syncFormat: setFormatVisibility,
  updateMap: updateGeoMap,
  buildText: buildEncodedText,
  buildOptions,
  buildPreview: buildEncodedPreviewTemplate,
  updateTextPreview: updateEncodedPreview,
  updateOptionsPreview,
  syncMask: syncMaskSelection,
  renderMasks: renderMaskPreviews,
  getValidation: getFormatValidationState,
  setValidation: setValidationMessage,
  renderInvalid: renderInvalidPreview,
  updateSummary: updateEncodingSummary,
  validateMode: validateManualMode,
  getModeError: () => modeValidation.textContent,
  buildPayload,
  createDefinition: createQrDefinition,
  drawQr,
  syncDownloads: syncDownloadControls,
  showBuildError(error, options) {
    encodedPreview.textContent = error.message;
    encodedPreview.classList.add('has-error');
    renderInvalidPreview(buildEncodedPreviewTemplate(), options, error.message);
    setValidationMessage(error.message || 'Unable to build QR content.');
    console.error(error);
  },
});
const renderQr = renderController.render;
cancelRenderRequest = renderController.cancel;

bindApplicationEvents({
  elements: {
    form, bulkEnabled, bulkFileInput, animationMinutes, animationSeconds, animationMilliseconds,
    downloadQuality, fileIncludeManifest, fileCompressTransfer, fileCustomMetadata,
    fileChunkVersionAuto, fileChunkVersion, fileChunkVersionValue, fileChunkIndex,
    fileInput, clearFileButton, qrFormat, frameMessageCenter, frameMessageCenterArt,
    choiceButtons, gradientType, moduleShape, eyeShape, centerArtMode, wifiEncryption,
    downloadFormat, animationTimingMode, fileEncodingMode, versionAuto, qrVersion,
    emojiOptions, centerEmoji, imageFillRecommended, chunkPreviewPrev, chunkPreviewNext,
  },
  actions: {
    syncFormat: setFormatVisibility, activateContent: activateContentSubtab, loadBulkFile,
    render: renderQr, syncAnimation: syncAnimationDurationSummary, syncDownloads: syncDownloadControls,
    resetTransfer: resetTransferDerivedState, scheduleChunkRefresh: scheduleChunkSettingsRefresh,
    formatVersion: formatVersionLabel, syncSmsLength: syncSmsLengthHint,
    syncEmailLength: syncEmailBodyLengthHint, syncFileCapacity: syncFileCapacityHint,
    resetFileCache: resetCachedFileState, clearFile: clearLoadedFile, syncChoices: syncChoiceButtons,
    syncWifi: syncWifiSecurityState, isBulkMode, setFrameCentered: setFrameMessageCenter,
    syncGradient: syncGradientControls, syncModules: syncModuleShapeControls,
    syncEyes: syncEyeShapeControls, syncArtwork: syncCenterArtworkControls,
    syncChunkVersion: syncChunkVersionControls, syncEmoji: syncEmojiSelection,
    applyImageContrast: applyRecommendedImageContrast, invalidateCapacity: invalidateChunkCapacityCache,
    getCurrentFrame: getCurrentFrameIndex, setCurrentFrame: setCurrentFrameIndex,
    getFrameCount: getDownloadFrameCount, syncNavigation: syncChunkPreviewNavigation,
    getFileMode: getSelectedFileEncodingMode,
  },
  defaultChunkVersion: DEFAULT_CHUNK_AUTO_VERSION,
});

const dialogs = initializeDialogs({ document, window });

pixelArtEditor.initialize();
initializeCalendarEventDefaults();
urlInput.value = getDefaultUrlValue();
syncOutputs();
setFormatVisibility();
ensureMaskButtons();
syncMaskSelection();
syncChoiceButtons();
syncWifiSecurityState();
phoneSection.initialize();
syncFileCapacityHint();
syncChunkVersionControls();
syncFileChunkLabel();
sharedFieldsSection.initialize();
syncSmsLengthHint();
syncEmailBodyLengthHint();
syncDebugOutlineSelection();
activateContentSubtab('data');
activateStyleSubtab('size');
activateDownloadSubtab('image');
activateDebugSubtab('encoding');
activateTab('content');
setPreviewViewMode('fit', true);
  restoreLocationDownload({ window, document });
renderQr();
dialogs.syncFromHash();
