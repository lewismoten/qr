import { colorWithTransparency, getContrastingHex } from './colors.js';
import { ERROR_LEVELS, FILE_PROTOCOL, LIMITS, MASK_LABELS, MASK_VALUES,
  MODE_CAPACITY, MODE_LABELS, QR_ALPHANUMERIC_CHARACTERS } from './configuration.js';
import { parseBoolean as parseBulkBoolean } from './csv.js';
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
import { createFormatVisibility } from './ui/content/format-visibility.js';
import { createEmailCapacity } from './ui/content/email/capacity.js';
import { createContentPayload, createFilePayloadPreview } from './ui/content/payload.js';
import { createFormatValidator } from './ui/content/validation.js';
import { createBulkImportSection } from './ui/content/bulk/section.js';
import { serializeBulkRow } from './ui/content/bulk/payload.js';
import {
  arrayBufferToBase64,
  createCompactFileId,
} from './ui/content/file/protocol.js';
import { createFileManifestController } from './ui/content/file/manifest.js';
import { createFileCapacityCalculator } from './ui/content/file/capacity.js';
import { createFileCache } from './ui/content/file/cache.js';
import { createFilePayloadBuilder } from './ui/content/file/payload.js';
import { createFileSection } from './ui/content/file/section.js';
import { createFileSettings } from './ui/content/file/settings.js';
import { createFrameSection } from './ui/content/frame/section.js';
import { createContentSections } from './ui/content/setup.js';
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
import { createDownloadControls } from './ui/download/controls.js';
import { restoreLocationDownload } from './ui/download/location.js';
import { createQrConfiguration } from './ui/encoding/configuration.js';
import { createDownloadSetup } from './ui/download/setup.js';
import { initializeDialogs } from './ui/dialogs.js';
import { bindApplicationEvents } from './ui/events.js';
import { getApplicationElements } from './ui/elements.js';
import { createNavigation } from './ui/navigation/setup.js';
import { createPreviewViewport } from './ui/preview/viewport.js';
import { createInvalidPreviewRenderer } from './ui/preview/invalid.js';
import { createRenderController } from './ui/preview/render.js';
import { createQrRenderer } from './ui/preview/qr-renderer.js';
import { createPreviewSizeControls } from './ui/preview/size.js';
import { createStyleSetup } from './ui/style/setup.js';
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
let activeTabName = 'content';
let activeDebugSubtab = 'encoding';
let activeDebugOutlineMode = 'codewords';
const { sms: SMS_MAX_LENGTH, emailSubject: EMAIL_SUBJECT_MAX_LENGTH,
  numberFrames: NUMBER_SERIES_MAX_FRAMES, qrTargetWidth: MAX_QR_TARGET_WIDTH,
  printPixelsPerInch: PRINT_PIXELS_PER_INCH, minPrintModuleInches: MIN_PRINT_MODULE_INCHES,
  calendarTitle: CALENDAR_TITLE_MAX_LENGTH, calendarLocation: CALENDAR_LOCATION_MAX_LENGTH,
  calendarDescription: CALENDAR_DESCRIPTION_MAX_LENGTH } = LIMITS;
const { version: FILE_PROTOCOL_VERSION, magic: FILE_MANIFEST_MAGIC,
  defaultChunkVersion: DEFAULT_CHUNK_AUTO_VERSION, headerBytes: FILE_MANIFEST_HEADER_BYTES,
  fieldHeaderBytes: FILE_TLV_HEADER_BYTES, flags: FILE_MANIFEST_FLAGS,
  fieldTypes: FILE_MANIFEST_FIELDS } = FILE_PROTOCOL;
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
  getConfiguredVersion: () => getConfiguredChunkVersion(),
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
  syncChunkVersionControls: () => syncChunkVersionControls(),
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
  onFormatFallback: () => syncChoiceButtons(),
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

