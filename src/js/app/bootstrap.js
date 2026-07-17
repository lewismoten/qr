import { colorWithTransparency, getContrastingHex } from './colors.js';
import { ERROR_LEVELS, FILE_PROTOCOL, LIMITS, MASK_LABELS, MASK_VALUES,
  MODE_CAPACITY, MODE_LABELS, QR_ALPHANUMERIC_CHARACTERS } from './configuration.js';
import { validatePrintableText } from './validation.js';
import { createFormatVisibility } from './ui/content/format-visibility.js';
import { createContentEncodingSetup } from './ui/content/encoding-setup.js';
import { createBulkImportSection } from './ui/content/bulk/section.js';
import {
  arrayBufferToBase64,
  createCompactFileId,
} from './ui/content/file/protocol.js';
import { createFileSetup } from './ui/content/file/setup.js';
import { createContentSections } from './ui/content/setup.js';
import {
  buildDebugOverlayModel,
  getDebugCategory,
} from './ui/debug/model.js';
import { createDebugSetup } from './ui/debug/setup.js';
import { createDownloadControls } from './ui/download/controls.js';
import { createDownloadSetup } from './ui/download/setup.js';
import { getApplicationElements } from './ui/elements.js';
import { createNavigation } from './ui/navigation/setup.js';
import { createOutputSetup } from './ui/output/setup.js';
import { createRuntimeHelpers } from './ui/runtime/helpers.js';
import { startApplication } from './ui/runtime/startup.js';
import { createPreviewViewport } from './ui/preview/viewport.js';
import { createPreviewSetup } from './ui/preview/setup.js';
import { createPreviewSizeControls } from './ui/preview/size.js';
import { createStyleSetup } from './ui/style/setup.js';
import qrEncoder from '../qr/index.js';

const elements = getApplicationElements(document);
const {
  canvas, qrPreviewViewport, previewViewControls, previewViewFit, previewViewActual, chunkPreviewNav,
  chunkPreviewPrev, chunkPreviewNext, chunkPreviewStatus, encodedPreview, payloadRevealSecrets, payloadRevealToggle,
  qrFormat, bulkEnabled, bulkFields, bulkExpectedFields, bulkRequiredFields, bulkFileInput, bulkRowIndex,
  bulkStatus, bulkClear, choiceButtons, formatFieldsets, qrVersion, versionAuto,
  maskPattern, maskGrid, qrWidth, qrWidthValue, qrWidthAuto, qrScale, qrScaleValue,
  qrMargin, qrMarginValue, colorDark, colorLight, colorDarkTransparency, colorDarkTransparencyValue, colorLightTransparency,
  colorLightTransparencyValue, gradientType, gradientControls, gradientAngleControls, gradientAngle, gradientAngleValue, colorGradientEnd,
  colorGradientEndTransparency, colorGradientEndTransparencyValue, imageFillControls, imageFillInput, imageFillClear,
  moduleShape, moduleCustomControls, moduleRounding, moduleRoundingValue, moduleInset, moduleInsetValue,
  moduleRotation, moduleRotationValue, eyeShape, eyeCustomControls, eyeOuterRounding, eyeOuterRoundingValue, eyeCenterRounding,
  eyeCenterRoundingValue, eyeCustomColorsEnabled, eyeColorControls, centerArtMode, centerArtControls,
  centerArtSize, centerArtSizeValue, centerArtBackgroundLabel, centerLogoControls, centerLogoInput, centerLogoClear,
  centerEmojiControls, centerEmoji, emojiOptions, centerPixelControls, pixelArtColor, pixelArtClear, pixelArtPalette,
  pixelArtSizeInput, pixelArtSizeValue, pixelArtGrid, downloadFormat, downloadQualityControls, downloadQuality,
  downloadQualityValue, printWidthAuto, printWidth, printWidthValue, downloadCurrent, downloadCurrentPdf, downloadZip,
  downloadAllPdf, downloadActions, downloadStatus, errorCorrection, modeAuto, encodingMode, detectedMode, segmentSummary, versionSummary,
  capacitySummary, unusedSummary, modeValidation, formatValidation, tabButtons, tabPanels, debugSubtabButtons,
  debugSubtabPanels, styleSubtabButtons, styleSubtabPanels, downloadSubtabButtons, downloadSubtabPanels, downloadSubtabBar, downloadAnimationTab,
  animationTimingMode, animationMinutes, animationSeconds, animationMilliseconds, animationDurationSummary, downloadAnimatedGif, downloadAnimationMp4,
  contentSubtabButtons, contentSubtabPanels, debugEnabled, debugOutlineModeButtons, textInput,
  numberStart, numberEnd, numberStep, numberPrefix, numberSuffix, numberSequenceIndex, numberSequenceValue,
  wifiSsid, wifiPassword, wifiEncryption, wifiHidden, emailTo, emailSubject, emailBody,
  phoneNumber, phoneFormatButtons, smsNumber, smsBody, eventTitle,
  eventAllDay, eventStartDate, eventStartTime, eventEndDate, eventEndTime, eventLocation, eventDescription,
  eventUrl, eventTimeFields, geoLatitude, geoLongitude, geoQuery, geoMapElement, vcardName,
  vcardOrg, vcardTitle, vcardPhone, vcardEmail, vcardUrl, fileInput, fileEncodingMode,
  fileChunkControls, fileChunkVersionAuto, fileChunkVersion, fileChunkVersionValue, fileIncludeManifest, fileCompressTransfer, fileCustomMetadata,
  fileChunkIndex, fileChunkIndexValue, fileCapacityHint, clearFileButton,
} = elements;

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
const runtimeHelpers = createRuntimeHelpers({
  window, canvas, errorLevels: ERROR_LEVELS,
  controls: { errorCorrection, modeAuto, encodingMode, debugEnabled },
  getDebugState: () => ({ tab: activeTabName, subtab: activeDebugSubtab }),
});
const { clearCanvas, getDefaultUrl: getDefaultUrlValue,
  getEncodingMode: getCurrentEncodingMode, getErrorLevel: getSelectedErrorLevel,
  getShareableUrl: getShareableAppUrl, isDebugOverlayActive, readInteger } = runtimeHelpers;
