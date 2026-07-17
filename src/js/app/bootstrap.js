import { colorWithTransparency, getColorAlpha, getContrastingHex, hexToRgba } from './colors.js';
import { parseBoolean as parseBulkBoolean } from './csv.js';
import { normalizePhoneNumber } from './phone.js';
import { getSupportedMp4MimeType } from './mp4.js';
import {
  getWebsiteValidationState,
  validateCalendarText,
  validateEmailValue,
  validateGeoLabel,
  validatePrintableText,
  validateTelephoneValue,
  validateVCardTextValue,
} from './validation.js';
import {
  drawCenteredFrameMessage,
  drawFrameMessage,
  fitFrameMessage,
} from './frame-text.js';
import {
  getAlignmentPatternCenters,
  getFinderPatternPart,
  getModuleCategory,
  isAlignmentRegion,
  isDarkModuleRegion,
  isFinderPattern,
  isFinderRegion,
  isFormatRegion,
  isTimingRegion,
  isVersionRegion,
} from './qr-regions.js';
import { createContentSubtabs } from './ui/content/subtabs.js';
import { createContentPayload, createFilePayloadPreview } from './ui/content/payload.js';
import { createFormatValidator } from './ui/content/validation.js';
import { createBulkImportSection } from './ui/content/bulk/section.js';
import { serializeBulkRow } from './ui/content/bulk/payload.js';
import { validateBulkImport } from './ui/content/bulk/validation.js';
import { createEventSection } from './ui/content/event/section.js';
import {
  arrayBufferToBase64,
  base64UrlToBase64,
  createCompactFileId,
  encodeStreamPosition,
  getCompactFileExtension,
  getFileManifestFlag,
} from './ui/content/file/protocol.js';
import { createFileManifestController } from './ui/content/file/manifest.js';
import { createFileCapacityCalculator } from './ui/content/file/capacity.js';
import { createFileCache } from './ui/content/file/cache.js';
import { createFilePayloadBuilder } from './ui/content/file/payload.js';
import { createFileSection } from './ui/content/file/section.js';
import { createFrameSection } from './ui/content/frame/section.js';
import { createGeoSection, parseCoordinate } from './ui/content/geo/section.js';
import { createNumberSection } from './ui/content/number/section.js';
import { createPhoneSection } from './ui/content/phone/section.js';
import { createSharedFieldsSection } from './ui/content/shared-fields.js';
import { createVCardSection } from './ui/content/vcard/section.js';
import { createWifiSection, escapeWifiValue } from './ui/content/wifi/section.js';
import { createDebugSubtabs } from './ui/debug/subtabs.js';
import { createMaskSelector } from './ui/debug/mask-selector.js';
import { createEncodingDiagnostics } from './ui/debug/encoding.js';
import { createDebugStyles } from './ui/debug/styles.js';
import {
  drawCodewordOutlines,
  drawHighlightedBoundaries,
  getActiveOutlineGroups,
} from './ui/debug/boundaries.js';
import {
  buildDebugOverlayModel,
  getDebugCategory,
  moduleIsDark,
  moduleIsDarkForPreview,
} from './ui/debug/model.js';
import { drawCodewordPaths, drawStreamFieldStarts } from './ui/debug/paths.js';
import { createOutlineSelector } from './ui/debug/outline.js';
import { createDownloadSubtabs } from './ui/download/subtabs.js';
import { createAnimationSection } from './ui/download/animation/section.js';
import { createDownloadActions } from './ui/download/actions.js';
import { createFrameNavigation } from './ui/download/frames.js';
import { initializeDialogs } from './ui/dialogs.js';
import { createPrimaryTabs } from './ui/navigation.js';
import { createPreviewViewport } from './ui/preview/viewport.js';
import { createStyleSubtabs } from './ui/style/subtabs.js';
import { createColorSection } from './ui/style/colors/section.js';
import { createPixelArtEditor } from './ui/style/art/pixel-editor.js';
import { drawCenterArtwork } from './ui/style/art/drawing.js';
import { createImageInputController } from './ui/style/art/image-input.js';
import {
  createQrImageLayer,
  createQrModuleFill,
  drawFinderEyes,
  drawQrModule,
} from './ui/style/drawing/shapes.js';
import { createEyeShapeSection } from './ui/style/eyes/section.js';
import { createModuleShapeSection } from './ui/style/modules/section.js';
import qrEncoder from '../qr/index.js';

const form = document.getElementById('qr-form');
const canvas = document.getElementById('qr-canvas');
const qrPreviewViewport = document.getElementById('qr-preview-viewport');
const previewViewControls = document.getElementById('preview-view-controls');
const previewViewFit = document.getElementById('preview-view-fit');
const previewViewActual = document.getElementById('preview-view-actual');
const chunkPreviewNav = document.getElementById('chunk-preview-nav');
const chunkPreviewPrev = document.getElementById('chunk-preview-prev');
const chunkPreviewNext = document.getElementById('chunk-preview-next');
const chunkPreviewStatus = document.getElementById('chunk-preview-status');

