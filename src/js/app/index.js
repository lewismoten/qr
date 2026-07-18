import { colorWithTransparency } from './colors.js';
import {
  ERROR_LEVELS,
  FILE_PROTOCOL,
  LIMITS,
  MASK_VALUES,
  MODE_CAPACITY,
  MODE_LABELS,
  QR_ALPHANUMERIC_CHARACTERS,
} from './configuration.js';
import { validatePrintableText } from './validation.js';
import { createFormatVisibility } from './ui/content/format-visibility.js';
import { createContentEncodingSetup } from './ui/content/encoding-setup.js';
import { createContentDataSetup } from './ui/content/data-setup.js';
import { createContentSections } from './ui/content/setup.js';
import { createDebugFacade } from './ui/debug/facade.js';
import { createLazyDownloadSetup } from './ui/runtime/lazy-download.js';
import { getApplicationElements } from './ui/elements.js';
import { createApplicationNavigation } from './ui/navigation/application-setup.js';
import { createOutputSetup } from './ui/output/setup.js';
import { createRuntimeContext } from './ui/runtime/context.js';
import { createRuntimeHelpers } from './ui/runtime/helpers.js';
import { startApplication } from './ui/runtime/startup.js';
import { createPreviewControlsSetup } from './ui/preview/controls-setup.js';
import { createPreviewSetup } from './ui/preview/setup.js';
import { createLazyStyleSetup } from './ui/style/lazy-setup.js';
import { createTaskProgress } from './ui/download/progress.js';
import qrEncoder from '../qr/matrix-encoder.js';

const elements = getApplicationElements(document);
const taskProgress = createTaskProgress({
  dialog: elements.taskProgressDialog,
  title: elements.taskProgressTitle,
  phase: elements.taskProgressPhase,
  meter: elements.taskProgressMeter,
  percent: elements.taskProgressPercent,
  elapsed: elements.taskProgressElapsed,
  remaining: elements.taskProgressRemaining,
  completion: elements.taskProgressCompletion,
  cancel: elements.taskProgressCancel,
});
const runtime = createRuntimeContext();
const previewControls = createPreviewControlsSetup({
  elements,
  pixelsPerInch: LIMITS.printPixelsPerInch,
  minPrintModuleInches: LIMITS.minPrintModuleInches,
});
const runtimeHelpers = createRuntimeHelpers({
  window,
  canvas: elements.canvas,
  errorLevels: ERROR_LEVELS,
  controls: elements,
  getDebugState: runtime.getDebugState,
});

const contentData = createContentDataSetup({
  document,
  elements,
  taskProgress,
  encoder: qrEncoder,
  protocol: FILE_PROTOCOL,
  runtime: {
    buildOptions: runtime.buildOptions,
    buildPayload: runtime.buildPayload,
    getEncodingMode: runtimeHelpers.getEncodingMode,
    getShareableAppUrl: runtimeHelpers.getShareableUrl,
    syncNavigation: runtime.syncNavigation,
    cancelRender: runtime.cancelRender,
    render: runtime.render,
    syncChoices: runtime.syncChoices,
  },
});

const styleSetup = createLazyStyleSetup({
  elements,
  render: runtime.render,
  colorWithTransparency,
});

const contentSections = createContentSections({
  document,
  elements,
  runtime: {
    render: runtime.render,
    syncChoices: runtime.syncChoices,
    syncSmsLength: runtime.syncSmsLength,
    syncEmailLength: runtime.syncEmailLength,
  },
  limits: { numberFrames: LIMITS.numberFrames, sms: LIMITS.sms },
  alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
  validatePrintableText,
});

const setFormatVisibility = createFormatVisibility({
  elements: {
    format: elements.qrFormat,
    fieldsets: elements.formatFieldsets,
    bulkEnabled: elements.bulkEnabled,
    secretToggle: elements.payloadRevealToggle,
  },
  syncBulk: contentData.syncBulkControls,
  syncFile: contentData.syncFileModeVisibility,
  syncEvent: runtime.syncEvent,
  prepareFormat: contentSections.ensureFormat,
});

const download = createLazyDownloadSetup({
  document,
  elements,
  taskProgress,
  bulk: {
    isMode: contentData.isBulkMode,
    getRowCount: contentData.getBulkRowCount,
    syncStatus: contentData.syncBulkStatus,
  },
  file: {
    getMode: contentData.getSelectedFileEncodingMode,
    syncChunkLabel: contentData.file.settings.syncChunkLabel,
  },
  number: {
    getInfo: contentSections.number.getSequenceInfo,
    sync: contentSections.number.sync,
  },
  runtime: {
    activateImageTab: () => runtime.activateDownload('image'),
    render: runtime.render,
  },
  maxNumberFrames: LIMITS.numberFrames,
  getPrintWidth: previewControls.getPrintWidth,
  syncPrint: previewControls.syncPrint,
});