const { sms: SMS_MAX_LENGTH, emailSubject: EMAIL_SUBJECT_MAX_LENGTH,
  numberFrames: NUMBER_SERIES_MAX_FRAMES, qrTargetWidth: MAX_QR_TARGET_WIDTH,
  printPixelsPerInch: PRINT_PIXELS_PER_INCH, minPrintModuleInches: MIN_PRINT_MODULE_INCHES,
  calendarTitle: CALENDAR_TITLE_MAX_LENGTH, calendarLocation: CALENDAR_LOCATION_MAX_LENGTH,
  calendarDescription: CALENDAR_DESCRIPTION_MAX_LENGTH } = LIMITS;
const DEFAULT_CHUNK_AUTO_VERSION = FILE_PROTOCOL.defaultChunkVersion;
const fileSetup = createFileSetup({
  elements: { input: fileInput, format: qrFormat, mode: fileEncodingMode,
    capacityHint: fileCapacityHint, clearButton: clearFileButton, chunkControls: fileChunkControls,
    chunkVersionAuto: fileChunkVersionAuto, chunkVersion: fileChunkVersion,
    chunkVersionValue: fileChunkVersionValue, includeManifest: fileIncludeManifest,
    compressTransfer: fileCompressTransfer, customMetadata: fileCustomMetadata,
    chunkIndex: fileChunkIndex, chunkIndexValue: fileChunkIndexValue,
    versionAuto, qrVersion },
  encoder: qrEncoder,
  protocol: FILE_PROTOCOL,
  createId: createCompactFileId,
  encodeBase64: arrayBufferToBase64,
  runtime: { buildOptions: () => buildOptions(), buildPayload: (text) => buildPayload(text),
    getEncodingMode: () => getCurrentEncodingMode(), getShareableAppUrl,
    syncNavigation: () => syncChunkPreviewNavigation(), cancelRender: () => cancelRenderRequest(),
    render: () => renderQr() },
});
const fileCache = fileSetup.cache;
const getActiveFile = fileCache.getFile;
const fileCapacityCalculator = fileSetup.capacity;
const invalidateChunkCapacityCache = fileCapacityCalculator.invalidate;
const getChunkedFileCapacityInfo = fileCapacityCalculator.getChunkInfo;
const fileSection = fileSetup.section;
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

const syncDownloadControls = createDownloadControls({
  elements: { format: downloadFormat, qualityControls: downloadQualityControls,
    quality: downloadQuality, qualityValue: downloadQualityValue, zip: downloadZip,
    allPdf: downloadAllPdf, animationTab: downloadAnimationTab, subtabBar: downloadSubtabBar,
    actionGroups: downloadActions },
  getFrameCount: () => getDownloadFrameCount(),
  activateImageTab: () => activateDownloadSubtab('image'),
  syncAnimation: () => syncAnimationDurationSummary(),
});