const optionsPreview = document.getElementById('options-preview');
const encodedPreview = document.getElementById('encoded-preview');
const payloadRevealSecrets = document.getElementById('payload-reveal-secrets');
const payloadRevealToggle = document.getElementById('payload-reveal-toggle');
const qrFormat = document.getElementById('qr-format');
const bulkEnabled = document.getElementById('bulk-enabled');
const bulkFields = document.getElementById('bulk-fields');
const bulkExpectedFields = document.getElementById('bulk-expected-fields');
const bulkRequiredFields = document.getElementById('bulk-required-fields');
const bulkFileInput = document.getElementById('bulk-file-input');
const bulkRowIndex = document.getElementById('bulk-row-index');
const bulkStatus = document.getElementById('bulk-status');
const bulkClear = document.getElementById('bulk-clear');
const choiceButtons = document.querySelectorAll('.choice-button');
const formatFieldsets = document.querySelectorAll('.format-fields');
const qrVersion = document.getElementById('qr-version');
const qrVersionValue = document.getElementById('qr-version-value');
const versionAuto = document.getElementById('version-auto');
const maskPattern = document.getElementById('mask-pattern');
const maskGrid = document.getElementById('mask-grid');
const qrWidth = document.getElementById('qr-width');
const qrWidthValue = document.getElementById('qr-width-value');
const qrWidthAuto = document.getElementById('qr-width-auto');
const qrScale = document.getElementById('qr-scale');
const qrScaleValue = document.getElementById('qr-scale-value');
const qrMargin = document.getElementById('qr-margin');
const qrMarginValue = document.getElementById('qr-margin-value');
const colorDark = document.getElementById('color-dark');
const colorLight = document.getElementById('color-light');
const colorDarkTransparency = document.getElementById('color-dark-transparency');
const colorDarkTransparencyValue = document.getElementById('color-dark-transparency-value');
const colorLightTransparency = document.getElementById('color-light-transparency');
const colorLightTransparencyValue = document.getElementById('color-light-transparency-value');
const gradientType = document.getElementById('gradient-type');
const gradientControls = document.getElementById('gradient-controls');
const gradientAngleControls = document.getElementById('gradient-angle-controls');
const gradientAngle = document.getElementById('gradient-angle');
const gradientAngleValue = document.getElementById('gradient-angle-value');
const colorGradientEnd = document.getElementById('color-gradient-end');
const colorGradientEndTransparency = document.getElementById('color-gradient-end-transparency');
const colorGradientEndTransparencyValue = document.getElementById('color-gradient-end-transparency-value');
const imageFillControls = document.getElementById('image-fill-controls');
const imageFillInput = document.getElementById('image-fill-input');
const imageFillRecommended = document.getElementById('image-fill-recommended');
const imageFillClear = document.getElementById('image-fill-clear');
const frameMessageMode = document.getElementById('frame-message-mode');
const customFrameMessageField = document.getElementById('custom-frame-message-field');
const customFrameMessage = document.getElementById('custom-frame-message');
const frameMessageCenter = document.getElementById('frame-message-center');
const frameMessageCenterArt = document.getElementById('frame-message-center-art');
const frameFont = document.getElementById('frame-font');
const frameMessageColor = document.getElementById('frame-message-color');
const frameLineHeight = document.getElementById('frame-line-height');
const frameLineHeightValue = document.getElementById('frame-line-height-value');
const moduleShape = document.getElementById('module-shape');
const moduleCustomControls = document.getElementById('module-custom-controls');
const moduleRounding = document.getElementById('module-rounding');
const moduleRoundingValue = document.getElementById('module-rounding-value');
const moduleInset = document.getElementById('module-inset');
const moduleInsetValue = document.getElementById('module-inset-value');
const moduleRotation = document.getElementById('module-rotation');
const moduleRotationValue = document.getElementById('module-rotation-value');
const eyeShape = document.getElementById('eye-shape');
const eyeCustomControls = document.getElementById('eye-custom-controls');
const eyeOuterRounding = document.getElementById('eye-outer-rounding');
const eyeOuterRoundingValue = document.getElementById('eye-outer-rounding-value');
const eyeCenterRounding = document.getElementById('eye-center-rounding');
const eyeCenterRoundingValue = document.getElementById('eye-center-rounding-value');
const eyeCustomColorsEnabled = document.getElementById('eye-custom-colors-enabled');
const eyeColorControls = document.getElementById('eye-color-controls');
const eyeOuterColor = document.getElementById('eye-outer-color');
const eyeCenterColor = document.getElementById('eye-center-color');
const centerArtMode = document.getElementById('center-art-mode');
const centerArtControls = document.getElementById('center-art-controls');
const centerArtSize = document.getElementById('center-art-size');
const centerArtSizeValue = document.getElementById('center-art-size-value');
const centerArtBackground = document.getElementById('center-art-background');
const centerArtBackgroundLabel = document.getElementById('center-art-background-label');
const centerLogoControls = document.getElementById('center-logo-controls');
const centerLogoInput = document.getElementById('center-logo-input');
const centerLogoClear = document.getElementById('center-logo-clear');
const centerEmojiControls = document.getElementById('center-emoji-controls');
const centerEmoji = document.getElementById('center-emoji');
const emojiOptions = document.querySelectorAll('.emoji-option');
const centerPixelControls = document.getElementById('center-pixel-controls');
const pixelArtColor = document.getElementById('pixel-art-color');
const pixelArtClear = document.getElementById('pixel-art-clear');
const pixelArtPalette = document.getElementById('pixel-art-palette');
const pixelArtMatchModuleShape = document.getElementById('pixel-art-match-module-shape');
const pixelArtSizeInput = document.getElementById('pixel-art-size');
const pixelArtSizeValue = document.getElementById('pixel-art-size-value');
const pixelArtGrid = document.getElementById('pixel-art-grid');
const downloadFormat = document.getElementById('download-format');
const downloadQualityControls = document.getElementById('download-quality-controls');
const downloadQuality = document.getElementById('download-quality');
const downloadQualityValue = document.getElementById('download-quality-value');
const printWidthAuto = document.getElementById('print-width-auto');
const printWidth = document.getElementById('print-width');
const printWidthValue = document.getElementById('print-width-value');
const downloadCurrent = document.getElementById('download-current');
const downloadCurrentPdf = document.getElementById('download-current-pdf');
const downloadZip = document.getElementById('download-zip');
const downloadAllPdf = document.getElementById('download-all-pdf');
const downloadActions = document.querySelectorAll('.download-actions');
const downloadStatus = document.getElementById('download-status');
const optionsJson = document.getElementById('options-json');
const errorCorrection = document.getElementById('error-correction');
const errorCorrectionLabel = document.getElementById('error-correction-label');
const errorCorrectionValue = document.getElementById('error-correction-value');
const errorCorrectionHelp = document.getElementById('error-correction-help');
const modeAuto = document.getElementById('mode-auto');
const encodingMode = document.getElementById('encoding-mode');
const encodingModeButtons = document.querySelectorAll('.encoding-mode-button');
const detectedMode = document.getElementById('detected-mode');
const segmentSummary = document.getElementById('segment-summary');
const versionSummary = document.getElementById('version-summary');
const capacitySummary = document.getElementById('capacity-summary');
const unusedSummary = document.getElementById('unused-summary');
const modeValidation = document.getElementById('mode-validation');
const formatValidation = document.getElementById('format-validation');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const debugSubtabButtons = document.querySelectorAll('[data-tab-panel="debug"] .subtab-button');
const debugSubtabPanels = document.querySelectorAll('[data-tab-panel="debug"] .subtab-panel');
const styleSubtabButtons = document.querySelectorAll('.style-subtab-button');
const styleSubtabPanels = document.querySelectorAll('.style-subtab-panel');
const downloadSubtabButtons = document.querySelectorAll('.download-subtab-button');
const downloadSubtabPanels = document.querySelectorAll('.download-subtab-panel');
const downloadSubtabBar = document.querySelector('.download-subtab-bar');
const downloadAnimationTab = document.getElementById('download-animation-tab');
const animationTimingMode = document.getElementById('animation-timing-mode');
const animationMinutes = document.getElementById('animation-minutes');
const animationSeconds = document.getElementById('animation-seconds');
const animationMilliseconds = document.getElementById('animation-milliseconds');
const animationDurationSummary = document.getElementById('animation-duration-summary');
const downloadAnimatedGif = document.getElementById('download-animated-gif');
const downloadAnimationMp4 = document.getElementById('download-animation-mp4');
const contentSubtabButtons = document.querySelectorAll('.content-subtab-button');
const contentSubtabPanels = document.querySelectorAll('.content-subtab-panel');
const debugEnabled = document.getElementById('debug-enabled');
const debugUnmask = document.getElementById('debug-unmask');
const debugOutlineModeButtons = document.querySelectorAll('.outline-mode-button');