const styleSetup = createStyleSetup({
  elements: { pixelArtPalette, pixelArtColor, pixelArtClear, pixelArtGrid, pixelArtSizeInput,
    pixelArtSizeValue, moduleShape, moduleCustomControls, moduleRounding, moduleRoundingValue,
    moduleInset, moduleInsetValue, moduleRotation, moduleRotationValue, eyeShape, eyeCustomControls,
    eyeOuterRounding, eyeOuterRoundingValue, eyeCenterRounding, eyeCenterRoundingValue,
    eyeCustomColorsEnabled, eyeColorControls, gradientType, centerArtMode, centerArtControls,
    centerLogoControls, centerEmojiControls, centerPixelControls, centerArtSize, centerArtSizeValue,
    centerArtBackgroundLabel, centerEmoji, emojiOptions, colorDark, colorLight,
    colorDarkTransparency, colorDarkTransparencyValue, colorLightTransparency,
    colorLightTransparencyValue, gradientControls, gradientAngleControls, gradientAngle,
    gradientAngleValue, colorGradientEnd, colorGradientEndTransparency,
    colorGradientEndTransparencyValue, imageFillControls, imageFillClear, imageFillInput,
    centerLogoInput, centerLogoClear },
  render: () => renderQr(),
  colorWithTransparency,
});
const pixelArtEditor = styleSetup.pixelEditor;
const syncModuleShapeControls = styleSetup.modules.sync;
const getCurrentModuleShapeOptions = styleSetup.modules.getOptions;
const syncEyeShapeControls = styleSetup.eyes.sync;
const getCurrentEyeShapeOptions = styleSetup.eyes.getOptions;
const artworkControls = styleSetup.artwork;
const syncCenterArtworkControls = artworkControls.sync;
const syncEmojiSelection = artworkControls.syncEmoji;

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

const syncDownloadControls = createDownloadControls({
  elements: { format: downloadFormat, qualityControls: downloadQualityControls,
    quality: downloadQuality, qualityValue: downloadQualityValue, zip: downloadZip,
    allPdf: downloadAllPdf, animationTab: downloadAnimationTab, subtabBar: downloadSubtabBar,
    actionGroups: downloadActions },
  getFrameCount: () => getDownloadFrameCount(),
  activateImageTab: () => activateDownloadSubtab('image'),
  syncAnimation: () => syncAnimationDurationSummary(),
});

function isTransferCompressionEnabled() {
  return fileIncludeManifest.checked && fileCompressTransfer.checked;
}

const fileSettings = createFileSettings({
  elements: { chunkVersion: fileChunkVersion, chunkVersionAuto: fileChunkVersionAuto,
    chunkVersionValue: fileChunkVersionValue, chunkIndex: fileChunkIndex,
    chunkIndexValue: fileChunkIndexValue, versionAuto, qrVersion, format: qrFormat },
  cache: fileCache,
  capacity: fileCapacityCalculator,
  getMode: getSelectedFileEncodingMode,
  cancelRender: () => cancelRenderRequest(),
  render: () => renderQr(),
  syncCapacity: syncFileCapacityHint,
  defaultVersion: DEFAULT_CHUNK_AUTO_VERSION,
});
const getConfiguredChunkVersion = fileSettings.getVersion;
const syncFileChunkLabel = fileSettings.syncChunkLabel;
const syncChunkVersionControls = fileSettings.syncVersion;
const resetTransferDerivedState = fileSettings.resetDerived;
const resetCachedFileState = fileSettings.resetCache;
const scheduleChunkSettingsRefresh = fileSettings.schedule;

function syncSmsLengthHint() {
  smsLengthHint.textContent = `${smsBody.value.length} / ${SMS_MAX_LENGTH}`;
}

const setFormatVisibility = createFormatVisibility({
  elements: { format: qrFormat, fieldsets: formatFieldsets, bulkEnabled,
    secretToggle: payloadRevealToggle },
  syncBulk: syncBulkControls,
  syncFile: syncFileModeVisibility,
  syncEvent: () => syncCalendarEventControls(),
});

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

const contentSections = createContentSections({
  elements: { format: qrFormat, eventTitle, eventAllDay, eventStartDate, eventStartTime,
    eventEndDate, eventEndTime, eventLocation, eventDescription, eventUrl, eventTimeFields,
    geoLatitude, geoLongitude, geoQuery, geoMapElement, phoneFormatButtons, phoneNumber,
    smsNumber, vcardPhone, numberStart, numberEnd, numberStep, numberPrefix, numberSuffix,
    numberSequenceIndex, numberSequenceValue, wifiSsid, wifiPassword, wifiEncryption,
    wifiHidden, payloadRevealSecrets, emailTo, vcardEmail, textInput, smsBody, emailBody,
    emailSubject, vcardName, vcardOrg, vcardTitle, vcardUrl },
  runtime: { render: () => renderQr(), syncChoices: () => syncChoiceButtons(),
    syncSmsLength: () => syncSmsLengthHint(), syncEmailLength: () => syncEmailBodyLengthHint() },
  limits: { numberFrames: NUMBER_SERIES_MAX_FRAMES },
  alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
  validatePrintableText,
});
const eventSection = contentSections.event;
const initializeCalendarEventDefaults = eventSection.initialize;
const syncCalendarEventControls = eventSection.sync;
const buildCalendarEventPayload = eventSection.buildPayload;
const geoSection = contentSections.geo;
const buildGeoPayload = geoSection.buildPayload;
const updateGeoMap = geoSection.update;
const phoneSection = contentSections.phone;
const numberSection = contentSections.number;
const getNumberSequenceInfo = numberSection.getSequenceInfo;
const getNumberPayload = numberSection.getPayload;
const syncNumberSequenceControls = numberSection.sync;

