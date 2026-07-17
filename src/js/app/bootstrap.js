import { colorWithTransparency } from './colors.js';
import { ERROR_LEVELS, FILE_PROTOCOL, LIMITS, MASK_LABELS, MASK_VALUES,
  MODE_CAPACITY, MODE_LABELS, QR_ALPHANUMERIC_CHARACTERS } from './configuration.js';
import { validatePrintableText } from './validation.js';
import { createFormatVisibility } from './ui/content/format-visibility.js';
import { createContentEncodingSetup } from './ui/content/encoding-setup.js';
import { createContentDataSetup } from './ui/content/data-setup.js';
import { createContentSections } from './ui/content/setup.js';
import { createApplicationDebugSetup } from './ui/debug/application-setup.js';
import { getDebugColorElements } from './ui/debug/colors.js';
import { createApplicationDownloadSetup } from './ui/download/application-setup.js';
import { getApplicationElements } from './ui/elements.js';
import { createApplicationNavigation } from './ui/navigation/application-setup.js';
import { createOutputSetup } from './ui/output/setup.js';
import { createRuntimeHelpers } from './ui/runtime/helpers.js';
import { startApplication } from './ui/runtime/startup.js';
import { createPreviewControlsSetup } from './ui/preview/controls-setup.js';
import { createPreviewSetup } from './ui/preview/setup.js';
import { createStyleSetup } from './ui/style/setup.js';
import qrEncoder from '../qr/index.js';

const elements = getApplicationElements(document);
const {
  canvas, payloadRevealToggle, qrFormat, bulkEnabled, choiceButtons, formatFieldsets,
  errorCorrection, modeAuto, encodingMode, debugEnabled,
} = elements;

const debugColors = getDebugColorElements(document);

let cancelRenderRequest = () => {};
const previewControls = createPreviewControlsSetup({
  elements,
  pixelsPerInch: LIMITS.printPixelsPerInch,
  minPrintModuleInches: LIMITS.minPrintModuleInches,
});
const { setViewMode: setPreviewViewMode, scheduleViewportSync: schedulePreviewViewportSync,
  getPrintWidth: getPrintWidthInches, syncPrint: syncPrintWidthControls,
  formatWidth: formatWidthLabel, syncLabels: syncSizeLabels } = previewControls;
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
  calendarTitle: CALENDAR_TITLE_MAX_LENGTH, calendarLocation: CALENDAR_LOCATION_MAX_LENGTH,
  calendarDescription: CALENDAR_DESCRIPTION_MAX_LENGTH } = LIMITS;
const DEFAULT_CHUNK_AUTO_VERSION = FILE_PROTOCOL.defaultChunkVersion;
const contentData = createContentDataSetup({
  document,
  elements,
  encoder: qrEncoder,
  protocol: FILE_PROTOCOL,
  runtime: { buildOptions: () => buildOptions(), buildPayload: (text) => buildPayload(text),
    getEncodingMode: () => getCurrentEncodingMode(), getShareableAppUrl,
    syncNavigation: () => syncChunkPreviewNavigation(), cancelRender: () => cancelRenderRequest(),
    render: () => renderQr(), syncChoices: () => syncChoiceButtons() },
});
const { file: fileSetup, getActiveFile, invalidateChunkCapacityCache,
  getChunkedFileCapacityInfo, getSelectedFileEncodingMode, syncFileModeVisibility,
  syncFileCapacityHint, clearLoadedFile, getBulkSchema, isBulkMode, getBulkCurrentRow,
  getBulkRowCount, getBulkParseError, syncBulkStatus, syncBulkControls, clearBulkData,
  loadBulkFile } = contentData;

const styleSetup = createStyleSetup({
  elements,
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
  elements,
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

const applicationDownload = createApplicationDownloadSetup({
  elements,
  bulk: { isMode: isBulkMode, getRowCount: getBulkRowCount, syncStatus: syncBulkStatus },
  file: { getMode: getSelectedFileEncodingMode, syncChunkLabel: syncFileChunkLabel },
  number: { getInfo: getNumberSequenceInfo, sync: syncNumberSequenceControls },
  runtime: { activateImageTab: () => activateDownloadSubtab('image'), render: () => renderQr() },
  maxNumberFrames: NUMBER_SERIES_MAX_FRAMES,
  getPrintWidth: getPrintWidthInches,
});
const { syncControls: syncDownloadControls, getFrameCount: getDownloadFrameCount,
  getCurrentFrame: getCurrentFrameIndex, setCurrentFrame: setCurrentFrameIndex,
  syncNavigation: syncChunkPreviewNavigation,
  syncAnimation: syncAnimationDurationSummary } = applicationDownload;

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

const debugSetup = createApplicationDebugSetup({
  elements,
  encoder: qrEncoder,
  config: { modeLabels: MODE_LABELS, modeCapacity: MODE_CAPACITY,
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS, maskValues: MASK_VALUES,
    maskLabels: MASK_LABELS },
  colors: debugColors,
  getCurrentMode: getCurrentEncodingMode,
  getErrorLevel: getSelectedErrorLevel,
  isBulkMode,
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



const navigation = createApplicationNavigation({
  elements,
  render: () => renderQr(),
  updateMap: updateGeoMap,
  state: { setActiveTab: (name) => { activeTabName = name; },
    setActiveDebugSubtab: (name) => { activeDebugSubtab = name; } },
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
    setRenderMetrics: previewControls.setRenderMetrics },
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