const urlInput = document.getElementById('url-input');
const textInput = document.getElementById('text-input');
const numberStart = document.getElementById('number-start');
const numberEnd = document.getElementById('number-end');
const numberStep = document.getElementById('number-step');
const numberPrefix = document.getElementById('number-prefix');
const numberSuffix = document.getElementById('number-suffix');
const numberSequenceIndex = document.getElementById('number-sequence-index');
const numberSequenceValue = document.getElementById('number-sequence-value');
const wifiSsid = document.getElementById('wifi-ssid');
const wifiPassword = document.getElementById('wifi-password');
const wifiEncryption = document.getElementById('wifi-encryption');
const wifiHidden = document.getElementById('wifi-hidden');
const emailTo = document.getElementById('email-to');
const emailSubject = document.getElementById('email-subject');
const emailBody = document.getElementById('email-body');
const emailBodyLengthHint = document.getElementById('email-body-length-hint');
const phoneNumber = document.getElementById('phone-number');
const phoneFormatButtons = document.querySelectorAll('.phone-format-button');
const smsNumber = document.getElementById('sms-number');
const smsBody = document.getElementById('sms-body');
const smsLengthHint = document.getElementById('sms-length-hint');
const eventTitle = document.getElementById('event-title');
const eventAllDay = document.getElementById('event-all-day');
const eventStartDate = document.getElementById('event-start-date');
const eventStartTime = document.getElementById('event-start-time');
const eventEndDate = document.getElementById('event-end-date');
const eventEndTime = document.getElementById('event-end-time');
const eventLocation = document.getElementById('event-location');
const eventDescription = document.getElementById('event-description');
const eventUrl = document.getElementById('event-url');
const eventTimeFields = document.querySelectorAll('.event-time-field');
const geoLatitude = document.getElementById('geo-latitude');
const geoLongitude = document.getElementById('geo-longitude');
const geoQuery = document.getElementById('geo-query');
const geoMapElement = document.getElementById('geo-map');
const vcardName = document.getElementById('vcard-name');
const vcardOrg = document.getElementById('vcard-org');
const vcardTitle = document.getElementById('vcard-title');
const vcardPhone = document.getElementById('vcard-phone');
const vcardEmail = document.getElementById('vcard-email');
const vcardUrl = document.getElementById('vcard-url');
const fileInput = document.getElementById('file-input');
const fileEncodingMode = document.getElementById('file-encoding-mode');
const fileChunkControls = document.getElementById('file-chunk-controls');
const fileChunkVersionAuto = document.getElementById('file-chunk-version-auto');
const fileChunkVersion = document.getElementById('file-chunk-version');
const fileChunkVersionValue = document.getElementById('file-chunk-version-value');
const fileIncludeManifest = document.getElementById('file-include-manifest');
const fileCompressTransfer = document.getElementById('file-compress-transfer');
const fileCustomMetadata = document.getElementById('file-custom-metadata');
const fileChunkIndex = document.getElementById('file-chunk-index');
const fileChunkIndexValue = document.getElementById('file-chunk-index-value');
const fileCapacityHint = document.getElementById('file-capacity-hint');
const clearFileButton = document.getElementById('clear-file-button');

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