const downloadSetup = createDownloadSetup({
  elements: { format: qrFormat, bulkRowIndex, fileChunkIndex, numberSequenceIndex,
    navigation: chunkPreviewNav, navigationStatus: chunkPreviewStatus,
    previous: chunkPreviewPrev, next: chunkPreviewNext, animationTimingMode,
    animationMinutes, animationSeconds, animationMilliseconds,
    animationSummary: animationDurationSummary, animationMp4: downloadAnimationMp4,
    canvas, downloadFormat, downloadQuality, downloadStatus, downloadCurrent,
    downloadCurrentPdf, downloadZip, downloadAllPdf, downloadGif: downloadAnimatedGif },
  bulk: { isMode: isBulkMode, getRowCount: getBulkRowCount, syncStatus: syncBulkStatus },
  file: { getMode: getSelectedFileEncodingMode, syncChunkLabel: syncFileChunkLabel },
  number: { getInfo: getNumberSequenceInfo, sync: syncNumberSequenceControls },
  runtime: { syncControls: () => syncDownloadControls(), render: () => renderQr() },
  maxNumberFrames: NUMBER_SERIES_MAX_FRAMES,
  getPrintWidth: getPrintWidthInches,
});
const frameNavigation = downloadSetup.frames;
const getDownloadFrameCount = frameNavigation.getFrameCount;
const getCurrentFrameIndex = frameNavigation.getCurrentFrame;
const setCurrentFrameIndex = frameNavigation.setCurrentFrame;
const syncChunkPreviewNavigation = frameNavigation.sync;
const animationSection = downloadSetup.animation;
const syncAnimationDurationSummary = animationSection.sync;

const wifiSection = contentSections.wifi;
const syncWifiSecurityState = wifiSection.sync;
const buildWifiPayload = wifiSection.buildPayload;
const maskWifiPayload = wifiSection.maskPayload;

const sharedFieldsSection = contentSections.shared;
const buildEmailPayload = sharedFieldsSection.buildEmailPayload;
const buildEmailPayloadWithBody = sharedFieldsSection.buildEmailPayloadWithBody;

const colorSection = styleSetup.colors;
const formatColorTransparency = colorSection.formatTransparency;
const syncGradientControls = colorSection.sync;
const getCurrentGradientOptions = colorSection.getGradientOptions;
const applyRecommendedImageContrast = colorSection.applyRecommendedImageContrast;
const imageFillController = styleSetup.imageFill;
const centerLogoController = styleSetup.centerLogo;

const vcardSection = contentSections.vcard;
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

const navigation = createNavigation({
  elements: { tabs: tabButtons, tabPanels, debugTabs: debugSubtabButtons,
    debugPanels: debugSubtabPanels, styleTabs: styleSubtabButtons, stylePanels: styleSubtabPanels,
    downloadTabs: downloadSubtabButtons, downloadPanels: downloadSubtabPanels,
    contentTabs: contentSubtabButtons, contentPanels: contentSubtabPanels, choices: choiceButtons },
  format: qrFormat,
  render: () => renderQr(),
  updateMap: updateGeoMap,
  setActiveTab: (name) => { activeTabName = name; },
  setActiveDebugSubtab: (name) => { activeDebugSubtab = name; },
});
const activateTab = navigation.activateTab;
const activateDebugSubtab = navigation.activateDebug;
const activateStyleSubtab = navigation.activateStyle;
const activateDownloadSubtab = navigation.activateDownload;
const activateContentSubtab = navigation.activateContent;
const syncChoiceButtons = navigation.syncChoices;

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