const fileSettings = fileSetup.settings;
const getConfiguredChunkVersion = fileSettings.getVersion;
const syncFileChunkLabel = fileSettings.syncChunkLabel;
const syncChunkVersionControls = fileSettings.syncVersion;
const resetTransferDerivedState = fileSettings.resetDerived;
const resetCachedFileState = fileSettings.resetCache;
const scheduleChunkSettingsRefresh = fileSettings.schedule;

const setFormatVisibility = createFormatVisibility({
  elements: { format: qrFormat, fieldsets: formatFieldsets, bulkEnabled,
    secretToggle: payloadRevealToggle },
  syncBulk: syncBulkControls,
  syncFile: syncFileModeVisibility,
  syncEvent: () => syncCalendarEventControls(),
});

const buildFilePayload = fileSetup.payload.build;

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
const geoSection = contentSections.geo;
const updateGeoMap = geoSection.update;
const phoneSection = contentSections.phone;
const numberSection = contentSections.number;
const getNumberSequenceInfo = numberSection.getSequenceInfo;
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

const sharedFieldsSection = contentSections.shared;

const colorSection = styleSetup.colors;
const formatColorTransparency = colorSection.formatTransparency;
const syncGradientControls = colorSection.sync;
const getCurrentGradientOptions = colorSection.getGradientOptions;
const applyRecommendedImageContrast = colorSection.applyRecommendedImageContrast;
const imageFillController = styleSetup.imageFill;
const centerLogoController = styleSetup.centerLogo;

const contentEncoding = createContentEncodingSetup({
  e: elements,
  encoder: qrEncoder,
  bulk: { isMode: isBulkMode, getRow: getBulkCurrentRow, getError: getBulkParseError,
    getSchema: getBulkSchema },
  file: { getActive: getActiveFile, getMode: getSelectedFileEncodingMode,
    getCapacity: getChunkedFileCapacityInfo, getChunkVersion: getConfiguredChunkVersion,
    buildPayload: buildFilePayload },
  sections: contentSections,
  runtime: { getFrameIndex: getCurrentFrameIndex, syncChoices: () => syncChoiceButtons(),
    syncArtwork: syncCenterArtworkControls },
  helpers: { getErrorLevel: getSelectedErrorLevel, readInteger, colorWithTransparency,
    getEncodingMode: getCurrentEncodingMode },
  config: {
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
    validationLimits: { emailSubject: EMAIL_SUBJECT_MAX_LENGTH,
      byteCapacity: MODE_CAPACITY.byte.L, sms: SMS_MAX_LENGTH,
      calendarTitle: CALENDAR_TITLE_MAX_LENGTH,
      calendarLocation: CALENDAR_LOCATION_MAX_LENGTH,
      calendarDescription: CALENDAR_DESCRIPTION_MAX_LENGTH },
  },
});
const contentPipeline = contentEncoding.pipeline;
const frameSection = contentPipeline.frame;
const getCurrentFrameMessage = frameSection.getMessage;
const setFrameMessageCenter = frameSection.setCentered;
const getFrameFont = frameSection.getFont;
const contentPayload = contentPipeline.payload;
const buildEncodedText = contentPayload.build;
const buildEncodedPreviewTemplate = contentPayload.preview;
const qrConfiguration = contentEncoding.qr;
const buildOptions = qrConfiguration.buildOptions;
const buildPayload = qrConfiguration.buildPayload;
const createQrDefinition = qrConfiguration.createDefinition;
const updateOptionsPreview = contentEncoding.updateOptionsPreview;
const updateEncodedPreview = contentEncoding.updateTextPreview;
const emailCapacity = contentEncoding.emailCapacity;
const getEmailBodyCapacityInfo = emailCapacity.getInfo;
const syncEmailBodyLengthHint = emailCapacity.sync;
const getFormatValidationState = contentEncoding.validation;

const outputSetup = createOutputSetup({
  elements,
  getErrorLevel: getSelectedErrorLevel,
  smsMaxLength: SMS_MAX_LENGTH,
  actions: { syncSizeLabels, formatColorTransparency, syncGradientControls,
    syncNumberSequenceControls, getCurrentFrameMessage, syncModuleShapeControls,
    syncEyeShapeControls, syncCenterArtworkControls, syncChunkPreviewNavigation,
    syncPrintWidthControls, syncEmailBodyLengthHint, syncFileCapacityHint },
});
const syncOutputs = outputSetup.sync;
const formatVersionLabel = outputSetup.formatVersion;
const syncSmsLengthHint = outputSetup.syncSmsLength;