let renderRequest = 0;
let chunkSettingsRefreshTimer = 0;
let chunkSettingsRefreshRequest = 0;
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

function getAutomaticPrintWidthInches(sourceCanvas = canvas) {
  const pixelWidth = sourceCanvas.width || renderedQrWidth || Number.parseInt(qrWidth.value, 10) || 320;
  const moduleScale = renderedQrModuleScale || Number.parseInt(qrScale.value, 10) || 4;
  const totalModules = Math.max(1, Math.round(pixelWidth / moduleScale));
  return Math.min(7, Math.max(0.5, pixelWidth / PRINT_PIXELS_PER_INCH, totalModules * MIN_PRINT_MODULE_INCHES));
}

function getPrintWidthInches(sourceCanvas = canvas) {
  return printWidthAuto.checked
    ? getAutomaticPrintWidthInches(sourceCanvas)
    : Math.min(7, Math.max(0.5, Number.parseFloat(printWidth.value) || 1.65));
}

function syncPrintWidthControls() {
  const automaticWidth = getAutomaticPrintWidthInches();
  if (printWidthAuto.checked) {
    printWidth.value = automaticWidth.toFixed(2);
  }
  printWidth.disabled = printWidthAuto.checked;
  const selectedWidth = getPrintWidthInches();
  const totalModules = Math.max(1, Math.round((renderedQrWidth || canvas.width || 320) / (renderedQrModuleScale || 4)));
  const moduleWidth = selectedWidth / totalModules;
  printWidthValue.textContent = `${selectedWidth.toFixed(2)} in${printWidthAuto.checked ? ' auto' : ''} - ${(moduleWidth * 25.4).toFixed(2)} mm/module`;
}

function formatWidthLabel() {
  const minimumWidth = Number.parseInt(qrWidth.min, 10) || 1;
  if (qrWidthAuto.checked) {
    const width = renderedQrWidth ?? minimumWidth;
    qrWidthValue.textContent = `${width} px · ${renderedQrModuleScale ?? qrScale.value} px/module · ${(width / PRINT_PIXELS_PER_INCH).toFixed(2)} in at ${PRINT_PIXELS_PER_INCH} ppi`;
    return;
  }

  const targetWidth = Number.parseInt(qrWidth.value, 10) || minimumWidth;
  qrWidthValue.textContent = `${targetWidth} px · ${renderedQrModuleScale ?? qrScale.value} px/module · ${(targetWidth / PRINT_PIXELS_PER_INCH).toFixed(2)} in at ${PRINT_PIXELS_PER_INCH} ppi`;
}

function formatScaleLabel() {
  qrScaleValue.textContent = qrScale.value;
}

function formatMarginLabel() {
  qrMarginValue.textContent = qrMargin.value;
}

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
  formatWidthLabel();
  formatScaleLabel();
  formatMarginLabel();
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
  renderRequest += 1;

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

function buildOptions() {
  const selectedErrorLevel = getSelectedErrorLevel();
  const baseOptions = {
    errorCorrectionLevel: selectedErrorLevel.value,
    margin: readInteger(qrMargin) ?? 1,
    scale: readInteger(qrScale) ?? 4,
    color: {
      dark: colorWithTransparency(colorDark.value.trim() || '#111827', colorDarkTransparency),
      light: colorWithTransparency(colorLight.value.trim() || '#ffffff', colorLightTransparency),
    },
  };

  if (!qrWidthAuto.checked) {
    baseOptions.width = readInteger(qrWidth) ?? 320;
  }

  const isChunkedFile = qrFormat.value === 'file' && getSelectedFileEncodingMode() === 'chunked';
  const version = isChunkedFile ? getConfiguredChunkVersion() : versionAuto.checked ? undefined : readInteger(qrVersion);
  if (version !== undefined) {
    baseOptions.version = version;
  }

  const mask = readInteger(maskPattern);
  if (mask !== undefined) {
    baseOptions.maskPattern = mask;
  }

  let extraOptions = {};
  const rawOptions = optionsJson.value.trim();
  if (rawOptions) {
    extraOptions = JSON.parse(rawOptions);
  }

  const mergedOptions = {
    ...baseOptions,
    ...extraOptions,
    color: {
      ...baseOptions.color,
      ...(extraOptions.color || {}),
    },
  };
  if (isChunkedFile) {
    mergedOptions.version = getConfiguredChunkVersion();
  }
  return mergedOptions;
}