const contentEncoding = createContentEncodingSetup({
  document,
  e: elements,
  encoder: qrEncoder,
  bulk: {
    isMode: contentData.isBulkMode,
    getRow: contentData.getBulkCurrentRow,
    build: contentData.buildBulkPayload,
    getError: contentData.getBulkParseError,
    getSchema: contentData.getBulkSchema,
    getValidationState: contentData.getBulkValidationState,
  },
  file: {
    getActive: contentData.getActiveFile,
    getMode: contentData.getSelectedFileEncodingMode,
    getCapacity: contentData.getChunkedFileCapacityInfo,
    getChunkVersion: contentData.file.settings.getVersion,
    buildPayload: contentData.file.payload.build,
  },
  sections: contentSections,
  runtime: {
    getFrameIndex: download.getCurrentFrame,
    syncChoices: runtime.syncChoices,
    syncArtwork: styleSetup.artwork.sync,
    getDebugState: runtime.getDebugState,
  },
  helpers: {
    getErrorLevel: runtimeHelpers.getErrorLevel,
    readInteger: runtimeHelpers.readInteger,
    colorWithTransparency,
    getEncodingMode: runtimeHelpers.getEncodingMode,
  },
  config: {
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
    validationLimits: {
      emailSubject: LIMITS.emailSubject,
      byteCapacity: MODE_CAPACITY.byte.L,
      sms: LIMITS.sms,
      calendarTitle: LIMITS.calendarTitle,
      calendarLocation: LIMITS.calendarLocation,
      calendarDescription: LIMITS.calendarDescription,
    },
  },
});

const output = createOutputSetup({
  elements,
  systems: {
    previewControls,
    style: styleSetup,
    contentSections,
    contentEncoding,
    download,
    contentData,
  },
  getErrorLevel: runtimeHelpers.getErrorLevel,
});

const debugSetup = createDebugFacade({
  elements,
  encoder: qrEncoder,
  config: {
    modeLabels: MODE_LABELS,
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
    maskValues: MASK_VALUES,
  },
  getCurrentMode: runtimeHelpers.getEncodingMode,
  getErrorLevel: runtimeHelpers.getErrorLevel,
  isBulkMode: contentData.isBulkMode,
  runtime: {
    render: runtime.render,
    getOutlineMode: runtime.getOutlineMode,
    setOutlineMode: runtime.setOutlineMode,
    getDebugState: runtime.getDebugState,
  },
});
const navigation = createApplicationNavigation({
  elements,
  render: runtime.render,
  updateMap: contentSections.geo.update,
  prepareDebug: debugSetup.load,
  prepareStyle: (name) =>
    name === 'size' ? previewControls.loadSize() : styleSetup.load(name),
  prepareDownload: download.load,
  state: {
    setActiveTab: runtime.setActiveTab,
    setActiveDebugSubtab: runtime.setActiveDebugSubtab,
  },
});

const preview = createPreviewSetup({
  e: elements,
  encoder: qrEncoder,
  debugColors: debugSetup.colors,
  maxTargetWidth: LIMITS.qrTargetWidth,
  systems: {
    content: contentEncoding,
    debug: debugSetup,
    style: styleSetup,
    output,
    download,
    previewControls,
  },
  helpers: {
    formatWidthLabel: previewControls.formatWidth,
    readInteger: runtimeHelpers.readInteger,
    clearCanvas: runtimeHelpers.clearCanvas,
  },
  actions: {
    syncFormat: setFormatVisibility,
    updateMap: contentSections.geo.update,
  },
  runtime: {
    isDebugOverlayActive: runtimeHelpers.isDebugOverlayActive,
    getOutlineMode: runtime.getOutlineMode,
  },
});
runtime.connect({
  contentEncoding,
  contentSections,
  download,
  navigation,
  output,
  preview,
});

export const applicationReady = startApplication({
  document,
  window,
  elements,
  defaultChunkVersion: FILE_PROTOCOL.defaultChunkVersion,
  systems: {
    contentData,
    contentSections,
    contentEncoding,
    style: styleSetup,
    download,
    output,
    debug: debugSetup,
    navigation,
    preview,
    previewControls,
    syncFormat: setFormatVisibility,
  },
  runtime: { getDefaultUrl: runtimeHelpers.getDefaultUrl },
});

export function refreshLanguage() {
  output.sync();
  navigation.syncChoices();
  setFormatVisibility();
  return preview.render();
}
