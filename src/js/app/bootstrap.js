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
const debugColors = getDebugColorElements(document);
let cancelRenderRequest = () => {};
const previewControls = createPreviewControlsSetup({
  elements,
  pixelsPerInch: LIMITS.printPixelsPerInch,
  minPrintModuleInches: LIMITS.minPrintModuleInches,
});
let activeTabName = 'content';
let activeDebugSubtab = 'encoding';
let activeDebugOutlineMode = 'codewords';
const runtimeHelpers = createRuntimeHelpers({
  window, canvas: elements.canvas, errorLevels: ERROR_LEVELS, controls: elements,
  getDebugState: () => ({ tab: activeTabName, subtab: activeDebugSubtab }),
});

const contentData = createContentDataSetup({
  document, elements,
  encoder: qrEncoder,
  protocol: FILE_PROTOCOL,
  runtime: {
    buildOptions: () => contentEncoding.qr.buildOptions(),
    buildPayload: (text) => contentEncoding.qr.buildPayload(text),
    getEncodingMode: runtimeHelpers.getEncodingMode,
    getShareableAppUrl: runtimeHelpers.getShareableUrl,
    syncNavigation: () => download.syncNavigation(),
    cancelRender: () => cancelRenderRequest(),
    render: () => preview.render(),
    syncChoices: () => navigation.syncChoices(),
  },
});

const styleSetup = createStyleSetup({
  elements,
  render: () => preview.render(),
  colorWithTransparency,
});

const setFormatVisibility = createFormatVisibility({
  elements: { format: elements.qrFormat, fieldsets: elements.formatFieldsets,
    bulkEnabled: elements.bulkEnabled, secretToggle: elements.payloadRevealToggle },
  syncBulk: contentData.syncBulkControls,
  syncFile: contentData.syncFileModeVisibility,
  syncEvent: () => contentSections.event.sync(),
});

const contentSections = createContentSections({
  elements,
  runtime: { render: () => preview.render(), syncChoices: () => navigation.syncChoices(),
    syncSmsLength: () => output.syncSmsLength(),
    syncEmailLength: () => contentEncoding.emailCapacity.sync() },
  limits: { numberFrames: LIMITS.numberFrames },
  alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
  validatePrintableText,
});

const download = createApplicationDownloadSetup({
  elements,
  bulk: { isMode: contentData.isBulkMode, getRowCount: contentData.getBulkRowCount,
    syncStatus: contentData.syncBulkStatus },
  file: { getMode: contentData.getSelectedFileEncodingMode,
    syncChunkLabel: contentData.file.settings.syncChunkLabel },
  number: { getInfo: contentSections.number.getSequenceInfo, sync: contentSections.number.sync },
  runtime: { activateImageTab: () => navigation.activateDownload('image'),
    render: () => preview.render() },
  maxNumberFrames: LIMITS.numberFrames,
  getPrintWidth: previewControls.getPrintWidth,
});

const contentEncoding = createContentEncodingSetup({
  e: elements,
  encoder: qrEncoder,
  bulk: { isMode: contentData.isBulkMode, getRow: contentData.getBulkCurrentRow,
    getError: contentData.getBulkParseError, getSchema: contentData.getBulkSchema },
  file: { getActive: contentData.getActiveFile, getMode: contentData.getSelectedFileEncodingMode,
    getCapacity: contentData.getChunkedFileCapacityInfo,
    getChunkVersion: contentData.file.settings.getVersion,
    buildPayload: contentData.file.payload.build },
  sections: contentSections,
  runtime: { getFrameIndex: download.getCurrentFrame,
    syncChoices: () => navigation.syncChoices(), syncArtwork: styleSetup.artwork.sync },
  helpers: { getErrorLevel: runtimeHelpers.getErrorLevel, readInteger: runtimeHelpers.readInteger,
    colorWithTransparency, getEncodingMode: runtimeHelpers.getEncodingMode },
  config: {
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
    validationLimits: { emailSubject: LIMITS.emailSubject,
      byteCapacity: MODE_CAPACITY.byte.L, sms: LIMITS.sms,
      calendarTitle: LIMITS.calendarTitle, calendarLocation: LIMITS.calendarLocation,
      calendarDescription: LIMITS.calendarDescription },
  },
});

const output = createOutputSetup({
  elements,
  systems: { previewControls, style: styleSetup, contentSections, contentEncoding,
    download, contentData },
  getErrorLevel: runtimeHelpers.getErrorLevel,
  smsMaxLength: LIMITS.sms,
});

const debugSetup = createApplicationDebugSetup({
  elements,
  encoder: qrEncoder,
  config: { modeLabels: MODE_LABELS, modeCapacity: MODE_CAPACITY,
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS, maskValues: MASK_VALUES,
    maskLabels: MASK_LABELS },
  colors: debugColors,
  getCurrentMode: runtimeHelpers.getEncodingMode,
  getErrorLevel: runtimeHelpers.getErrorLevel,
  isBulkMode: contentData.isBulkMode,
  runtime: { render: () => preview.render(), getOutlineMode: () => activeDebugOutlineMode,
    setOutlineMode: (value) => { activeDebugOutlineMode = value; } },
});
const navigation = createApplicationNavigation({
  elements,
  render: () => preview.render(),
  updateMap: contentSections.geo.update,
  state: { setActiveTab: (name) => { activeTabName = name; },
    setActiveDebugSubtab: (name) => { activeDebugSubtab = name; } },
});

const preview = createPreviewSetup({
  e: elements,
  encoder: qrEncoder,
  debugColors,
  maxTargetWidth: LIMITS.qrTargetWidth,
  systems: { content: contentEncoding, debug: debugSetup, style: styleSetup,
    output, download, previewControls },
  helpers: { formatWidthLabel: previewControls.formatWidth,
    readInteger: runtimeHelpers.readInteger, clearCanvas: runtimeHelpers.clearCanvas },
  actions: { syncFormat: setFormatVisibility, updateMap: contentSections.geo.update },
  runtime: { isDebugOverlayActive: runtimeHelpers.isDebugOverlayActive,
    getOutlineMode: () => activeDebugOutlineMode },
});
cancelRenderRequest = preview.cancel;

startApplication({
  document, window, elements, defaultChunkVersion: FILE_PROTOCOL.defaultChunkVersion,
  systems: { contentData, contentSections, contentEncoding, style: styleSetup, download,
    output, debug: debugSetup, navigation, preview, previewControls,
    syncFormat: setFormatVisibility },
  runtime: { getDefaultUrl: runtimeHelpers.getDefaultUrl },
});