function buildPayload(encodedText) {
  const isChunkedFile = qrFormat.value === 'file' && getSelectedFileEncodingMode() === 'chunked';
  if (isChunkedFile && encodedText.trim()) {
    // FILE frames contain arbitrary base64url, so byte mode keeps capacity deterministic.
    return [{ data: encodedText, mode: 'byte' }];
  }

  if (qrFormat.value === 'number' && modeAuto.checked && encodedText.trim()) {
    const mode = /^\d+$/.test(encodedText)
      ? 'numeric'
      : [...encodedText].every((character) => QR_ALPHANUMERIC_CHARACTERS.includes(character))
        ? 'alphanumeric'
        : 'byte';
    return [{ data: encodedText, mode }];
  }

  const mode = getCurrentEncodingMode();
  if (!mode || !encodedText.trim()) {
    return encodedText;
  }

  return [{ data: encodedText, mode }];
}

function createQrDefinition(payload, options) {
  if (typeof qrEncoder?.create !== 'function') {
    throw new Error('The first-party QR encoder did not load.');
  }
  return qrEncoder.create(payload, options);
}

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

function decodeDownloadPayloadFromLocation() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  if (params.get('download') !== '1') {
    return null;
  }

  const name = params.get('name') || 'download.bin';
  const mimeType = params.get('type') || 'application/octet-stream';
  const data = params.get('data') || '';
  if (!data) {
    return null;
  }

  return { name, mimeType, data };
}

