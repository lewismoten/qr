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
import { createTaskProgressFromDocument } from './ui/download/progress.js';
import qrEncoder from '@lewismoten/qr';

const elements = getApplicationElements(document);
const taskProgress = createTaskProgressFromDocument(document);
const runtime = createRuntimeContext();
const previewControls = createPreviewControlsSetup({
  document,
  elements,
  pixelsPerInch: LIMITS.printPixelsPerInch,
  minPrintModuleInches: LIMITS.minPrintModuleInches,
});
const runtimeHelpers = createRuntimeHelpers({
  window,
  canvas: elements.canvas,
  errorLevels: ERROR_LEVELS,
  controls: elements,
});

const contentData = createContentDataSetup({
  document,
  elements,
  taskProgress,
  encoder: qrEncoder,
  protocol: FILE_PROTOCOL,
  limits: { ...LIMITS, byteCapacity: MODE_CAPACITY.byte.L },
  runtime: {
    buildOptions: runtime.buildOptions,
    buildPayload: runtime.buildPayload,
    getEncodingMode: runtimeHelpers.getEncodingMode,
    getShareableAppUrl: runtimeHelpers.getShareableUrl,
    syncNavigation: runtime.syncNavigation,
    cancelRender: runtime.cancelRender,
    render: runtime.render,
    syncChoices: runtime.syncChoices,
    formatVersion: runtime.formatVersion,
  },
});
const styleSetup = createLazyStyleSetup({
  document,
  render: runtime.render,
  setFrameCentered: (...args) => runtime.setFrameCentered(...args),
  colorWithTransparency,
});
const contentSections = createContentSections({
  document,
  elements,
  runtime: {
    render: runtime.render,
    buildOptions: runtime.buildOptions,
    buildPayload: runtime.buildPayload,
    syncChoices: runtime.syncChoices,
    syncSmsLength: runtime.syncSmsLength,
    syncEmailLength: runtime.syncEmailLength,
  },
  limits: { ...LIMITS, byteCapacity: MODE_CAPACITY.byte.L },
  encoder: qrEncoder,
  alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
  validatePrintableText,
  file: {
    build: contentData.file.payload.build,
    preview: contentData.file.payload.preview,
    getActive: contentData.getActiveFile,
    getMode: contentData.getSelectedFileEncodingMode,
    getCapacity: contentData.getChunkedFileCapacityInfo,
  },
});

const setFormatVisibility = createFormatVisibility({
  document,
  elements: {
    format: elements.qrFormat,
    bulkEnabled: elements.bulkEnabled,
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
    getRowIndex: contentData.getBulkRowIndex,
    syncStatus: contentData.syncBulkStatus,
  },
  file: {
    getMode: contentData.getSelectedFileEncodingMode,
    getIndex: contentData.file.section.getChunkIndex,
    syncChunkLabel: contentData.file.settings.syncChunkLabel,
  },
  number: {
    getInfo: contentSections.number.getSequenceInfo,
    getIndex: contentSections.number.getIndexInput,
    sync: contentSections.number.sync,
  },
  runtime: {
    activateImageTab: () => runtime.activateDownload('image'),
    render: runtime.render,
  },
  maxNumberFrames: LIMITS.numberFrames,
  getPrintWidth: previewControls.getPrintWidth,
  syncPrint: previewControls.syncPrint,
  connectPrintElements: previewControls.connectPrintElements,
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
    preview: contentData.file.payload.preview,
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
    getQrColors: styleSetup.colors.getQrColors,
    getEncodingMode: runtimeHelpers.getEncodingMode,
  },
  config: {
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
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
  getQrColors: styleSetup.colors.getQrColors,
});

const debugSetup = createDebugFacade({
  document,
  elements,
  encoder: qrEncoder,
  config: {
    modeLabels: MODE_LABELS,
    alphanumericCharacters: QR_ALPHANUMERIC_CHARACTERS,
    maskValues: MASK_VALUES,
  },
  getCurrentMode: runtimeHelpers.getEncodingMode,
  getErrorLevel: runtimeHelpers.getErrorLevel,
  getQrColors: styleSetup.colors.getQrColors,
  isBulkMode: contentData.isBulkMode,
  runtime: {
    render: runtime.render,
    getOutlineMode: runtime.getOutlineMode,
    setOutlineMode: runtime.setOutlineMode,
    getDebugState: runtime.getDebugState,
  },
});
const navigation = createApplicationNavigation({
  document,
  elements,
  render: runtime.render,
  updateMap: contentSections.geo.update,
  prepareDebug: debugSetup.load,
  prepareStyle: (name) =>
    name === 'size' ? previewControls.loadSize() : styleSetup.load(name),
  prepareDownload: download.load,
  prepareContent: (name) =>
    name === 'frame'
      ? contentEncoding.pipeline.frame.load()
      : Promise.resolve(),
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
    isDebugOverlayActive: debugSetup.isOverlayActive,
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
  setFormatVisibility();
  return preview.render();
}