const debugSetup = createDebugSetup({
  elements: { format: qrFormat, diagnostics: { detectedMode, segmentSummary, versionSummary,
    capacitySummary, unusedSummary, modeValidation, formatValidation, encodedPreview, bulkFields },
    colors: debugColors, darkColor: colorDark, darkTransparency: colorDarkTransparency,
    lightColor: colorLight, lightTransparency: colorLightTransparency, maskGrid, maskPattern,
    outlineButtons: debugOutlineModeButtons },
  encoder: qrEncoder,
  config: { modeLabels: MODE_LABELS, modeCapacity: MODE_CAPACITY,
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS, maskValues: MASK_VALUES,
    maskLabels: MASK_LABELS },
  helpers: { getCurrentMode: getCurrentEncodingMode, isBulkMode,
    buildDebugModel: buildDebugOverlayModel, getContrastingHex, getDebugCategory,
    getErrorLevel: getSelectedErrorLevel, colorWithTransparency },
  runtime: { render: () => renderQr(), getOutlineMode: () => activeDebugOutlineMode,
    setOutlineMode: (value) => { activeDebugOutlineMode = value; } },
});
const encodingDiagnostics = debugSetup.diagnostics;
const setValidationMessage = encodingDiagnostics.setValidation;
const validateManualMode = encodingDiagnostics.validateManualMode;
const updateEncodingSummary = encodingDiagnostics.updateSummary;

const debugStyles = debugSetup.styles;
const getCodewordStyle = debugStyles.getCodewordStyle;
const getModuleContrastColor = debugStyles.getModuleContrastColor;



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

const debugOutlineSelector = debugSetup.outlines;
const syncDebugOutlineSelection = debugOutlineSelector.sync;

const previewSetup = createPreviewSetup({
  e: elements,
  encoder: qrEncoder,
  debugColors,
  maxTargetWidth: MAX_QR_TARGET_WIDTH,
  content: { getFrameMessage: getCurrentFrameMessage, getFrameFont, buildText: buildEncodedText,
    buildOptions, buildPreview: buildEncodedPreviewTemplate, updateTextPreview: updateEncodedPreview,
    updateOptionsPreview, getValidation: getFormatValidationState, buildPayload, createDefinition: createQrDefinition },
  debug: { setup: debugSetup, isOverlayActive: isDebugOverlayActive, getCodewordStyle,
    getModuleContrastColor, getOutlineMode: () => activeDebugOutlineMode,
    setValidation: setValidationMessage, updateSummary: updateEncodingSummary,
    validateMode: validateManualMode },
  style: { getModuleOptions: getCurrentModuleShapeOptions, getEyeOptions: getCurrentEyeShapeOptions,
    getGradientOptions: getCurrentGradientOptions, imageFill: imageFillController,
    centerLogo: centerLogoController, pixelEditor: pixelArtEditor },
  helpers: { formatWidthLabel, readInteger, clearCanvas },
  actions: { syncOutputs, syncFormat: setFormatVisibility, updateMap: updateGeoMap,
    syncDownloads: syncDownloadControls },
  runtime: { scheduleViewportSync: schedulePreviewViewportSync,
    setRenderMetrics(width, scale) { renderedQrWidth = width; renderedQrModuleScale = scale; } },
});
const renderQr = previewSetup.render;
cancelRenderRequest = previewSetup.cancel;
const ensureMaskButtons = previewSetup.ensureMaskButtons;
const syncMaskSelection = previewSetup.syncMaskSelection;

startApplication({
  document, window, elements, defaultChunkVersion: DEFAULT_CHUNK_AUTO_VERSION,
  eventActions: {
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
  initialize: {
    pixelEditor: () => pixelArtEditor.initialize(), calendarDefaults: initializeCalendarEventDefaults,
    getDefaultUrl: getDefaultUrlValue, outputs: syncOutputs, formatVisibility: setFormatVisibility,
    maskButtons: ensureMaskButtons, maskSelection: syncMaskSelection, choiceButtons: syncChoiceButtons,
    wifi: syncWifiSecurityState, phone: () => phoneSection.initialize(), fileCapacity: syncFileCapacityHint,
    chunkVersion: syncChunkVersionControls, fileChunkLabel: syncFileChunkLabel,
    sharedFields: () => sharedFieldsSection.initialize(), smsLength: syncSmsLengthHint,
    emailLength: syncEmailBodyLengthHint, debugOutline: syncDebugOutlineSelection,
    contentTab: activateContentSubtab, styleTab: activateStyleSubtab,
    downloadTab: activateDownloadSubtab, debugTab: activateDebugSubtab, mainTab: activateTab,
    previewMode: setPreviewViewMode, render: renderQr,
  },
});