function triggerDownloadFromLocationPayload() {
  const payload = decodeDownloadPayloadFromLocation();
  if (!payload) {
    return;
  }

  try {
    const binary = atob(base64UrlToBase64(payload.data));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const blob = new Blob([bytes], { type: payload.mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = payload.name;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } catch (error) {
    console.error('Unable to restore downloadable file from the QR URL.', error);
  }
}

function updateEncodedPreview(encodedText) {
  encodedPreview.textContent = getEncodedPreviewText(encodedText);
}

function getEmailBodyCapacityInfo() {
  const currentLength = emailBody.value.length;

  let options;
  try {
    options = buildOptions();
  } catch (error) {
    return { current: currentLength, max: 0 };
  }

  const canEncodeLength = (length) => {
    const testPayload = buildEmailPayloadWithBody('A'.repeat(length));
    try {
      const payload = buildPayload(testPayload);
      qrEncoder.create(payload, options);
      return true;
    } catch (error) {
      return false;
    }
  };

  if (!canEncodeLength(0)) {
    return { current: currentLength, max: 0 };
  }

  let low = 0;
  let high = Math.max(currentLength, 32);

  while (high < 8192 && canEncodeLength(high)) {
    low = high;
    high *= 2;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (canEncodeLength(middle)) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return { current: currentLength, max: low };
}

function syncEmailBodyLengthHint() {
  const { current, max } = getEmailBodyCapacityInfo();
  emailBodyLengthHint.textContent = `${current} / ${max}`;
}

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



function drawQr(qrDefinition, options) {
  const marginModules = options.margin ?? 4;
  const moduleCount = qrDefinition.modules.size;
  const totalModules = moduleCount + marginModules * 2;
  const minimumModuleScale = Math.max(1, options.scale ?? 4);
  const minimumCanvasSize = totalModules * minimumModuleScale;
  const maximumModuleScale = Math.max(minimumModuleScale, Math.floor(MAX_QR_TARGET_WIDTH / totalModules));
  qrWidth.min = String(minimumCanvasSize);
  qrWidth.max = String(totalModules * maximumModuleScale);
  qrWidth.step = String(totalModules);
  const requestedCanvasSize = typeof options.width === 'number' ? options.width : minimumCanvasSize;
  const renderedModuleScale = Math.min(
    maximumModuleScale,
    Math.max(minimumModuleScale, Math.round(requestedCanvasSize / totalModules))
  );
  const canvasSize = totalModules * renderedModuleScale;
  if (!qrWidthAuto.checked) {
    qrWidth.value = String(canvasSize);
  }
  renderedQrWidth = canvasSize;
  renderedQrModuleScale = renderedModuleScale;
  formatWidthLabel();
  const cornerRadius = Math.max(0, Math.min(16, ((canvasSize - 128) / 192) * 16));
  canvas.style.setProperty('--qr-corner-radius', `${cornerRadius.toFixed(2)}px`);
  const cellSize = canvasSize / totalModules;
  const context = canvas.getContext('2d');
  const frameMessageText = getCurrentFrameMessage();
  const frameMessageIsCentered = frameMessageCenter.checked;
  const captionLineHeight = Number.parseInt(frameLineHeight.value, 10) || 18;
  const captionPadding = Math.max(7, Math.min(14, canvasSize * 0.035));
  const qrDrawSize = moduleCount * cellSize;
  const frameMessageMaximumWidth = frameMessageIsCentered
    ? Math.max(20, qrDrawSize * 0.56)
    : Math.max(20, canvasSize - captionPadding * 2);
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const frameMessageLayout = frameMessageText
    ? fitFrameMessage(context, frameMessageText, frameMessageMaximumWidth, captionLineHeight, getFrameFont)
    : { font: getFrameFont(captionLineHeight), lines: [] };
  const frameMessageLines = frameMessageLayout.lines;
  const captionHeight = frameMessageLines.length && !frameMessageIsCentered
    ? Math.ceil(frameMessageLines.length * captionLineHeight + captionPadding * 2)
    : 0;
  const debugActive = isDebugOverlayActive();
  const debugModel = debugActive ? buildDebugOverlayModel(qrDefinition, options) : null;
  const moduleShapeOptions = getCurrentModuleShapeOptions();
  const eyeShapeOptions = getCurrentEyeShapeOptions();
  const customEyesActive = !debugActive && eyeShapeOptions.type !== 'default';
  const gradientOptions = getCurrentGradientOptions();
  const imageFillImage = imageFillController.getImage();
  const imageFillActive = !debugActive && gradientOptions.type === 'image' && imageFillImage;
  const customEyeColorsActive = !debugActive && !imageFillActive && eyeCustomColorsEnabled.checked;
  const lightAlpha = getColorAlpha(options.color.light);
  const gradientHasTransparency =
    (gradientOptions.type === 'linear' || gradientOptions.type === 'radial') &&
    getColorAlpha(gradientOptions.endColor) < 1;
  const hasTransparency =
    !imageFillActive && (getColorAlpha(options.color.dark) < 1 || gradientHasTransparency || lightAlpha < 1);
  const transparentLight = lightAlpha === 0;

  canvas.height = canvasSize + captionHeight;
  canvas.classList.toggle('has-transparency', hasTransparency);

  const backgroundColor = options.color.light;
  const quietColor = options.color.light;
  let imageFillLayer = null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (imageFillActive) {
    context.fillStyle = colorLight.value;
    context.fillRect(0, 0, canvas.width, canvas.height);
    imageFillLayer = createQrImageLayer(
      context,
      imageFillImage,
      marginModules * cellSize,
      moduleCount * cellSize
    );
    context.drawImage(imageFillLayer.layer, 0, 0);
    context.fillStyle = options.color.light;
    context.fillRect(
      marginModules * cellSize,
      marginModules * cellSize,
      moduleCount * cellSize,
      moduleCount * cellSize
    );
  } else if (!transparentLight) {
    context.fillStyle = quietColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = backgroundColor;
    context.fillRect(
      marginModules * cellSize,
      marginModules * cellSize,
      moduleCount * cellSize,
      moduleCount * cellSize
    );
  }

  const moduleFillStyle = createQrModuleFill(
    context,
    options.color.dark,
    gradientOptions,
    marginModules,
    moduleCount,
    cellSize
  );
  const eyeOuterFillStyle = customEyeColorsActive ? eyeOuterColor.value : moduleFillStyle;
  const eyeCenterFillStyle = customEyeColorsActive ? eyeCenterColor.value : moduleFillStyle;

  if (debugActive) {
    for (let row = 0; row < moduleCount; row += 1) {
      for (let column = 0; column < moduleCount; column += 1) {
        const category = getDebugCategory(row, column, qrDefinition, debugModel, 'overlay');
        context.fillStyle = hexToRgba(debugColors[category].value, 0.5);
        context.fillRect(
          (column + marginModules) * cellSize,
          (row + marginModules) * cellSize,
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!moduleIsDarkForPreview(qrDefinition, row, column, debugActive, debugUnmask.checked)) {
        continue;
      }
      if (customEyesActive && isFinderPattern(moduleCount, row, column)) {
        continue;
      }

      const category = debugActive
        ? getDebugCategory(row, column, qrDefinition, debugModel, 'overlay')
        : getModuleCategory(qrDefinition, row, column);
      let fillStyle = debugActive ? hexToRgba(debugColors[category].value, 1) : moduleFillStyle;
      if (customEyeColorsActive) {
        const eyePart = getFinderPatternPart(moduleCount, row, column);
        if (eyePart === 'outer') {
          fillStyle = eyeOuterFillStyle;
        } else if (eyePart === 'center') {
          fillStyle = eyeCenterFillStyle;
        }
      }
      if (imageFillActive) {
        context.fillStyle = imageFillLayer.pattern;
        drawQrModule(
          context,
          (column + marginModules) * cellSize,
          (row + marginModules) * cellSize,
          cellSize,
          moduleShapeOptions
        );
      }
      context.fillStyle = fillStyle;
      drawQrModule(
        context,
        (column + marginModules) * cellSize,
        (row + marginModules) * cellSize,
        cellSize,
        moduleShapeOptions
      );
    }
  }

  if (customEyesActive) {
    drawFinderEyes(
      context,
      moduleCount,
      marginModules,
      cellSize,
      eyeShapeOptions,
      eyeOuterFillStyle,
      eyeCenterFillStyle,
      options.color.light,
      transparentLight,
      imageFillActive
        ? {
            pattern: imageFillLayer.pattern,
            darkFillStyle: options.color.dark,
            lightFillStyle: options.color.light,
          }
        : null
    );
  }

  if (debugActive) {
    drawHighlightedBoundaries(context, qrDefinition, debugModel, marginModules, cellSize, debugColors);
    drawCodewordOutlines(
      context,
      debugModel,
      marginModules,
      cellSize,
      activeDebugOutlineMode,
      getCodewordStyle,
    );
    drawCodewordPaths(
      context,
      qrDefinition,
      debugModel,
      marginModules,
      cellSize,
      activeDebugOutlineMode,
      getModuleContrastColor,
    );
    drawStreamFieldStarts(
      context,
      debugModel,
      marginModules,
      cellSize,
      activeDebugOutlineMode,
      debugColors,
    );
  }

  drawCenterArtwork(context, marginModules * cellSize, moduleCount * cellSize, {
    mode: centerArtMode.value,
    logo: centerLogoController.getImage(),
    emoji: centerEmoji.value.trim(),
    pixelArt: pixelArtEditor.getState(),
    sizePercent: readInteger(centerArtSize) ?? 20,
    protectBackground: centerArtBackground.checked,
    lightColor: options.color.light,
    matchModuleShape: pixelArtMatchModuleShape.checked && moduleShape.value !== 'square',
    moduleShape: getCurrentModuleShapeOptions(),
  });

  if (frameMessageIsCentered) {
    drawCenteredFrameMessage(
      context,
      frameMessageLines,
      frameMessageLayout.font,
      captionLineHeight,
      marginModules * cellSize + qrDrawSize / 2,
      frameMessageColor.value,
      options.color.light,
      cellSize
    );
  } else {
    drawFrameMessage(
      context,
      frameMessageLines,
      canvasSize,
      captionHeight,
      frameMessageLayout.font,
      captionLineHeight,
      frameMessageColor.value
    );
  }

  schedulePreviewViewportSync();
}

function drawInvalidOverlay(message) {
  const context = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const bannerHeight = Math.max(56, height * 0.18);

  context.fillStyle = 'rgba(255, 255, 255, 0.64)';
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(153, 27, 27, 0.92)';
  context.fillRect(0, (height - bannerHeight) / 2, width, bannerHeight);

  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `800 ${Math.max(18, width * 0.07)}px "Avenir Next", "Segoe UI", sans-serif`;
  context.fillText('Invalid', width / 2, height / 2 - 8);

  if (message) {
    context.font = `600 ${Math.max(10, width * 0.027)}px "Avenir Next", "Segoe UI", sans-serif`;
    context.fillText(message.slice(0, 80), width / 2, height / 2 + 16);
  }
}

function renderInvalidPreview(previewText, options, message) {
  const safeText = previewText?.trim() ? previewText : 'Invalid preview';
  const previewOptions = options
    ? { ...options }
    : {
        errorCorrectionLevel: 'M',
        margin: 1,
        scale: 4,
        color: {
          dark: '#111827',
          light: '#ffffff',
        },
      };
  delete previewOptions.version;

  try {
    const qrDefinition = qrEncoder.create(safeText, previewOptions);
    drawQr(qrDefinition, previewOptions);
  } catch (error) {
    clearCanvas();
  }

  drawInvalidOverlay(message);
}

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

async function renderQr() {
  const requestId = ++renderRequest;
  syncOutputs();
  setFormatVisibility();
  updateGeoMap();

  let encodedText = '';
  let options;

  try {
    encodedText = await buildEncodedText();
    options = buildOptions();
  } catch (error) {
    if (requestId !== renderRequest) {
      return;
    }
    encodedPreview.textContent = error.message;
    encodedPreview.classList.add('has-error');
    renderInvalidPreview(buildEncodedPreviewTemplate(), options, error.message);
    setValidationMessage(error.message || 'Unable to build QR content.');
    console.error(error);
    return;
  }

  if (requestId !== renderRequest) {
    return;
  }

  updateEncodedPreview(encodedText);
  updateOptionsPreview(options);
  syncMaskSelection();
  renderMaskPreviews(encodedText);

  const formatValidationState = getFormatValidationState();
  if (formatValidationState.error) {
    setValidationMessage(formatValidationState.error);
    renderInvalidPreview(encodedText || buildEncodedPreviewTemplate(), options, formatValidationState.error);
    updateEncodingSummary(null, options);
    return;
  }

  const isModeValid = validateManualMode(encodedText);
  if (!encodedText.trim()) {
    const emptyMessage = 'Not valid yet: content is required.';
    setValidationMessage(emptyMessage);
    renderInvalidPreview(buildEncodedPreviewTemplate(), options, emptyMessage);
    updateEncodingSummary(null, options);
    return;
  }

  if (!isModeValid) {
    renderInvalidPreview(encodedText || buildEncodedPreviewTemplate(), options, modeValidation.textContent);
    updateEncodingSummary(null, options);
    return;
  }

  try {
    const payload = buildPayload(encodedText);
    const qrDefinition = createQrDefinition(payload, options);
    updateEncodingSummary(qrDefinition, options);
    setValidationMessage(formatValidationState.warning, [], formatValidationState.warning ? 'warning' : 'error');
    drawQr(qrDefinition, options);
    syncDownloadControls();
  } catch (error) {
    setValidationMessage(error.message || 'Unable to encode this content.');
    renderInvalidPreview(encodedText || buildEncodedPreviewTemplate(), options, error.message || 'Unable to encode this content.');
    updateEncodingSummary(null, options);
    console.error(error);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
});

form.addEventListener('input', (event) => {
  if (event.target === bulkEnabled) {
    setFormatVisibility();
    activateContentSubtab('data');
    if (bulkEnabled.checked && bulkFileInput.files?.[0]) {
      loadBulkFile();
    } else {
      renderQr();
    }
    return;
  }
  if (event.target === bulkFileInput) {
    return;
  }
  if ([animationMinutes, animationSeconds, animationMilliseconds].includes(event.target)) {
    syncAnimationDurationSummary();
    return;
  }
  if (event.target === downloadQuality) {
    syncDownloadControls();
    return;
  }
  if (event.target === fileIncludeManifest || event.target === fileCompressTransfer || event.target === fileCustomMetadata) {
    resetTransferDerivedState();
    scheduleChunkSettingsRefresh({ resetChunkIndex: true });
    return;
  }

  if (event.target === fileChunkVersionAuto) {
    // The checkbox's change handler synchronizes the shared version state.
    return;
  }

  if (event.target === fileChunkVersion) {
    fileChunkVersionValue.textContent = `V${fileChunkVersion.value}`;
    qrVersion.value = fileChunkVersion.value;
    formatVersionLabel();
    scheduleChunkSettingsRefresh({ resetChunkIndex: true });
    return;
  }

  if (event.target === fileChunkIndex) {
    return;
  }

  syncSmsLengthHint();
  syncEmailBodyLengthHint();
  syncFileCapacityHint();
  renderQr();
});

fileInput.addEventListener('change', () => {
  resetCachedFileState();
  fileChunkIndex.value = '1';
  syncFileCapacityHint();
  renderQr();
});

clearFileButton.addEventListener('click', () => {
  clearLoadedFile();
  renderQr();
});

qrFormat.addEventListener('change', () => {
  setFormatVisibility();
  syncChoiceButtons();
  syncWifiSecurityState();
  activateContentSubtab('data');
  if (isBulkMode() && bulkFileInput.files?.[0]) {
    loadBulkFile();
    return;
  }
  renderQr();
});

frameMessageCenter.addEventListener('input', () => {
  setFrameMessageCenter(frameMessageCenter.checked);
});

frameMessageCenterArt.addEventListener('input', () => {
  setFrameMessageCenter(frameMessageCenterArt.checked);
});

choiceButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const targetId = button.dataset.choiceTarget;
    const choiceValue = button.dataset.choiceValue;
    const target = document.getElementById(targetId);

    if (!target || target.value === choiceValue) {
      return;
    }

    target.value = choiceValue;
    syncChoiceButtons();
    if (target === gradientType) {
      syncGradientControls();
    }
    if (target === moduleShape) {
      syncModuleShapeControls();
    }
    if (target === eyeShape) {
      syncEyeShapeControls();
    }
    if (target === centerArtMode) {
      if (choiceValue !== 'none') {
        setFrameMessageCenter(false);
      }
      syncCenterArtworkControls();
    }
    if (target === wifiEncryption) {
      syncWifiSecurityState();
    }

    if (target === qrFormat) {
      setFormatVisibility();
      activateContentSubtab('data');
      if (isBulkMode() && bulkFileInput.files?.[0]) {
        loadBulkFile();
        return;
      }
    }

    if (target === downloadFormat) {
      syncDownloadControls();
      return;
    }

    if (target === animationTimingMode) {
      syncAnimationDurationSummary();
      return;
    }

    if (target === fileEncodingMode) {
      if (choiceValue === 'chunked' && versionAuto.checked) {
        qrVersion.value = String(DEFAULT_CHUNK_AUTO_VERSION);
      }
      syncChunkVersionControls();
      formatVersionLabel();
      scheduleChunkSettingsRefresh({ resetChunkIndex: true, delay: 0 });
      return;
    }

    renderQr();
  });
});

emojiOptions.forEach((button) => {
  button.addEventListener('click', () => {
    centerEmoji.value = button.dataset.emoji || '';
    syncEmojiSelection();
    renderQr();
  });
});

imageFillRecommended.addEventListener('click', () => {
  applyRecommendedImageContrast();
  renderQr();
});

fileChunkIndex.addEventListener('input', () => {
  invalidateChunkCapacityCache();
  syncFileCapacityHint();
  renderQr();
});

chunkPreviewPrev.addEventListener('click', () => {
  const current = getCurrentFrameIndex();
  if (current <= 1) {
    return;
  }

  setCurrentFrameIndex(current - 1);
  syncChunkPreviewNavigation();
  renderQr();
});

chunkPreviewNext.addEventListener('click', () => {
  const current = getCurrentFrameIndex();
  const total = getDownloadFrameCount();
  if (current >= total) {
    return;
  }

  setCurrentFrameIndex(current + 1);
  syncChunkPreviewNavigation();
  renderQr();
});

fileChunkVersionAuto.addEventListener('change', () => {
  versionAuto.checked = fileChunkVersionAuto.checked;
  if (fileChunkVersionAuto.checked) {
    qrVersion.value = String(DEFAULT_CHUNK_AUTO_VERSION);
  }
  formatVersionLabel();
  syncChunkVersionControls();
  scheduleChunkSettingsRefresh({ resetChunkIndex: true, delay: 0 });
});

fileChunkVersion.addEventListener('input', () => {
  qrVersion.value = fileChunkVersion.value;
  formatVersionLabel();
  syncChunkVersionControls();
  scheduleChunkSettingsRefresh({ resetChunkIndex: true });
});

versionAuto.addEventListener('change', () => {
  if (versionAuto.checked && qrFormat.value === 'file' && getSelectedFileEncodingMode() === 'chunked') {
    qrVersion.value = String(DEFAULT_CHUNK_AUTO_VERSION);
    scheduleChunkSettingsRefresh({ resetChunkIndex: true, delay: 0 });
  }
  syncChunkVersionControls();
});

qrVersion.addEventListener('input', () => {
  syncChunkVersionControls();
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
triggerDownloadFromLocationPayload();
renderQr();
dialogs.syncFromHash();
