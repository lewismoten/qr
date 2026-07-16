const form = document.getElementById('qr-form');
const canvas = document.getElementById('qr-canvas');
const chunkPreviewNav = document.getElementById('chunk-preview-nav');
const chunkPreviewPrev = document.getElementById('chunk-preview-prev');
const chunkPreviewNext = document.getElementById('chunk-preview-next');
const chunkPreviewStatus = document.getElementById('chunk-preview-status');
const optionsPreview = document.getElementById('options-preview');
const encodedPreview = document.getElementById('encoded-preview');
const payloadRevealSecrets = document.getElementById('payload-reveal-secrets');
const payloadRevealToggle = document.getElementById('payload-reveal-toggle');
const qrFormat = document.getElementById('qr-format');
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
const frameMessageMode = document.getElementById('frame-message-mode');
const customFrameMessageField = document.getElementById('custom-frame-message-field');
const customFrameMessage = document.getElementById('custom-frame-message');
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
const centerArtMode = document.getElementById('center-art-mode');
const centerArtControls = document.getElementById('center-art-controls');
const centerArtSize = document.getElementById('center-art-size');
const centerArtSizeValue = document.getElementById('center-art-size-value');
const centerArtBackground = document.getElementById('center-art-background');
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
const optionsJson = document.getElementById('options-json');
const errorCorrection = document.getElementById('error-correction');
const errorCorrectionLabel = document.getElementById('error-correction-label');
const errorCorrectionValue = document.getElementById('error-correction-value');
const errorCorrectionHelp = document.getElementById('error-correction-help');
const modeAuto = document.getElementById('mode-auto');
const encodingMode = document.getElementById('encoding-mode');
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
const contentSubtabButtons = document.querySelectorAll('.content-subtab-button');
const contentSubtabPanels = document.querySelectorAll('.content-subtab-panel');
const debugEnabled = document.getElementById('debug-enabled');
const debugOutlineModeButtons = document.querySelectorAll('.outline-mode-button');

const textInput = document.getElementById('text-input');
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

const CHAR_COUNT_BITS = {
  numeric: [10, 12, 14],
  alphanumeric: [9, 11, 13],
  byte: [8, 16, 16],
  kanji: [8, 10, 12],
};

const SYMBOL_TOTAL_CODEWORDS = [
  0,
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

const EC_CODEWORDS_TABLE = {
  L: [
    7, 10, 15, 20, 26, 36, 40, 48, 60, 72,
    80, 96, 104, 120, 132, 144, 168, 180, 196, 224,
    224, 252, 270, 300, 312, 336, 360, 390, 420, 450,
    480, 510, 540, 570, 570, 600, 630, 660, 720, 750,
  ],
  M: [
    10, 16, 26, 36, 48, 64, 72, 88, 110, 130,
    150, 176, 198, 216, 240, 280, 308, 338, 364, 416,
    442, 476, 504, 560, 588, 644, 700, 728, 784, 812,
    868, 924, 980, 1036, 1064, 1120, 1204, 1260, 1316, 1372,
  ],
  Q: [
    13, 22, 36, 52, 72, 96, 108, 132, 160, 192,
    224, 260, 288, 320, 360, 408, 448, 504, 546, 600,
    644, 690, 750, 810, 870, 952, 1020, 1050, 1140, 1200,
    1290, 1350, 1440, 1530, 1590, 1680, 1770, 1860, 1950, 2040,
  ],
  H: [
    17, 28, 44, 64, 88, 112, 130, 156, 192, 224,
    264, 308, 352, 384, 432, 480, 532, 588, 650, 700,
    750, 816, 900, 960, 1050, 1110, 1200, 1260, 1350, 1440,
    1530, 1620, 1710, 1800, 1890, 1980, 2100, 2220, 2310, 2430,
  ],
};

let renderRequest = 0;
let cachedFile = null;
let cachedFilePayload = '';
let cachedFileArrayBuffer = null;
let cachedFileBase64 = '';
let cachedFileObjectUrl = '';
let cachedFileId = '';
let cachedFileHash = '';
let cachedFileManifest = null;
let cachedTransferBytes = null;
let cachedChunkCapacityInfoKey = '';
let cachedChunkCapacityInfoValue = null;
let chunkSettingsRefreshTimer = 0;
const EGA_COLORS = [
  ['Black', '#000000'],
  ['Blue', '#0000aa'],
  ['Green', '#00aa00'],
  ['Cyan', '#00aaaa'],
  ['Red', '#aa0000'],
  ['Magenta', '#aa00aa'],
  ['Brown', '#aa5500'],
  ['Light gray', '#aaaaaa'],
  ['Dark gray', '#555555'],
  ['Bright blue', '#5555ff'],
  ['Bright green', '#55ff55'],
  ['Bright cyan', '#55ffff'],
  ['Bright red', '#ff5555'],
  ['Bright magenta', '#ff55ff'],
  ['Yellow', '#ffff55'],
  ['White', '#ffffff'],
];
let centerLogoImage = null;
let centerLogoObjectUrl = '';
let centerLogoLoadRequest = 0;
let pixelArtSize = 16;
let pixelArtPixels = Array(pixelArtSize * pixelArtSize).fill(null);
let activePixelPaintColor = '#000000';
let pixelPaintValue = null;
let pixelPainting = false;
let pixelRenderFrame = 0;
let chunkSettingsRefreshRequest = 0;
let transferSettingsRevision = 0;
let renderedQrWidth = null;
let renderedQrModuleScale = null;
let geoMap = null;
let geoMarker = null;
let geoPopup = null;
let geoLabelMarker = null;
let activeTabName = 'content';
let activeDebugSubtab = 'encoding';
let activeDebugOutlineMode = 'codewords';
let activePhoneFormat = 'usa';
const SMS_MAX_LENGTH = 160;
const EMAIL_SUBJECT_MAX_LENGTH = 120;
const VCARD_TEXT_PATTERN = /^[A-Za-z0-9 .,&()'/:+-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRINTABLE_TEXT_PATTERN = /^[\x20-\x7E]*$/;
const FILE_FRAME_PREFIX = 'FILE';
const FILE_PROTOCOL_VERSION = '1';
const FILE_MANIFEST_MAGIC = 'FILE';
const FILE_ID_FILLER = 'aaaaaaaaaaaaaaaaaaaaaa';
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

function parseCoordinate(value) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCoordinate(value) {
  return value.toFixed(5);
}

function getGeoCoordinates() {
  const latitude = parseCoordinate(geoLatitude.value);
  const longitude = parseCoordinate(geoLongitude.value);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function coordKey(row, column) {
  return `${row},${column}`;
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

function escapeWifiValue(value) {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

function getSelectedErrorLevel() {
  return ERROR_LEVELS[Number.parseInt(errorCorrection.value, 10)] ?? ERROR_LEVELS[1];
}

function getCurrentEncodingMode() {
  return modeAuto.checked ? undefined : encodingMode.value;
}

function formatWidthLabel() {
  const minimumWidth = Number.parseInt(qrWidth.min, 10) || 1;
  if (qrWidthAuto.checked) {
    qrWidthValue.textContent = `${renderedQrWidth ?? minimumWidth} px · ${renderedQrModuleScale ?? qrScale.value} px/module`;
    return;
  }

  const targetWidth = Number.parseInt(qrWidth.value, 10) || minimumWidth;
  qrWidthValue.textContent = `${targetWidth} px · ${renderedQrModuleScale ?? qrScale.value} px/module`;
}

function formatScaleLabel() {
  qrScaleValue.textContent = qrScale.value;
}

function formatMarginLabel() {
  qrMarginValue.textContent = qrMargin.value;
}

function formatColorTransparency() {
  colorDarkTransparencyValue.textContent = `${colorDarkTransparency.value}%`;
  colorLightTransparencyValue.textContent = `${colorLightTransparency.value}%`;
  colorGradientEndTransparencyValue.textContent = `${colorGradientEndTransparency.value}%`;
}

function syncGradientControls() {
  const isGradient = gradientType.value !== 'solid';
  gradientControls.hidden = !isGradient;
  gradientAngleControls.hidden = gradientType.value !== 'linear';
  gradientAngleValue.textContent = `${gradientAngle.value} degrees`;
}

function getCurrentGradientOptions() {
  return {
    type: gradientType.value,
    angle: readInteger(gradientAngle) ?? 0,
    endColor: colorWithTransparency(colorGradientEnd.value.trim() || '#0f766e', colorGradientEndTransparency),
  };
}

function shortenFrameValue(value, maximumLength = 64) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maximumLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maximumLength - 3)).trimEnd()}...`;
}

function getShortTextFrameValue(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  try {
    const url = new URL(normalized);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const host = url.host.replace(/^www\./i, '');
      const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
      return shortenFrameValue(`${host}${path}`);
    }
  } catch (error) {
    // Plain text and incomplete URLs fall through to a compact text label.
  }

  const domainLikeValue = normalized.match(/^(?:https?:\/\/)?(?:www\.)?([^\s?#]+)(?:[?#].*)?$/i);
  return shortenFrameValue(domainLikeValue ? domainLikeValue[1].replace(/\/$/, '') : normalized);
}

function getAutomaticFrameMessage() {
  switch (qrFormat.value) {
    case 'text':
      return getShortTextFrameValue(textInput.value);
    case 'wifi':
      return shortenFrameValue(wifiSsid.value);
    case 'email':
      return shortenFrameValue(emailTo.value);
    case 'phone':
      return shortenFrameValue(phoneNumber.value);
    case 'sms':
      return shortenFrameValue(smsNumber.value);
    case 'geo':
      return shortenFrameValue(
        geoQuery.value || (geoLatitude.value && geoLongitude.value ? `${geoLatitude.value}, ${geoLongitude.value}` : '')
      );
    case 'vcard':
      return shortenFrameValue(vcardName.value || vcardOrg.value || vcardEmail.value);
    case 'file':
      return shortenFrameValue(getActiveFile()?.name || '');
    default:
      return '';
  }
}

function getCurrentFrameMessage() {
  const isCustom = frameMessageMode.value === 'custom';
  customFrameMessageField.hidden = !isCustom;

  return (
    frameMessageMode.value === 'none'
      ? ''
      : isCustom
        ? shortenFrameValue(customFrameMessage.value, 80)
        : getAutomaticFrameMessage()
  );
}

function syncModuleShapeControls() {
  const isCustom = moduleShape.value === 'custom';
  moduleCustomControls.hidden = !isCustom;
  moduleRoundingValue.textContent = `${moduleRounding.value}%`;
  moduleInsetValue.textContent = `${moduleInset.value}%`;
  moduleRotationValue.textContent = `${moduleRotation.value} degrees`;
}

function getCurrentModuleShapeOptions() {
  return {
    type: moduleShape.value,
    rounding: readInteger(moduleRounding) ?? 25,
    inset: readInteger(moduleInset) ?? 4,
    rotation: readInteger(moduleRotation) ?? 0,
  };
}

function syncEyeShapeControls() {
  eyeCustomControls.hidden = eyeShape.value !== 'custom';
  eyeOuterRoundingValue.textContent = `${eyeOuterRounding.value}%`;
  eyeCenterRoundingValue.textContent = `${eyeCenterRounding.value}%`;
}

function getCurrentEyeShapeOptions() {
  return {
    type: eyeShape.value,
    outerRounding: readInteger(eyeOuterRounding) ?? 20,
    centerRounding: readInteger(eyeCenterRounding) ?? 35,
  };
}

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
  pixelArtSizeValue.textContent = `${pixelArtSize} x ${pixelArtSize}`;
  syncEmojiSelection();
}

function syncPixelArtCell(cell) {
  const index = Number.parseInt(cell.dataset.pixelIndex, 10);
  const color = pixelArtPixels[index];
  cell.classList.toggle('is-painted', Boolean(color));
  if (color) {
    cell.style.setProperty('--pixel-color', color);
  } else {
    cell.style.removeProperty('--pixel-color');
  }
  cell.setAttribute('aria-pressed', String(Boolean(color)));
}

function syncPixelArtGrid() {
  pixelArtGrid.querySelectorAll('.pixel-art-cell').forEach(syncPixelArtCell);
}

function syncPixelArtPalette() {
  pixelArtPalette.querySelectorAll('.pixel-palette-button').forEach((button) => {
    const color = button.dataset.pixelColor || null;
    const isActive = color === activePixelPaintColor;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  pixelArtColor.classList.toggle(
    'is-active',
    Boolean(activePixelPaintColor) && !EGA_COLORS.some(([, color]) => color === activePixelPaintColor)
  );
}

function ensurePixelArtPalette() {
  if (pixelArtPalette.childElementCount) {
    return;
  }

  const paletteEntries = [['Transparent / eraser', null], ...EGA_COLORS];
  const fragment = document.createDocumentFragment();
  paletteEntries.forEach(([label, color]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pixel-palette-button${color ? '' : ' is-eraser'}`;
    button.dataset.pixelColor = color || '';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', 'false');
    if (color) {
      button.style.setProperty('--palette-color', color);
    }
    fragment.append(button);
  });
  pixelArtPalette.append(fragment);
  syncPixelArtPalette();
}

function schedulePixelArtRender() {
  if (pixelRenderFrame) {
    return;
  }
  pixelRenderFrame = window.requestAnimationFrame(() => {
    pixelRenderFrame = 0;
    renderQr();
  });
}

function paintPixelArtCell(cell) {
  if (!cell?.classList.contains('pixel-art-cell')) {
    return;
  }
  const index = Number.parseInt(cell.dataset.pixelIndex, 10);
  if (!Number.isInteger(index) || pixelArtPixels[index] === pixelPaintValue) {
    return;
  }
  pixelArtPixels[index] = pixelPaintValue;
  syncPixelArtCell(cell);
  schedulePixelArtRender();
}

function ensurePixelArtGrid() {
  if (pixelArtGrid.childElementCount) {
    return;
  }
  pixelArtGrid.style.setProperty('--pixel-grid-size', String(pixelArtSize));
  pixelArtGrid.setAttribute('aria-label', `${pixelArtSize} by ${pixelArtSize} pixel art editor`);
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < pixelArtSize * pixelArtSize; index += 1) {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'pixel-art-cell';
    cell.dataset.pixelIndex = String(index);
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Pixel ${index + 1}`);
    cell.setAttribute('aria-pressed', 'false');
    fragment.append(cell);
  }
  pixelArtGrid.append(fragment);
}

function resizePixelArt(nextSize) {
  const normalizedSize = Math.min(32, Math.max(8, nextSize - (nextSize % 2)));
  if (normalizedSize === pixelArtSize) {
    return;
  }

  const previousSize = pixelArtSize;
  const previousPixels = pixelArtPixels;
  const resizedPixels = Array(normalizedSize * normalizedSize).fill(null);
  for (let row = 0; row < normalizedSize; row += 1) {
    for (let column = 0; column < normalizedSize; column += 1) {
      const sourceRow = Math.min(previousSize - 1, Math.floor((row * previousSize) / normalizedSize));
      const sourceColumn = Math.min(previousSize - 1, Math.floor((column * previousSize) / normalizedSize));
      resizedPixels[row * normalizedSize + column] = previousPixels[sourceRow * previousSize + sourceColumn];
    }
  }

  pixelArtSize = normalizedSize;
  pixelArtPixels = resizedPixels;
  pixelArtGrid.replaceChildren();
  ensurePixelArtGrid();
  syncPixelArtGrid();
  pixelArtSizeValue.textContent = `${pixelArtSize} x ${pixelArtSize}`;
}

function colorWithTransparency(color, transparencyInput) {
  const normalizedColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#000000';
  const transparency = Math.min(100, Math.max(0, Number.parseInt(transparencyInput.value, 10) || 0));
  const alpha = Math.round(255 * (1 - transparency / 100));
  return `${normalizedColor}${alpha.toString(16).padStart(2, '0')}`;
}

function getColorAlpha(color) {
  if (color === 'transparent') {
    return 0;
  }
  if (/^#[0-9a-f]{8}$/i.test(color)) {
    return Number.parseInt(color.slice(7, 9), 16) / 255;
  }
  return 1;
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
  getCurrentFrameMessage();
  syncModuleShapeControls();
  syncEyeShapeControls();
  syncCenterArtworkControls();
  formatVersionLabel();
  formatErrorCorrection();
  qrVersion.disabled = versionAuto.checked;
  encodingMode.disabled = modeAuto.checked;
  syncEmailBodyLengthHint();
  syncFileCapacityHint();
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function getSelectedFileEncodingMode() {
  return fileEncodingMode.value || 'data';
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

function syncChunkPreviewNavigation() {
  const isChunkedFile = qrFormat.value === 'file' && getSelectedFileEncodingMode() === 'chunked';
  const total = Number.parseInt(fileChunkIndex.max, 10) || 1;
  const current = Math.min(Number.parseInt(fileChunkIndex.value, 10) || 1, total);
  const shouldShowNavigation = isChunkedFile && total > 1;

  chunkPreviewNav.classList.toggle('has-navigation', shouldShowNavigation);
  chunkPreviewStatus.hidden = !shouldShowNavigation;
  chunkPreviewStatus.textContent = `${current} of ${total}`;
  chunkPreviewPrev.hidden = !shouldShowNavigation;
  chunkPreviewNext.hidden = !shouldShowNavigation;
  chunkPreviewPrev.disabled = !shouldShowNavigation || current <= 1;
  chunkPreviewNext.disabled = !shouldShowNavigation || current >= total;
}

function getChunkCapacityCacheKey(file, options, configuredChunkVersion, autoVersion) {
  return JSON.stringify({
    file: file
      ? {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        }
      : null,
    options,
    configuredChunkVersion,
    autoVersion,
    includeManifest: fileIncludeManifest.checked,
    compressTransfer: isTransferCompressionEnabled(),
    customMetadata: fileCustomMetadata.value.trim(),
    transferBytes: cachedTransferBytes?.length ?? null,
    manualMode: getCurrentEncodingMode() || 'auto',
  });
}

function invalidateChunkCapacityCache() {
  cachedChunkCapacityInfoKey = '';
  cachedChunkCapacityInfoValue = null;
}

function resetTransferDerivedState() {
  transferSettingsRevision += 1;
  cachedFileHash = '';
  cachedFileManifest = null;
  cachedTransferBytes = null;
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

function revokeCachedObjectUrl() {
  if (cachedFileObjectUrl) {
    URL.revokeObjectURL(cachedFileObjectUrl);
    cachedFileObjectUrl = '';
  }
}

function resetCachedFileState({ clearInput = false } = {}) {
  transferSettingsRevision += 1;
  revokeCachedObjectUrl();
  cachedFile = null;
  cachedFilePayload = '';
  cachedFileArrayBuffer = null;
  cachedFileBase64 = '';
  cachedFileId = '';
  cachedFileHash = '';
  cachedFileManifest = null;
  cachedTransferBytes = null;
  invalidateChunkCapacityCache();
  if (clearInput) {
    fileInput.value = '';
  }
}

function getActiveFile() {
  return fileInput.files?.[0] ?? null;
}

function ensureFileCacheOwnership(file) {
  if (cachedFile !== file) {
    resetCachedFileState();
    cachedFile = file;
    cachedFileId = createCompactFileId();
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBase64Url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBase64(base64Url) {
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4 || 4)) % 4;
  return `${normalized}${'='.repeat(paddingLength)}`;
}

function createCompactFileId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64ToBase64Url(arrayBufferToBase64(bytes.buffer));
}

async function getActiveFileBuffer() {
  const file = getActiveFile();
  if (!file) {
    return null;
  }

  ensureFileCacheOwnership(file);

  if (!cachedFileArrayBuffer) {
    cachedFileArrayBuffer = await file.arrayBuffer();
  }

  return cachedFileArrayBuffer;
}

async function getActiveFileBase64() {
  const buffer = await getActiveFileBuffer();
  if (!buffer) {
    return '';
  }

  if (!cachedFileBase64) {
    cachedFileBase64 = arrayBufferToBase64(buffer);
  }

  return cachedFileBase64;
}

async function getTransferFileBytes() {
  const settingsRevision = transferSettingsRevision;
  const buffer = await getActiveFileBuffer();
  if (!buffer) {
    return null;
  }

  if (cachedTransferBytes) {
    return cachedTransferBytes;
  }

  const originalBytes = new Uint8Array(buffer);
  if (!isTransferCompressionEnabled()) {
    cachedTransferBytes = originalBytes;
    return cachedTransferBytes;
  }

  if (typeof CompressionStream !== 'function') {
    throw new Error('Gzip transfer compression is not supported by this browser. Turn compression off to continue.');
  }

  const stream = new Blob([originalBytes]).stream().pipeThrough(new CompressionStream('gzip'));
  const compressedBytes = new Uint8Array(await new Response(stream).arrayBuffer());
  if (settingsRevision === transferSettingsRevision) {
    cachedTransferBytes = compressedBytes;
  }
  return compressedBytes;
}

async function getTransferIntegrityHash(manifest, transferBytes) {
  if (cachedFileHash) {
    return cachedFileHash;
  }

  const settingsRevision = transferSettingsRevision;
  const canonicalBytes = new Uint8Array(manifest.length + transferBytes.length);
  canonicalBytes.set(manifest, 0);
  canonicalBytes.set(transferBytes, manifest.length);
  const digest = await crypto.subtle.digest('SHA-256', canonicalBytes);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (settingsRevision === transferSettingsRevision) {
    cachedFileHash = hash;
  }
  return hash;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function getCustomMetadataText({ validate = false } = {}) {
  const value = fileCustomMetadata.value.trim();
  if (!value) {
    return '';
  }

  try {
    return JSON.stringify(JSON.parse(value));
  } catch (error) {
    if (validate) {
      throw new Error('Custom file metadata must be valid JSON.');
    }
    return value;
  }
}

function uint64Bytes(value) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(Math.max(0, value || 0)), false);
  return bytes;
}

function createManifestField(type, value) {
  return { type, value };
}

function getManifestFields(file, { validationValue = new Uint8Array(32) } = {}) {
  const encoder = new TextEncoder();
  const fields = [
    createManifestField(FILE_MANIFEST_FIELDS.name, encoder.encode(file?.name || 'file.bin')),
    createManifestField(FILE_MANIFEST_FIELDS.mimeType, encoder.encode(file?.type?.trim() || 'application/octet-stream')),
    createManifestField(FILE_MANIFEST_FIELDS.modifiedAt, uint64Bytes(file?.lastModified || 0)),
    createManifestField(FILE_MANIFEST_FIELDS.originalSize, uint64Bytes(file?.size || 0)),
    createManifestField(FILE_MANIFEST_FIELDS.validationType, encoder.encode('SHA-256')),
    createManifestField(FILE_MANIFEST_FIELDS.validationValue, validationValue),
  ];

  const customMetadata = getCustomMetadataText();
  if (customMetadata) {
    fields.push(createManifestField(FILE_MANIFEST_FIELDS.customMetadata, encoder.encode(customMetadata)));
  }

  return fields;
}

function getManifestByteLength(file) {
  if (!fileIncludeManifest.checked) {
    return 0;
  }
  return getManifestFields(file).reduce(
    (length, field) => length + FILE_TLV_HEADER_BYTES + field.value.length,
    FILE_MANIFEST_HEADER_BYTES
  );
}

function serializeManifest(fields) {
  const manifestLength = fields.reduce(
    (length, field) => length + FILE_TLV_HEADER_BYTES + field.value.length,
    FILE_MANIFEST_HEADER_BYTES
  );
  const manifest = new Uint8Array(manifestLength);
  const view = new DataView(manifest.buffer);
  manifest.set(new TextEncoder().encode(FILE_MANIFEST_MAGIC), 0);
  manifest[4] = Number.parseInt(FILE_PROTOCOL_VERSION, 10);
  manifest[5] = isTransferCompressionEnabled() ? FILE_MANIFEST_FLAGS.gzip : 0;
  view.setUint32(6, manifestLength, false);

  let offset = FILE_MANIFEST_HEADER_BYTES;
  fields.forEach((field) => {
    if (field.value.length > 0xffff) {
      throw new Error(`Manifest field ${field.type} exceeds the 65,535-byte limit.`);
    }
    manifest[offset] = field.type;
    view.setUint16(offset + 1, field.value.length, false);
    manifest.set(field.value, offset + FILE_TLV_HEADER_BYTES);
    offset += FILE_TLV_HEADER_BYTES + field.value.length;
  });
  return manifest;
}

async function getActiveFileManifest(transferBytes = null) {
  const settingsRevision = transferSettingsRevision;
  const file = getActiveFile();
  if (!file) {
    return null;
  }

  if (!fileIncludeManifest.checked) {
    return new Uint8Array(0);
  }

  ensureFileCacheOwnership(file);
  if (cachedFileManifest) {
    return cachedFileManifest;
  }

  getCustomMetadataText({ validate: true });
  const bytesToTransfer = transferBytes || (await getTransferFileBytes());
  const canonicalManifest = serializeManifest(getManifestFields(file));
  const validationValue = hexToBytes(await getTransferIntegrityHash(canonicalManifest, bytesToTransfer));
  const manifest = serializeManifest(getManifestFields(file, { validationValue }));
  if (settingsRevision === transferSettingsRevision) {
    cachedFileManifest = manifest;
  }
  return manifest;
}

function getFileObjectUrlPayload(file = getActiveFile()) {
  if (!file) {
    return '';
  }

  ensureFileCacheOwnership(file);
  return `${getShareableAppUrl()}#download=1&name=${encodeURIComponent(file.name)}&type=${encodeURIComponent(
    file.type?.trim() || 'application/octet-stream'
  )}&data=[base64url]`;
}

function syncSmsLengthHint() {
  smsLengthHint.textContent = `${smsBody.value.length} / ${SMS_MAX_LENGTH}`;
}

function syncWifiSecurityState() {
  const isOpenNetwork = wifiEncryption.value === 'nopass';
  wifiPassword.disabled = isOpenNetwork;
  wifiPassword.setAttribute('aria-disabled', String(isOpenNetwork));
  wifiPassword.placeholder = isOpenNetwork ? 'Not used for open networks' : 'Password';
}

function setFormatVisibility() {
  const activeFormat = qrFormat.value;
  formatFieldsets.forEach((fieldset) => {
    const isActive = fieldset.dataset.formatFields === activeFormat;
    fieldset.hidden = !isActive;
    fieldset.classList.toggle('is-active', isActive);
    fieldset.setAttribute('aria-hidden', String(!isActive));
  });

  const showSecretToggle = activeFormat === 'wifi';
  payloadRevealToggle.hidden = !showSecretToggle;
  payloadRevealToggle.setAttribute('aria-hidden', String(!showSecretToggle));
  syncFileModeVisibility();
}

async function readSelectedFile() {
  const file = getActiveFile();
  if (!file) {
    resetCachedFileState();
    return '';
  }

  ensureFileCacheOwnership(file);

  if (cachedFilePayload) {
    return cachedFilePayload;
  }

  const base64 = await getActiveFileBase64();
  cachedFilePayload = `${getFileDataUrlPrefix(file)}${base64}`;
  return cachedFilePayload;
}

function getFileDataUrlPrefix(file = getActiveFile()) {
  const mimeType = file?.type?.trim() || 'application/octet-stream';
  return `data:${mimeType};base64,`;
}

function getCompactFileExtension(value) {
  const sanitized = String(value || '').toUpperCase().replace(/[^A-Z0-9.]/g, '');
  const segments = sanitized.split('.');
  const extension = segments.length > 1 ? segments.pop() : '';
  return (extension || 'BIN').slice(0, 8);
}

function getBase64UrlLength(byteCount) {
  return Math.ceil((Math.max(0, byteCount) * 4) / 3);
}

function encodeStreamPosition(value, streamLength) {
  const width = Math.max(1, Math.max(0, streamLength).toString(10).length);
  return Math.max(0, value).toString(10).padStart(width, '0');
}

function getFrameManifestFlag() {
  return fileIncludeManifest.checked ? 'M' : '-';
}

function buildChunkProtocolPayloadTemplate(byteCount, { file, streamLength = 0, offset = 0 } = {}) {
  const safeFile = file ?? { name: 'file.bin', type: 'application/octet-stream', size: 0, lastModified: 0 };
  // Lowercase forces the same byte-mode capacity used by real base64url data.
  const dataToken = 'a'.repeat(getBase64UrlLength(byteCount));
  return [
    FILE_FRAME_PREFIX,
    FILE_PROTOCOL_VERSION,
    'C',
    getFrameManifestFlag(),
    FILE_ID_FILLER,
    getCompactFileExtension(safeFile.name),
    encodeStreamPosition(offset, streamLength),
    Math.max(0, streamLength).toString(10),
    dataToken,
  ].join(':');
}

function buildSingleFilePayloadTemplate(byteCount, { file } = {}) {
  const safeFile = file ?? { name: 'file.bin' };
  const parts = [
    FILE_FRAME_PREFIX,
    FILE_PROTOCOL_VERSION,
    'S',
    getFrameManifestFlag(),
  ];
  if (!fileIncludeManifest.checked) {
    parts.push(getCompactFileExtension(safeFile.name));
  }
  parts.push('a'.repeat(getBase64UrlLength(byteCount)));
  return parts.join(':');
}

function getFileCapacityBytes() {
  let options;
  try {
    options = buildOptions();
  } catch (error) {
    return 0;
  }

  const prefix = getFileDataUrlPrefix();

  const canEncodeBytes = (byteCount) => {
    const base64Length = Math.ceil(byteCount / 3) * 4;
    const payload = `${prefix}${'A'.repeat(base64Length)}`;

    try {
      const qrPayload = buildPayload(payload);
      QRCode.create(qrPayload, options);
      return true;
    } catch (error) {
      return false;
    }
  };

  if (!canEncodeBytes(0)) {
    return 0;
  }

  let low = 0;
  let high = 256;

  while (high <= 1024 * 1024 && canEncodeBytes(high)) {
    low = high;
    high *= 2;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (canEncodeBytes(middle)) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return low;
}

function getBlobUrlCapacityBytes(file = getActiveFile()) {
  let options;
  try {
    options = buildOptions();
  } catch (error) {
    return 0;
  }

  const fileName = file?.name || 'file.bin';
  const mimeType = file?.type?.trim() || 'application/octet-stream';
  const prefix = `${getShareableAppUrl()}#download=1&name=${encodeURIComponent(fileName)}&type=${encodeURIComponent(
    mimeType
  )}&data=`;

  const canEncodeBytes = (byteCount) => {
    const base64Length = Math.ceil(byteCount / 3) * 4;
    const payload = `${prefix}${base64ToBase64Url('A'.repeat(base64Length))}`;

    try {
      const qrPayload = buildPayload(payload);
      QRCode.create(qrPayload, options);
      return true;
    } catch (error) {
      return false;
    }
  };

  if (!canEncodeBytes(0)) {
    return 0;
  }

  let low = 0;
  let high = 256;

  while (high <= 1024 * 1024 && canEncodeBytes(high)) {
    low = high;
    high *= 2;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (canEncodeBytes(middle)) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return low;
}

function getChunkedFileCapacityInfo(file = getActiveFile()) {
  if (!file) {
    return {
      chunkCapacity: 0,
      naturalChunkCapacity: 0,
      configuredChunkVersion: getConfiguredChunkVersion(),
      autoVersion: versionAuto.checked,
      totalChunks: 1,
      currentChunk: 1,
    };
  }

  let options;
  try {
    options = buildOptions();
  } catch (error) {
    return {
      chunkCapacity: 0,
      naturalChunkCapacity: 0,
      configuredChunkVersion: getConfiguredChunkVersion(),
      autoVersion: versionAuto.checked,
      totalChunks: 1,
      currentChunk: 1,
    };
  }

  const configuredChunkVersion = getConfiguredChunkVersion();
  const autoVersion = versionAuto.checked;
  const capacityOptions = {
    ...options,
    version: configuredChunkVersion,
  };
  const cacheKey = getChunkCapacityCacheKey(file, capacityOptions, configuredChunkVersion, autoVersion);
  if (cachedChunkCapacityInfoKey === cacheKey && cachedChunkCapacityInfoValue) {
    const cachedCurrentChunk = Math.min(Number.parseInt(fileChunkIndex.value, 10) || 1, cachedChunkCapacityInfoValue.totalChunks);
    return {
      ...cachedChunkCapacityInfoValue,
      currentChunk: cachedCurrentChunk,
    };
  }

  const transferByteLength = cachedTransferBytes?.length ?? file.size;
  const streamLength = transferByteLength + getManifestByteLength(file);
  const canEncodeSingleFrame = () => {
    try {
      const payload = buildSingleFilePayloadTemplate(streamLength, { file });
      QRCode.create(buildPayload(payload), capacityOptions);
      return true;
    } catch (error) {
      return false;
    }
  };
  const canEncodeBytes = (byteCount) => {
    try {
      const payload = buildChunkProtocolPayloadTemplate(byteCount, {
        file,
        streamLength,
        offset: Math.max(0, streamLength - 1),
      });
      const qrPayload = buildPayload(payload);
      QRCode.create(qrPayload, capacityOptions);
      return true;
    } catch (error) {
      return false;
    }
  };

  const findCapacity = () => {
    if (!canEncodeBytes(0)) {
      return 0;
    }

    let low = 0;
    let high = 256;

    while (high <= 1024 * 1024 && canEncodeBytes(high)) {
      low = high;
      high *= 2;
    }

    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (canEncodeBytes(middle)) {
        low = middle;
      } else {
        high = middle;
      }
    }

    return low;
  };

  const isSingleFrame = canEncodeSingleFrame();
  const chunkCapacity = isSingleFrame ? streamLength : findCapacity();
  const naturalChunkCapacity = chunkCapacity;
  const totalChunks = isSingleFrame ? 1 : Math.max(1, Math.ceil(streamLength / Math.max(chunkCapacity, 1)));
  const currentChunk = Math.min(Number.parseInt(fileChunkIndex.value, 10) || 1, totalChunks);
  const capacityInfo = {
    chunkCapacity,
    naturalChunkCapacity,
    configuredChunkVersion,
    autoVersion,
    streamLength,
    manifestLength: getManifestByteLength(file),
    transferByteLength,
    isSingleFrame,
    totalChunks,
    currentChunk,
  };
  cachedChunkCapacityInfoKey = cacheKey;
  cachedChunkCapacityInfoValue = capacityInfo;
  return capacityInfo;
}

function syncFileModeVisibility() {
  const isChunked = qrFormat.value === 'file' && getSelectedFileEncodingMode() === 'chunked';
  fileChunkControls.hidden = !isChunked;
  fileChunkControls.setAttribute('aria-hidden', String(!isChunked));

  const { totalChunks, currentChunk } = getChunkedFileCapacityInfo();
  fileChunkVersionAuto.disabled = !isChunked;
  fileIncludeManifest.disabled = !isChunked;
  fileCompressTransfer.disabled = !isChunked || !fileIncludeManifest.checked;
  fileCustomMetadata.disabled = !isChunked || !fileIncludeManifest.checked;
  fileChunkIndex.max = String(Math.max(totalChunks, 1));
  fileChunkIndex.value = String(Math.min(currentChunk, totalChunks));
  fileChunkIndex.disabled = !isChunked || totalChunks <= 1;
  syncChunkVersionControls();
  syncFileChunkLabel();
  syncChunkPreviewNavigation();
}

function syncFileCapacityHint() {
  const file = getActiveFile();
  const loadedBytes = file?.size ?? 0;
  const mode = getSelectedFileEncodingMode();

  if (mode === 'blob') {
    const maxBytes = getBlobUrlCapacityBytes(file);
    const percent = maxBytes > 0 ? Math.round((loadedBytes / maxBytes) * 100) : 0;
    fileCapacityHint.textContent = file
      ? `Loaded ${loadedBytes.toLocaleString()} B (${formatBytes(loadedBytes)}) of about ${maxBytes.toLocaleString()} B (${formatBytes(maxBytes)}) max (${percent}%). QR stores a shareable download URL with the file bytes, name, and MIME type.`
      : 'Choose a file to generate a shareable download URL.';
    clearFileButton.disabled = !fileInput.files?.length && !cachedFilePayload;
    syncFileModeVisibility();
    return;
  }

  if (mode === 'chunked') {
    const { chunkCapacity, configuredChunkVersion, autoVersion, totalChunks, currentChunk, streamLength, manifestLength, transferByteLength } = getChunkedFileCapacityInfo(file);
    const currentFrameBytes = Math.max(
      0,
      Math.min(chunkCapacity, streamLength - Math.max(0, currentChunk - 1) * Math.max(chunkCapacity, 1))
    );
    const limitText = autoVersion
      ? `auto-selected uniform V${configuredChunkVersion}`
      : `uniform V${configuredChunkVersion}`;

    fileCapacityHint.textContent = file
      ? `Loaded ${loadedBytes.toLocaleString()} B (${formatBytes(loadedBytes)}); ${isTransferCompressionEnabled() ? `gzip transfer is ${transferByteLength.toLocaleString()} B (${formatBytes(transferByteLength)})` : 'transfer compression is off'}, plus a ${manifestLength.toLocaleString()} B manifest. Frame ${currentChunk} of ${totalChunks} carries ${currentFrameBytes.toLocaleString()} B with ${limitText}; full frames use ${chunkCapacity.toLocaleString()} B (${formatBytes(chunkCapacity)}) of stream capacity.`
      : 'Choose a file to split it into chunked QR payloads.';
    clearFileButton.disabled = !fileInput.files?.length && !cachedFilePayload;
    syncFileModeVisibility();
    return;
  }

  const maxBytes = getFileCapacityBytes();
  const percent = maxBytes > 0 ? Math.round((loadedBytes / maxBytes) * 100) : 0;
  fileCapacityHint.textContent = file
    ? `Loaded ${loadedBytes.toLocaleString()} B (${formatBytes(loadedBytes)}) of ${maxBytes.toLocaleString()} B (${formatBytes(maxBytes)}) max (${percent}%).`
    : 'Choose a file to embed it directly as a data URL.';
  clearFileButton.disabled = !fileInput.files?.length && !cachedFilePayload;
  syncFileModeVisibility();
}

function clearLoadedFile() {
  resetCachedFileState({ clearInput: true });
  fileChunkIndex.value = '1';
  syncFileCapacityHint();
}

async function buildChunkedFilePayload() {
  const file = getActiveFile();
  if (!file) {
    return '';
  }

  ensureFileCacheOwnership(file);

  const settingsRevision = transferSettingsRevision;
  const transferBytes = await getTransferFileBytes();
  if (settingsRevision !== transferSettingsRevision) {
    throw new DOMException('Transfer settings changed.', 'AbortError');
  }
  const manifestBytes = await getActiveFileManifest(transferBytes);
  if (settingsRevision !== transferSettingsRevision) {
    throw new DOMException('Transfer settings changed.', 'AbortError');
  }
  syncFileCapacityHint();
  const { chunkCapacity, totalChunks, streamLength, isSingleFrame } = getChunkedFileCapacityInfo(file);
  if (chunkCapacity <= 0) {
    throw new Error('Unable to fit the current chunk protocol into this QR configuration.');
  }

  const chunkIndex = Math.min(Number.parseInt(fileChunkIndex.value, 10) || 1, totalChunks);
  const start = (chunkIndex - 1) * chunkCapacity;
  const end = Math.min(start + chunkCapacity, streamLength);
  const chunkBytes = new Uint8Array(end - start);
  const manifestStart = Math.min(start, manifestBytes.length);
  const manifestEnd = Math.min(end, manifestBytes.length);
  if (manifestEnd > manifestStart) {
    chunkBytes.set(manifestBytes.subarray(manifestStart, manifestEnd), 0);
  }
  const fileStart = Math.max(0, start - manifestBytes.length);
  const fileEnd = Math.max(0, end - manifestBytes.length);
  if (fileEnd > fileStart) {
    chunkBytes.set(transferBytes.subarray(fileStart, fileEnd), Math.max(0, manifestBytes.length - start));
  }
  const compactExtension = getCompactFileExtension(file.name);
  const chunkDataToken = base64ToBase64Url(arrayBufferToBase64(chunkBytes.buffer));
  if (isSingleFrame) {
    const parts = [
      FILE_FRAME_PREFIX,
      FILE_PROTOCOL_VERSION,
      'S',
      getFrameManifestFlag(),
    ];
    if (!fileIncludeManifest.checked) {
      parts.push(compactExtension);
    }
    parts.push(chunkDataToken);
    return parts.join(':');
  }

  return [
    FILE_FRAME_PREFIX,
    FILE_PROTOCOL_VERSION,
    'C',
    getFrameManifestFlag(),
    cachedFileId || createCompactFileId(),
    compactExtension,
    encodeStreamPosition(start, streamLength),
    streamLength.toString(10),
    chunkDataToken,
  ].join(':');
}

async function buildFilePayload() {
  const file = getActiveFile();
  if (!file) {
    return '';
  }

  switch (getSelectedFileEncodingMode()) {
    case 'blob':
      return `${getFileObjectUrlPayload(file).replace('[base64url]', base64ToBase64Url(await getActiveFileBase64()))}`;
    case 'chunked':
      return buildChunkedFilePayload();
    case 'data':
    default:
      return readSelectedFile();
  }
}

function buildWifiPayload() {
  const encryption = wifiEncryption.value;
  const segments = [
    `T:${encryption}`,
    `S:${escapeWifiValue(wifiSsid.value.trim())}`,
  ];

  if (encryption !== 'nopass') {
    segments.push(`P:${escapeWifiValue(wifiPassword.value)}`);
  }

  if (wifiHidden.checked) {
    segments.push('H:true');
  }

  return `WIFI:${segments.join(';')};;`;
}

function maskWifiPayload(payload) {
  if (payloadRevealSecrets.checked) {
    return payload;
  }

  return payload.replace(/P:([^;]*)/, 'P:[hidden-password]');
}

function placeholderValue(value, placeholder) {
  return value.trim() || placeholder;
}

function normalizePhoneNumber(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function formatPhoneNumberForDisplay(value, format) {
  const normalized = normalizePhoneNumber(value);
  if (!normalized) {
    return value.trim();
  }

  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const local = digits.slice(1);
    const area = local.slice(0, 3);
    const prefix = local.slice(3, 6);
    const line = local.slice(6, 10);

    if (format === 'usa') {
      return `(${area}) ${prefix}-${line}`;
    }

    if (format === 'international') {
      return `+1 ${area}-${prefix}-${line}`;
    }
  }

  if (format === 'digits') {
    return digits;
  }

  return normalized;
}

function applyPhoneFormatToInput(inputElement) {
  const formatted = formatPhoneNumberForDisplay(inputElement.value, activePhoneFormat);
  if (formatted) {
    inputElement.value = formatted;
  }
}

function syncPhoneFormatButtons() {
  phoneFormatButtons.forEach((button) => {
    const isActive = button.dataset.phoneFormat === activePhoneFormat;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function syncPhoneValues(sourceInput, targetInput) {
  if (targetInput.value !== sourceInput.value) {
    targetInput.value = sourceInput.value;
  }
}

function syncPhoneValuesAcrossAll(sourceInput) {
  [phoneNumber, smsNumber, vcardPhone].forEach((inputElement) => {
    if (inputElement !== sourceInput && inputElement.value !== sourceInput.value) {
      inputElement.value = sourceInput.value;
    }
  });
}

function syncEmailValuesAcrossAll(sourceInput) {
  [emailTo, vcardEmail].forEach((inputElement) => {
    if (inputElement !== sourceInput && inputElement.value !== sourceInput.value) {
      inputElement.value = sourceInput.value;
    }
  });
}

function syncMessageValuesAcrossAll(sourceInput) {
  [textInput, smsBody, emailBody].forEach((inputElement) => {
    if (inputElement !== sourceInput && inputElement.value !== sourceInput.value) {
      inputElement.value = sourceInput.value;
    }
  });
}

function buildEmailPayload() {
  return buildEmailPayloadWithBody(emailBody.value);
}

function buildEmailPayloadWithBody(bodyValue) {
  const params = new URLSearchParams();
  if (emailSubject.value.trim()) {
    params.set('subject', emailSubject.value.trim());
  }
  if (bodyValue.trim()) {
    params.set('body', bodyValue.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `mailto:${emailTo.value.trim()}${suffix}`;
}

function buildGeoPayload() {
  const latitude = geoLatitude.value.trim();
  const longitude = geoLongitude.value.trim();
  const query = geoQuery.value.trim();
  const coords = `${latitude},${longitude}`;
  return query ? `geo:${coords}?q=${encodeURIComponent(query)}` : `geo:${coords}`;
}

function ensureGeoMap() {
  if (geoMap || typeof L === 'undefined') {
    return;
  }

  geoMap = L.map(geoMapElement, {
    zoomControl: true,
    attributionControl: true,
  }).setView([38.9182, -78.1944], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(geoMap);

  geoMarker = L.marker([20, 0]).addTo(geoMap);
  geoPopup = geoMarker.bindPopup('');
  geoLabelMarker = L.marker([20, 0], {
    interactive: false,
    keyboard: false,
    opacity: 0,
    icon: L.divIcon({
      className: 'geo-label-marker',
      html: '',
      iconSize: null,
    }),
  }).addTo(geoMap);

  geoMap.on('click', (event) => {
    const { lat, lng } = event.latlng;
    geoLatitude.value = formatCoordinate(lat);
    geoLongitude.value = formatCoordinate(lng);
    renderQr();
  });
}

function updateGeoMap() {
  if (qrFormat.value !== 'geo') {
    return;
  }

  if (typeof L === 'undefined') {
    return;
  }

  ensureGeoMap();

  const coordinates = getGeoCoordinates();
  const label = geoQuery.value.trim();

  if (!coordinates) {
    if (geoMarker) {
      geoMarker.setOpacity(0);
    }
    if (geoLabelMarker) {
      geoLabelMarker.setOpacity(0);
    }
    geoMap.setView([38.9182, -78.1944], 13);
    return;
  }

  const { latitude, longitude } = coordinates;
  geoMarker.setLatLng([latitude, longitude]);
  geoMarker.setOpacity(1);

  const popupText = label || `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;
  geoMarker.bindPopup(popupText);

  if (geoLabelMarker) {
    geoLabelMarker.setLatLng([latitude, longitude]);
    geoLabelMarker.setOpacity(label ? 1 : 0);
    geoLabelMarker.setIcon(
      L.divIcon({
        className: 'geo-label-marker',
        html: label ? `<span>${label}</span>` : '',
        iconSize: null,
      })
    );
  }

  const currentZoom = geoMap.getZoom();
  const targetZoom = currentZoom < 15 ? 15 : currentZoom;
  geoMap.setView([latitude, longitude], targetZoom, { animate: false });
  geoMap.invalidateSize();
}

function buildVCardPayload() {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vcardName.value.trim()}`,
  ];

  if (vcardOrg.value.trim()) {
    lines.push(`ORG:${vcardOrg.value.trim()}`);
  }
  if (vcardTitle.value.trim()) {
    lines.push(`TITLE:${vcardTitle.value.trim()}`);
  }
  if (vcardPhone.value.trim()) {
    lines.push(`TEL:${vcardPhone.value.trim()}`);
  }
  if (vcardEmail.value.trim()) {
    lines.push(`EMAIL:${vcardEmail.value.trim()}`);
  }
  if (vcardUrl.value.trim()) {
    lines.push(`URL:${vcardUrl.value.trim()}`);
  }

  lines.push('END:VCARD');
  return lines.join('\n');
}

async function buildEncodedText() {
  switch (qrFormat.value) {
    case 'text':
      return textInput.value;
    case 'wifi':
      return buildWifiPayload();
    case 'email':
      return buildEmailPayload();
    case 'phone':
      return normalizePhoneNumber(phoneNumber.value) ? `tel:${normalizePhoneNumber(phoneNumber.value)}` : '';
    case 'sms':
      if (!smsNumber.value.trim() && !smsBody.value.trim()) {
        return '';
      }
      return `SMSTO:${normalizePhoneNumber(smsNumber.value)}:${smsBody.value}`;
    case 'geo':
      if (!geoLatitude.value.trim() || !geoLongitude.value.trim()) {
        return '';
      }
      return buildGeoPayload();
    case 'vcard':
      return buildVCardPayload();
    case 'file':
      return buildFilePayload();
    default:
      return '';
  }
}

function buildEncodedPreviewTemplate() {
  switch (qrFormat.value) {
    case 'text':
      return textInput.value || '[enter text or a URL]';
    case 'wifi': {
      const encryption = wifiEncryption.value || 'WPA';
      const ssid = escapeWifiValue(placeholderValue(wifiSsid.value, '[network-name]'));
      const password =
        encryption === 'nopass'
          ? ''
          : escapeWifiValue(placeholderValue(wifiPassword.value, '[password]'));
      const segments = [`T:${encryption}`, `S:${ssid}`];
      if (encryption !== 'nopass') {
        segments.push(`P:${password}`);
      }
      if (wifiHidden.checked) {
        segments.push('H:true');
      }
      return `WIFI:${segments.join(';')};;`;
    }
    case 'email': {
      const to = placeholderValue(emailTo.value, '[recipient@example.com]');
      const params = new URLSearchParams();
      params.set('subject', placeholderValue(emailSubject.value, '[subject]'));
      params.set('body', placeholderValue(emailBody.value, '[message]'));
      return `mailto:${to}?${params.toString()}`;
    }
    case 'phone':
      return `tel:${normalizePhoneNumber(phoneNumber.value) || '[phone-number]'}`;
    case 'sms':
      return `SMSTO:${normalizePhoneNumber(smsNumber.value) || '[phone-number]'}:${placeholderValue(
        smsBody.value,
        '[message]'
      )}`;
    case 'geo': {
      const latitude = placeholderValue(geoLatitude.value, '[latitude]');
      const longitude = placeholderValue(geoLongitude.value, '[longitude]');
      const query = geoQuery.value.trim();
      return query
        ? `geo:${latitude},${longitude}?q=${encodeURIComponent(query)}`
        : `geo:${latitude},${longitude}`;
    }
    case 'vcard': {
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${placeholderValue(vcardName.value, '[full-name]')}`,
        `ORG:${placeholderValue(vcardOrg.value, '[organization]')}`,
        `TITLE:${placeholderValue(vcardTitle.value, '[title]')}`,
        `TEL:${placeholderValue(vcardPhone.value, '[phone-number]')}`,
        `EMAIL:${placeholderValue(vcardEmail.value, '[email]')}`,
        `URL:${placeholderValue(vcardUrl.value, '[website]')}`,
        'END:VCARD',
      ];
      return lines.join('\n');
    }
    case 'file': {
      const file = getActiveFile();
      const mode = getSelectedFileEncodingMode();
      if (!file) {
        return mode === 'chunked'
          ? 'FILE:1:S:M:[base64url-data]'
          : mode === 'blob'
            ? '[shareable download URL]'
            : '[data URL for a selected file]';
      }

      if (mode === 'blob') {
        return `[shareable download URL for ${file.name}]`;
      }

      if (mode === 'chunked') {
        const { chunkCapacity, currentChunk, streamLength, isSingleFrame } = getChunkedFileCapacityInfo(file);
        if (isSingleFrame) {
          return fileIncludeManifest.checked
            ? 'FILE:1:S:M:[base64url-data]'
            : `FILE:1:S:-:${getCompactFileExtension(file.name)}:[base64url-data]`;
        }
        const offset = Math.max(0, currentChunk - 1) * chunkCapacity;
        return `FILE:1:C:${getFrameManifestFlag()}:[base64url-id]:${getCompactFileExtension(file.name)}:${encodeStreamPosition(offset, streamLength)}:${streamLength.toString(10)}:[base64url-data]`;
      }

      return `[data URL for ${file.name}]`;
    }
    default:
      return '';
  }
}

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

  const mode = getCurrentEncodingMode();
  if (!mode || !encodedText.trim()) {
    return encodedText;
  }

  return [{ data: encodedText, mode }];
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
      QRCode.create(payload, options);
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

function validateEmailValue(value, { required = true, label = 'email address' } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Not valid for Email format yet: ${label} is required.` : '';
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return `Not valid for Email format yet: ${label} must be valid.`;
  }

  if (trimmed.length > 254) {
    return `Not valid for Email format yet: ${label} should stay within 254 characters.`;
  }

  return '';
}

function validatePrintableText(value, { label, maxLength }) {
  const trimmedLength = value.length;
  if (trimmedLength > maxLength) {
    return `${label} should stay within ${maxLength} characters.`;
  }

  if (!PRINTABLE_TEXT_PATTERN.test(value)) {
    return `${label} can only use printable characters.`;
  }

  return '';
}

function validateTelephoneValue(value, { required = true, label = 'telephone number' } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Not valid for Phone format yet: ${label} is required.` : '';
  }

  const allowedPattern = /^\+?[\d\s().-]+$/;
  if (!allowedPattern.test(trimmed)) {
    return `Not valid for Phone format yet: ${label} can only use digits, spaces, parentheses, periods, hyphens, and an optional leading +.`;
  }

  const plusCount = [...trimmed].filter((character) => character === '+').length;
  if (plusCount > 1 || (plusCount === 1 && !trimmed.startsWith('+'))) {
    return `Not valid for Phone format yet: ${label} can only use + at the beginning.`;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return `Not valid for Phone format yet: ${label} should contain a reasonable length of 10 to 15 digits.`;
  }

  return '';
}

function validateGeoLabel(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length > 80) {
    return 'Not valid for Geo format yet: label should stay within 80 characters.';
  }

  const allowedPattern = /^[A-Za-z0-9 .,&#()'/:+-]*$/;
  if (!allowedPattern.test(trimmed)) {
    return 'Not valid for Geo format yet: label can only use letters, numbers, spaces, and common punctuation.';
  }

  return '';
}

function validateVCardTextValue(value, { required = false, label, maxLength = 80 } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `Not valid for vCard format yet: ${label} is required.` : '';
  }

  if (trimmed.length > maxLength) {
    return `Not valid for vCard format yet: ${label} should stay within ${maxLength} characters.`;
  }

  if (!VCARD_TEXT_PATTERN.test(trimmed)) {
    return `Not valid for vCard format yet: ${label} can only use letters, numbers, spaces, and common punctuation.`;
  }

  return '';
}

function getWebsiteValidationState(value, { required = false, contextLabel = 'vCard' } = {}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      error: required ? `Not valid for ${contextLabel} format yet: website is required.` : '',
      warning: '',
    };
  }

  if (trimmed.length > 2048) {
    return {
      error: `Not valid for ${contextLabel} format yet: website should stay within 2048 characters.`,
      warning: '',
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch (error) {
    return {
      error: `Not valid for ${contextLabel} format yet: website must include a full protocol such as https://.`,
      warning: '',
    };
  }

  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    return {
      error: `Not valid for ${contextLabel} format yet: website should start with https:// or http://.`,
      warning: '',
    };
  }

  return {
    error: '',
    warning:
      parsedUrl.protocol === 'http:'
        ? `Warning for ${contextLabel} format: website uses http://. https:// is strongly recommended.`
        : '',
  };
}

function getFormatValidationState() {
  if (qrFormat.value === 'file') {
    const file = getActiveFile();
    if (!file) {
      return {
        error: 'Not valid for File format yet: choose a file to encode.',
        warning: '',
      };
    }

    if (getSelectedFileEncodingMode() === 'blob') {
      return {
        error: '',
        warning: 'Warning for File format: this shareable download URL embeds the file bytes directly, so larger files will hit QR capacity quickly.',
      };
    }

    if (getSelectedFileEncodingMode() === 'chunked') {
      const { totalChunks } = getChunkedFileCapacityInfo(file);
      return {
        error: '',
        warning:
          totalChunks > 1
            ? `Warning for File format: this compact FILE stream is split across ${totalChunks} QR codes. Each scan needs the same file ID plus every chunk to reconstruct the file.`
            : '',
      };
    }

    return { error: '', warning: '' };
  }

  if (qrFormat.value === 'email') {
    const emailValidationMessage = validateEmailValue(emailTo.value, {
      label: 'recipient email address',
    });
    if (emailValidationMessage) {
      return {
        error: emailValidationMessage,
        warning: '',
      };
    }

    const subjectValidationMessage = validatePrintableText(emailSubject.value, {
      label: 'Not valid for Email format yet: subject',
      maxLength: EMAIL_SUBJECT_MAX_LENGTH,
    });
    if (subjectValidationMessage) {
      return {
        error: subjectValidationMessage,
        warning: '',
      };
    }

    const emailBodyValidationMessage = validatePrintableText(emailBody.value, {
      label: 'Not valid for Email format yet: body',
      maxLength: Math.max(getEmailBodyCapacityInfo().max, 0),
    });
    if (emailBodyValidationMessage) {
      return {
        error: emailBodyValidationMessage,
        warning: '',
      };
    }

    const { current, max } = getEmailBodyCapacityInfo();
    if (current > max) {
      return {
        error: `Not valid for Email format yet: body exceeds the current QR capacity (${current} / ${max}).`,
        warning: '',
      };
    }

    return {
      error: '',
      warning: '',
    };
  }

  if (qrFormat.value === 'phone') {
    return {
      error: validateTelephoneValue(phoneNumber.value),
      warning: '',
    };
  }

  if (qrFormat.value === 'sms') {
    const phoneValidationMessage = validateTelephoneValue(smsNumber.value, {
      label: 'SMS phone number',
    });
    if (phoneValidationMessage) {
      return {
        error: phoneValidationMessage.replace('Phone format', 'SMS format'),
        warning: '',
      };
    }

    if (smsBody.value.length > 160) {
      return {
        error: `Not valid for SMS format yet: message should stay at ${SMS_MAX_LENGTH} characters or fewer for broad SMS compatibility.`,
        warning: '',
      };
    }
  }

  if (qrFormat.value === 'geo') {
    const latitudeText = geoLatitude.value.trim();
    const longitudeText = geoLongitude.value.trim();

    if (!latitudeText) {
      return { error: 'Not valid for Geo format yet: latitude is required.', warning: '' };
    }

    if (!longitudeText) {
      return { error: 'Not valid for Geo format yet: longitude is required.', warning: '' };
    }

    const latitude = parseCoordinate(latitudeText);
    if (latitude === null) {
      return { error: 'Not valid for Geo format yet: latitude must be a valid number.', warning: '' };
    }

    const longitude = parseCoordinate(longitudeText);
    if (longitude === null) {
      return { error: 'Not valid for Geo format yet: longitude must be a valid number.', warning: '' };
    }

    if (latitude < -90 || latitude > 90) {
      return { error: 'Not valid for Geo format yet: latitude must be between -90 and 90.', warning: '' };
    }

    if (longitude < -180 || longitude > 180) {
      return { error: 'Not valid for Geo format yet: longitude must be between -180 and 180.', warning: '' };
    }

    const labelValidationMessage = validateGeoLabel(geoQuery.value);
    if (labelValidationMessage) {
      return { error: labelValidationMessage, warning: '' };
    }
  }

  if (qrFormat.value === 'vcard') {
    const nameValidationMessage = validateVCardTextValue(vcardName.value, {
      required: true,
      label: 'full name',
    });
    if (nameValidationMessage) {
      return { error: nameValidationMessage, warning: '' };
    }

    const organizationValidationMessage = validateVCardTextValue(vcardOrg.value, {
      label: 'organization',
    });
    if (organizationValidationMessage) {
      return { error: organizationValidationMessage, warning: '' };
    }

    const titleValidationMessage = validateVCardTextValue(vcardTitle.value, {
      label: 'title',
    });
    if (titleValidationMessage) {
      return { error: titleValidationMessage, warning: '' };
    }

    const phoneValidationMessage = validateTelephoneValue(vcardPhone.value, {
      required: false,
      label: 'vCard phone number',
    });
    if (phoneValidationMessage) {
      return { error: phoneValidationMessage.replace('Phone format', 'vCard format'), warning: '' };
    }

    const emailValidationMessage = validateEmailValue(vcardEmail.value, {
      required: false,
      label: 'vCard email address',
    });
    if (emailValidationMessage) {
      return { error: emailValidationMessage.replace('Email format', 'vCard format'), warning: '' };
    }

    const websiteValidationState = getWebsiteValidationState(vcardUrl.value, {
      contextLabel: 'vCard',
    });
    if (websiteValidationState.error || websiteValidationState.warning) {
      return websiteValidationState;
    }
  }

  return { error: '', warning: '' };
}

function normalizeModeName(segmentMode) {
  if (!segmentMode) {
    return 'byte';
  }
  if (typeof segmentMode === 'string') {
    return segmentMode.toLowerCase();
  }
  if (typeof segmentMode.id === 'string') {
    return segmentMode.id.toLowerCase();
  }
  if (typeof segmentMode.name === 'string') {
    return segmentMode.name.toLowerCase();
  }
  return 'byte';
}

function setValidationMessage(message, invalidIndexes = [], level = 'error') {
  modeValidation.hidden = !message;
  modeValidation.textContent = message;
  formatValidation.hidden = !message;
  formatValidation.textContent = message;
  modeValidation.classList.toggle('is-warning', level === 'warning');
  formatValidation.classList.toggle('is-warning', level === 'warning');
  encodedPreview.classList.toggle('has-error', Boolean(message) && level === 'error');

  const activeFieldset = document.querySelector(`.format-fields[data-format-fields="${qrFormat.value}"]`);
  activeFieldset?.classList.toggle('has-error', Boolean(message) && level === 'error');
  activeFieldset?.classList.toggle('has-warning', Boolean(message) && level === 'warning');

  if (!message) {
    return;
  }

  if (!invalidIndexes.length) {
    return;
  }

  const shown = invalidIndexes.slice(0, 20).map((index) => index + 1).join(', ');
  const suffix = invalidIndexes.length > 20 ? ', ...' : '';
  modeValidation.textContent = `${message} Positions: ${shown}${suffix}.`;
}

function getInvalidCharacters(text, mode) {
  if (mode === 'byte') {
    return [];
  }

  if (mode === 'kanji') {
    return null;
  }

  const invalid = [];
  const alphanumericChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  [...text].forEach((char, index) => {
    if (mode === 'numeric' && !/[0-9]/.test(char)) {
      invalid.push({ char, index });
    }
    if (mode === 'alphanumeric' && !alphanumericChars.includes(char)) {
      invalid.push({ char, index });
    }
  });

  return invalid;
}

function validateManualMode(encodedText) {
  const mode = getCurrentEncodingMode();
  if (!mode || !encodedText) {
    setValidationMessage('');
    return true;
  }

  if (mode === 'kanji') {
    setValidationMessage(
      'Manual Kanji mode needs a Shift JIS conversion helper that is not bundled in this browser build.'
    );
    return false;
  }

  const invalid = getInvalidCharacters(encodedText, mode);
  if (!invalid?.length) {
    setValidationMessage('');
    return true;
  }

  const characters = [...new Set(invalid.map(({ char }) => JSON.stringify(char)))].join(', ');
  setValidationMessage(`Incompatible with ${MODE_LABELS[mode]} mode. Invalid characters: ${characters}.`, invalid.map(({ index }) => index));
  return false;
}

function updateEncodingSummary(qrDefinition, options) {
  if (!qrDefinition) {
    detectedMode.textContent = 'Waiting for content';
    segmentSummary.textContent = '0';
    versionSummary.textContent = 'Auto';
    capacitySummary.textContent = '-';
    unusedSummary.textContent = '-';
    return;
  }

  const modes = qrDefinition.segments.map((segment) => normalizeModeName(segment.mode));
  const uniqueModes = [...new Set(modes)];
  const primaryMode = uniqueModes.length === 1 ? uniqueModes[0] : 'mixed';
  const correctionLevel = options.errorCorrectionLevel;
  const versionValue = qrDefinition.version;

  detectedMode.textContent =
    primaryMode === 'mixed'
      ? `Mixed (${uniqueModes.map((mode) => MODE_LABELS[mode] ?? mode).join(', ')})`
      : MODE_LABELS[primaryMode] ?? primaryMode;
  segmentSummary.textContent = String(qrDefinition.segments.length);
  versionSummary.textContent = `V${versionValue}`;

  if (primaryMode === 'mixed') {
    capacitySummary.textContent = 'Mixed mode';
  } else {
    const capacity = MODE_CAPACITY[primaryMode]?.[correctionLevel];
    capacitySummary.textContent = capacity ? `${capacity} chars max` : '-';
  }

  const dataCodewordsCount = getTotalDataCodewords(versionValue, correctionLevel);
  const debugModel = buildDebugOverlayModel(qrDefinition, options);
  const unusedBits = debugModel.bitRoles.filter(
    (role) => role === 'terminator' || role === 'bytePad' || role === 'padByte'
  ).length;
  const unusedPercent = dataCodewordsCount > 0 ? Math.round((unusedBits / (dataCodewordsCount * 8)) * 100) : 0;
  const unusedBytes = unusedBits / 8;
  const unusedByteLabel = Number.isInteger(unusedBytes) ? `${unusedBytes}` : unusedBytes.toFixed(1);
  unusedSummary.textContent = `${unusedByteLabel} B (${unusedPercent}%)`;
}

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

function getTotalDataCodewords(version, errorCorrectionLevel) {
  const total = SYMBOL_TOTAL_CODEWORDS[version];
  const ec = EC_CODEWORDS_TABLE[errorCorrectionLevel]?.[version - 1];
  return total && ec ? total - ec : 0;
}

function getCharCountBits(mode, version) {
  const bucket = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  return CHAR_COUNT_BITS[mode]?.[bucket] ?? CHAR_COUNT_BITS.byte[bucket];
}

function moduleIsDark(qrDefinition, row, column) {
  if (typeof qrDefinition.modules.get === 'function') {
    return qrDefinition.modules.get(row, column);
  }
  return Boolean(qrDefinition.modules.data[row * qrDefinition.modules.size + column]);
}

function getAlignmentPatternCenters(version) {
  if (version === 1) {
    return [];
  }

  const size = version * 4 + 17;
  const count = Math.floor(version / 7) + 2;
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (count * 2 - 2)) * 2;
  const centers = [6];

  for (let pos = size - 7; centers.length < count; pos -= step) {
    centers.splice(1, 0, pos);
  }

  return centers;
}

function isInSquare(row, column, top, left, size) {
  return row >= top && row < top + size && column >= left && column < left + size;
}

function isFinderRegion(size, row, column) {
  return (
    isInSquare(row, column, 0, 0, 8) ||
    isInSquare(row, column, 0, size - 8, 8) ||
    isInSquare(row, column, size - 8, 0, 8)
  );
}

function isFinderPattern(size, row, column) {
  return (
    isInSquare(row, column, 0, 0, 7) ||
    isInSquare(row, column, 0, size - 7, 7) ||
    isInSquare(row, column, size - 7, 0, 7)
  );
}

function isTimingRegion(size, row, column) {
  if (row === 6 && column >= 8 && column <= size - 9) {
    return true;
  }
  if (column === 6 && row >= 8 && row <= size - 9) {
    return true;
  }
  return false;
}

function isFormatRegion(size, row, column) {
  const topLeftRow = row === 8 && column <= 8 && column !== 6;
  const topLeftColumn = column === 8 && row <= 8 && row !== 6;
  const topRight = row === 8 && column >= size - 8;
  const bottomLeft = column === 8 && row >= size - 7;
  return topLeftRow || topLeftColumn || topRight || bottomLeft || (row === size - 8 && column === 8);
}

function isVersionRegion(size, version, row, column) {
  if (version < 7) {
    return false;
  }
  return (
    (row < 6 && column >= size - 11 && column <= size - 9) ||
    (column < 6 && row >= size - 11 && row <= size - 9)
  );
}

function isDarkModuleRegion(size, row, column) {
  return row === size - 8 && column === 8;
}

function getFormatInfoCoordinates(size) {
  return {
    primary: [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4],
      [8, 5], [8, 7], [8, 8], [7, 8], [5, 8],
      [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ],
    secondary: [
      [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8],
      [size - 6, 8], [size - 7, 8], [8, size - 8], [8, size - 7], [8, size - 6],
      [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
    ],
  };
}

function isFunctionModule(qrDefinition, row, column) {
  const size = qrDefinition.modules.size;
  const version = qrDefinition.version;

  return (
    isFinderRegion(size, row, column) ||
    isTimingRegion(size, row, column) ||
    isFormatRegion(size, row, column) ||
    isVersionRegion(size, version, row, column) ||
    isAlignmentRegion(version, size, row, column) ||
    isDarkModuleRegion(size, row, column)
  );
}

function getDataTraversal(qrDefinition) {
  const size = qrDefinition.modules.size;
  const traversal = [];
  let upward = true;

  for (let column = size - 1; column > 0; column -= 2) {
    if (column === 6) {
      column -= 1;
    }

    for (let offset = 0; offset < size; offset += 1) {
      const row = upward ? size - 1 - offset : offset;

      for (let pair = 0; pair < 2; pair += 1) {
        const currentColumn = column - pair;
        if (isFunctionModule(qrDefinition, row, currentColumn)) {
          continue;
        }

        traversal.push({ row, column: currentColumn });
      }
    }

    upward = !upward;
  }

  return traversal;
}

function getFormatBitGroups(size) {
  const { primary, secondary } = getFormatInfoCoordinates(size);
  const ecLevelBits = new Set();
  const maskBits = new Set();

  [primary, secondary].forEach((coords) => {
    coords.slice(0, 2).forEach(([row, column]) => ecLevelBits.add(coordKey(row, column)));
    coords.slice(2, 5).forEach(([row, column]) => maskBits.add(coordKey(row, column)));
  });

  return { ecLevelBits, maskBits };
}

function getVersionInfoCoordinates(size) {
  const primary = [];
  const secondary = [];

  for (let row = 0; row < 6; row += 1) {
    for (let column = size - 11; column <= size - 9; column += 1) {
      primary.push([row, column]);
    }
  }

  for (let column = 0; column < 6; column += 1) {
    for (let row = size - 11; row <= size - 9; row += 1) {
      secondary.push([row, column]);
    }
  }

  return { primary, secondary };
}

function classifyTraversalBits(qrDefinition, dataCodewordsCount, traversalLength) {
  const dataCapacityBits = dataCodewordsCount * 8;
  const totalCodewords = SYMBOL_TOTAL_CODEWORDS[qrDefinition.version];
  const totalCodewordBits = totalCodewords * 8;
  const roles = Array(traversalLength).fill('remainder');
  let cursor = 0;

  qrDefinition.segments.forEach((segment) => {
    const mode = normalizeModeName(segment.mode);

    for (let index = 0; index < 4 && cursor < dataCapacityBits; index += 1) {
      roles[cursor++] = 'mode';
    }

    const charCountBits = getCharCountBits(mode, qrDefinition.version);
    for (let index = 0; index < charCountBits && cursor < dataCapacityBits; index += 1) {
      roles[cursor++] = 'charCount';
    }

    const payloadBits = segment.getBitsLength();
    for (let index = 0; index < payloadBits && cursor < dataCapacityBits; index += 1) {
      roles[cursor++] = 'payload';
    }
  });

  const terminatorBits = Math.min(4, Math.max(0, dataCapacityBits - cursor));
  for (let index = 0; index < terminatorBits && cursor < dataCapacityBits; index += 1) {
    roles[cursor++] = 'terminator';
  }

  while (cursor < dataCapacityBits && cursor % 8 !== 0) {
    roles[cursor++] = 'bytePad';
  }

  while (cursor < dataCapacityBits) {
    for (let index = 0; index < 8 && cursor < dataCapacityBits; index += 1) {
      roles[cursor++] = 'padByte';
    }
  }

  for (let index = dataCapacityBits; index < Math.min(totalCodewordBits, traversalLength); index += 1) {
    roles[index] = 'errorCorrection';
  }

  return roles;
}

function summarizeCodewordRoles(roles) {
  if (roles.every((role) => role === 'errorCorrection')) {
    return 'errorCorrection';
  }
  if (roles.every((role) => role === 'remainder')) {
    return 'remainder';
  }
  if (roles.every((role) => role === 'padByte')) {
    return 'padByte';
  }
  if (roles.some((role) => role === 'mode' || role === 'charCount')) {
    return 'header';
  }
  if (roles.some((role) => role === 'terminator' || role === 'bytePad' || role === 'padByte')) {
    return 'padding';
  }
  return 'data';
}

function summarizeGroupRoles(roles) {
  if (roles.every((role) => role === 'errorCorrection')) {
    return 'errorCorrection';
  }
  if (roles.every((role) => role === 'remainder')) {
    return 'remainder';
  }
  if (roles.every((role) => role === 'padByte' || role === 'bytePad')) {
    return 'padByte';
  }
  if (roles.every((role) => role === 'terminator')) {
    return 'terminator';
  }
  if (roles.some((role) => role === 'terminator' || role === 'bytePad' || role === 'padByte')) {
    return 'padding';
  }
  if (roles.some((role) => role === 'mode' || role === 'charCount')) {
    return 'header';
  }
  return 'data';
}

function buildPostHeaderStreamGroups(traversal, bitRoles) {
  const streamBitIndexes = [];

  bitRoles.forEach((role, index) => {
    if (role === 'payload' || role === 'terminator' || role === 'bytePad' || role === 'padByte') {
      streamBitIndexes.push(index);
    }
  });

  const groups = [];
  for (let index = 0; index < streamBitIndexes.length; index += 8) {
    const indexes = streamBitIndexes.slice(index, index + 8);
    const modules = indexes.map((bitIndex) => traversal[bitIndex]);
    const roles = indexes.map((bitIndex) => bitRoles[bitIndex]);

    groups.push({
      kind: summarizeGroupRoles(roles),
      modules,
      roles,
    });
  }

  return groups;
}

function splitMetadataCoordinateRuns(coordinates) {
  if (coordinates.length === 0) {
    return [];
  }

  const runs = [[coordinates[0]]];

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const current = coordinates[index];
    const distance = Math.abs(current[0] - previous[0]) + Math.abs(current[1] - previous[1]);

    if (distance === 1) {
      runs[runs.length - 1].push(current);
    } else {
      runs.push([current]);
    }
  }

  return runs;
}

function pushMetadataFieldGroups(groups, coordinates, role, sequenceId) {
  const runs = splitMetadataCoordinateRuns(coordinates);

  runs.forEach((run, runIndex) => {
    groups.push({
      kind: 'metadata',
      modules: run.map(([row, column]) => ({ row, column })),
      roles: [role],
      metadataRole: role,
      metadataSequenceId: sequenceId,
      metadataRunIndex: runIndex,
      metadataRunCount: runs.length,
    });
  });
}

function buildMetadataGroups(qrDefinition) {
  const size = qrDefinition.modules.size;
  const formatInfo = getFormatInfoCoordinates(size);
  const groups = [];
  const primary = formatInfo.primary;
  const secondary = formatInfo.secondary;

  pushMetadataFieldGroups(groups, primary.slice(0, 2), 'ecLevel', 'ecLevel-primary');
  pushMetadataFieldGroups(groups, primary.slice(2, 5), 'mask', 'mask-primary');
  pushMetadataFieldGroups(groups, primary.slice(5), 'format', 'format-primary');

  pushMetadataFieldGroups(groups, secondary.slice(0, 2), 'ecLevel', 'ecLevel-secondary');
  pushMetadataFieldGroups(groups, secondary.slice(2, 5), 'mask', 'mask-secondary');
  pushMetadataFieldGroups(groups, secondary.slice(5), 'format', 'format-secondary');

  if (qrDefinition.version >= 7) {
    const versionInfo = getVersionInfoCoordinates(size);
    pushMetadataFieldGroups(groups, versionInfo.primary, 'version', 'version-primary');
    pushMetadataFieldGroups(groups, versionInfo.secondary, 'version', 'version-secondary');
  }

  return groups;
}

function buildDebugOverlayModel(qrDefinition, options) {
  const traversal = getDataTraversal(qrDefinition);
  const dataCodewordsCount = getTotalDataCodewords(qrDefinition.version, options.errorCorrectionLevel);
  const modeBits = new Set();
  const charCountBits = new Set();
  const payloadBits = new Set();
  const terminatorBits = new Set();
  const bytePadBits = new Set();
  const errorCorrectionBits = new Set();
  const remainderBits = new Set();
  const codewords = [];
  const bitRoles = classifyTraversalBits(qrDefinition, dataCodewordsCount, traversal.length);

  traversal.forEach((module, index) => {
    const role = bitRoles[index];
    const key = coordKey(module.row, module.column);

    if (role === 'mode') {
      modeBits.add(key);
    } else if (role === 'charCount') {
      charCountBits.add(key);
    } else if (role === 'payload') {
      payloadBits.add(key);
    } else if (role === 'terminator') {
      terminatorBits.add(key);
    } else if (role === 'bytePad' || role === 'padByte') {
      bytePadBits.add(key);
    } else if (role === 'errorCorrection') {
      errorCorrectionBits.add(key);
    } else if (role === 'remainder') {
      remainderBits.add(key);
    }
  });

  for (let index = 0; index < traversal.length; index += 8) {
    const modules = traversal.slice(index, index + 8);
    const roles = bitRoles.slice(index, index + 8);
    const kind = summarizeCodewordRoles(roles);

    codewords.push({
      kind,
      modules,
      roles,
    });
  }

  const { ecLevelBits, maskBits } = getFormatBitGroups(qrDefinition.modules.size);
  const streamGroups = buildPostHeaderStreamGroups(traversal, bitRoles);
  const metadataGroups = buildMetadataGroups(qrDefinition);

  return {
    modeBits,
    charCountBits,
    payloadBits,
    terminatorBits,
    bytePadBits,
    ecLevelBits,
    maskBits,
    errorCorrectionBits,
    remainderBits,
    bitRoles,
    codewords,
    streamGroups,
    metadataGroups,
  };
}

function isAlignmentRegion(version, size, row, column) {
  const centers = getAlignmentPatternCenters(version);
  for (const centerRow of centers) {
    for (const centerColumn of centers) {
      const overlapsFinder =
        (centerRow === 6 && centerColumn === 6) ||
        (centerRow === 6 && centerColumn === size - 7) ||
        (centerRow === size - 7 && centerColumn === 6);

      if (overlapsFinder) {
        continue;
      }

      if (Math.abs(row - centerRow) <= 2 && Math.abs(column - centerColumn) <= 2) {
        return true;
      }
    }
  }
  return false;
}

function getModuleCategory(qrDefinition, row, column) {
  const size = qrDefinition.modules.size;
  const version = qrDefinition.version;

  if (isFinderRegion(size, row, column)) {
    return 'finder';
  }
  if (isTimingRegion(size, row, column)) {
    return 'timing';
  }
  if (isDarkModuleRegion(size, row, column)) {
    return 'darkModule';
  }
  if (isFormatRegion(size, row, column)) {
    return 'format';
  }
  if (isVersionRegion(size, version, row, column)) {
    return 'version';
  }
  if (isAlignmentRegion(version, size, row, column)) {
    return 'alignment';
  }
  return 'data';
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => part + part)
          .join('')
      : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function hexToRgb(hex) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => part + part)
          .join('')
      : normalized;

  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16),
  };
}

function getContrastingHex(hex) {
  const { red, green, blue } = hexToRgb(hex);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 140 ? '#111827' : '#ffffff';
}

function getDebugCategory(row, column, qrDefinition, debugModel, purpose = 'overlay') {
  const key = coordKey(row, column);

  if (debugModel.errorCorrectionBits.has(key)) {
    return 'errorCorrection';
  }
  if (debugModel.modeBits.has(key)) {
    return 'mode';
  }
  if (debugModel.charCountBits.has(key)) {
    return 'charCount';
  }
  if (debugModel.payloadBits.has(key)) {
    return 'data';
  }
  if (debugModel.terminatorBits.has(key)) {
    return 'terminator';
  }
  if (debugModel.bytePadBits.has(key)) {
    return 'padding';
  }
  if (debugModel.remainderBits.has(key)) {
    return 'remainder';
  }
  if (debugModel.codewords.length === 0 && purpose === 'overlay') {
    return getModuleCategory(qrDefinition, row, column);
  }
  if (debugModel.ecLevelBits.has(key)) {
    return 'ecLevel';
  }
  if (debugModel.maskBits.has(key)) {
    return 'mask';
  }
  if (purpose === 'overlay') {
    const remainderCodeword = debugModel.codewords.find((codeword) =>
      codeword.kind === 'remainder' &&
      codeword.modules.some((module) => module.row === row && module.column === column)
    );
    if (remainderCodeword) {
      return 'remainder';
    }
  }

  return getModuleCategory(qrDefinition, row, column);
}

function getGroupBaseColor(group) {
  const rolePriority = [
    ['version', debugColors.version.value],
    ['format', debugColors.format.value],
    ['errorCorrection', debugColors.errorCorrection.value],
    ['terminator', debugColors.terminator.value],
    ['charCount', debugColors.charCount.value],
    ['mode', debugColors.mode.value],
    ['payload', debugColors.data.value],
    ['bytePad', debugColors.padding.value],
    ['padByte', debugColors.padding.value],
    ['remainder', debugColors.remainder.value],
  ];

  for (const [role, color] of rolePriority) {
    if (group.roles?.includes(role)) {
      return color;
    }
  }

  switch (group.kind) {
    case 'errorCorrection':
      return debugColors.errorCorrection.value;
    case 'metadata':
      return debugColors.format.value;
    case 'remainder':
      return debugColors.remainder.value;
    case 'padding':
    case 'padByte':
      return debugColors.padding.value;
    case 'header':
      return debugColors.mode.value;
    case 'data':
    default:
      return debugColors.data.value;
  }
}

function getCodewordStyle(group) {
  const color = getGroupBaseColor(group);

  let opacity = 0.7;
  if (group.kind === 'header') {
    opacity = 0.9;
  } else if (group.kind === 'padding' || group.kind === 'padByte') {
    opacity = 0.75;
  } else if (group.kind === 'remainder') {
    opacity = 0.78;
  }

  return {
    color,
    strokeColor: getContrastingHex(color),
    opacity,
  };
}

function getMetadataRouteIndex(group, groups) {
  return groups.indexOf(group);
}

function getCategoryOverlayColor(category) {
  switch (category) {
    case 'mode':
      return debugColors.mode.value;
    case 'charCount':
      return debugColors.charCount.value;
    case 'ecLevel':
      return debugColors.ecLevel.value;
    case 'mask':
      return debugColors.mask.value;
    case 'errorCorrection':
      return debugColors.errorCorrection.value;
    case 'padding':
      return debugColors.padding.value;
    case 'remainder':
      return debugColors.remainder.value;
    case 'terminator':
      return debugColors.terminator.value;
    case 'finder':
      return debugColors.finder.value;
    case 'alignment':
      return debugColors.alignment.value;
    case 'timing':
      return debugColors.timing.value;
    case 'darkModule':
      return debugColors.darkModule.value;
    case 'format':
      return debugColors.format.value;
    case 'version':
      return debugColors.version.value;
    case 'data':
    default:
      return debugColors.data.value;
  }
}

function getModuleContrastColor(module, qrDefinition, debugModel) {
  const category = getDebugCategory(module.row, module.column, qrDefinition, debugModel, 'overlay');
  return getContrastingHex(getCategoryOverlayColor(category));
}

function shouldDrawCategoryBoundary(category) {
  return category !== 'data';
}

function drawHighlightedBoundaries(context, qrDefinition, debugModel, marginModules, cellSize) {
  const size = qrDefinition.modules.size;
  const lineWidth = Math.max(0.8, cellSize * 0.08);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const category = getDebugCategory(row, column, qrDefinition, debugModel, 'overlay');

      if (!shouldDrawCategoryBoundary(category)) {
        continue;
      }

      const strokeColor = getContrastingHex(getCategoryOverlayColor(category));
      const left = (column + marginModules) * cellSize;
      const top = (row + marginModules) * cellSize;
      const right = left + cellSize;
      const bottom = top + cellSize;

      const neighbors = {
        left: column > 0 ? getDebugCategory(row, column - 1, qrDefinition, debugModel, 'overlay') : null,
        right: column < size - 1 ? getDebugCategory(row, column + 1, qrDefinition, debugModel, 'overlay') : null,
        top: row > 0 ? getDebugCategory(row - 1, column, qrDefinition, debugModel, 'overlay') : null,
        bottom: row < size - 1 ? getDebugCategory(row + 1, column, qrDefinition, debugModel, 'overlay') : null,
      };

      context.strokeStyle = hexToRgba(strokeColor, 0.75);
      context.lineWidth = lineWidth;
      context.lineCap = 'round';

      if (neighbors.left !== category) {
        context.beginPath();
        context.moveTo(left, top);
        context.lineTo(left, bottom);
        context.stroke();
      }
      if (neighbors.right !== category) {
        context.beginPath();
        context.moveTo(right, top);
        context.lineTo(right, bottom);
        context.stroke();
      }
      if (neighbors.top !== category) {
        context.beginPath();
        context.moveTo(left, top);
        context.lineTo(right, top);
        context.stroke();
      }
      if (neighbors.bottom !== category) {
        context.beginPath();
        context.moveTo(left, bottom);
        context.lineTo(right, bottom);
        context.stroke();
      }
    }
  }
}

function getActiveOutlineGroups(debugModel) {
  const selectedMode = activeDebugOutlineMode;

  if (selectedMode === 'stream') {
    return debugModel.streamGroups;
  }

  if (selectedMode === 'metadata') {
    return debugModel.metadataGroups;
  }

  return debugModel.codewords;
}

function drawSegmentPerimeter(context, modules, marginModules, cellSize, strokeStyle, lineWidth) {
  const moduleSet = new Set(modules.map(({ row, column }) => coordKey(row, column)));

  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  modules.forEach(({ row, column }) => {
    const left = (column + marginModules) * cellSize;
    const top = (row + marginModules) * cellSize;
    const right = left + cellSize;
    const bottom = top + cellSize;

    if (!moduleSet.has(coordKey(row, column - 1))) {
      context.beginPath();
      context.moveTo(left, top);
      context.lineTo(left, bottom);
      context.stroke();
    }

    if (!moduleSet.has(coordKey(row, column + 1))) {
      context.beginPath();
      context.moveTo(right, top);
      context.lineTo(right, bottom);
      context.stroke();
    }

    if (!moduleSet.has(coordKey(row - 1, column))) {
      context.beginPath();
      context.moveTo(left, top);
      context.lineTo(right, top);
      context.stroke();
    }

    if (!moduleSet.has(coordKey(row + 1, column))) {
      context.beginPath();
      context.moveTo(left, bottom);
      context.lineTo(right, bottom);
      context.stroke();
    }
  });
}

function drawCodewordOutlines(context, debugModel, marginModules, cellSize) {
  const lineWidth = Math.max(1.25, cellSize * 0.14);
  const groups = getActiveOutlineGroups(debugModel);
  const outlinedKinds = new Set(['header', 'data', 'errorCorrection', 'metadata']);

  groups.forEach((codeword, index) => {
    if (codeword.modules.length === 0) {
      return;
    }

    const style = getCodewordStyle(codeword);
    if (outlinedKinds.has(codeword.kind)) {
      drawSegmentPerimeter(
        context,
        codeword.modules,
        marginModules,
        cellSize,
        hexToRgba(style.strokeColor, Math.min(1, style.opacity + 0.18)),
        lineWidth
      );
    }

    const first = codeword.modules[0];
    const previousCodeword = groups[index - 1];
    const nextCodeword = groups[index + 1];
    const isMetadataSequenceStart =
      codeword.kind === 'metadata' &&
      (!previousCodeword || previousCodeword.metadataSequenceId !== codeword.metadataSequenceId);
    const shouldDrawStartDot =
      outlinedKinds.has(codeword.kind) &&
      (codeword.kind !== 'metadata' || isMetadataSequenceStart);

    if (first && shouldDrawStartDot) {
      context.fillStyle = hexToRgba(style.strokeColor, Math.min(1, style.opacity + 0.1));
      context.beginPath();
      context.arc(
        (first.column + marginModules + 0.5) * cellSize,
        (first.row + marginModules + 0.5) * cellSize,
        Math.max(codeword.kind === 'metadata' ? 2.2 : 1.4, cellSize * (codeword.kind === 'metadata' ? 0.24 : 0.18)),
        0,
        Math.PI * 2
      );
      context.fill();
    }

  });
}

function getMetadataOffsetVector(routeIndex, cellSize) {
  const offset = Math.max(1.25, cellSize * 0.18);
  const vectors = [
    { x: -offset, y: -offset * 0.35 },
    { x: offset, y: offset * 0.35 },
    { x: -offset * 0.6, y: offset },
    { x: offset * 0.6, y: -offset },
  ];
  return vectors[((routeIndex % vectors.length) + vectors.length) % vectors.length];
}

function drawMetadataSegment(context, from, to, strokeColor, strokeOpacity, lineWidth, offsetVector) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const normal =
    length === 0
      ? { x: offsetVector.x, y: offsetVector.y }
      : { x: (-dy / length) * offsetVector.x + offsetVector.x * 0.2, y: (dx / length) * offsetVector.y + offsetVector.y * 0.2 };

  const control = {
    x: (from.x + to.x) / 2 + normal.x,
    y: (from.y + to.y) / 2 + normal.y,
  };

  context.strokeStyle = hexToRgba(strokeColor, strokeOpacity);
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.quadraticCurveTo(control.x, control.y, to.x, to.y);
  context.stroke();
}

function drawMetadataBridge(context, from, to, strokeColor, strokeOpacity, lineWidth, routeIndex, cellSize) {
  const horizontalDirection = to.x >= from.x ? 1 : -1;
  const bridgeLift = Math.max(cellSize * 1.3, 12);
  const bridgeSpread = Math.max(cellSize * 0.7, 7);
  const curveDirection = routeIndex % 2 === 0 ? -1 : 1;
  const control = {
    x: (from.x + to.x) / 2 + horizontalDirection * bridgeSpread * 0.2,
    y: Math.min(from.y, to.y) + curveDirection * bridgeLift,
  };

  context.strokeStyle = hexToRgba(strokeColor, strokeOpacity);
  context.lineWidth = lineWidth;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.quadraticCurveTo(control.x, control.y, to.x, to.y);
  context.stroke();
}

function drawCodewordPaths(context, qrDefinition, debugModel, marginModules, cellSize) {
  const lineWidth = Math.max(1, cellSize * 0.18);
  const groups = getActiveOutlineGroups(debugModel);

  groups.forEach((codeword, index) => {
    if (codeword.modules.length === 0) {
      return;
    }

    const points = codeword.modules.map(({ row, column }) => ({
      x: (column + marginModules + 0.5) * cellSize,
      y: (row + marginModules + 0.5) * cellSize,
    }));

    const dataOpacity = index % 2 === 0 ? 0.25 : 0.5;
    const strokeOpacity = codeword.kind === 'data' ? dataOpacity : 0.5;
    const effectiveLineWidth = codeword.kind === 'metadata' ? Math.max(0.8, cellSize * 0.11) : lineWidth;
    context.lineWidth = effectiveLineWidth;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    const metadataRouteIndex = codeword.kind === 'metadata' ? getMetadataRouteIndex(codeword, groups) : -1;
    const metadataOffset = codeword.kind === 'metadata' ? getMetadataOffsetVector(metadataRouteIndex, cellSize) : null;

    for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
      const targetModule = codeword.modules[pointIndex];
      const strokeColor = getModuleContrastColor(targetModule, qrDefinition, debugModel);
      if (codeword.kind === 'metadata') {
        drawMetadataSegment(
          context,
          points[pointIndex - 1],
          points[pointIndex],
          strokeColor,
          0.78,
          effectiveLineWidth,
          metadataOffset
        );
      } else {
        context.strokeStyle = hexToRgba(strokeColor, strokeOpacity);
        context.beginPath();
        context.moveTo(points[pointIndex - 1].x, points[pointIndex - 1].y);
        context.lineTo(points[pointIndex].x, points[pointIndex].y);
        context.stroke();
      }
    }

    const nextCodeword = groups[index + 1];
    if (!nextCodeword || nextCodeword.modules.length === 0) {
      return;
    }

    if (codeword.kind === 'metadata' && nextCodeword.kind === 'metadata') {
      if (codeword.metadataSequenceId !== nextCodeword.metadataSequenceId) {
        return;
      }

      const from = points[points.length - 1];
      const next = nextCodeword.modules[0];
      const to = {
        x: (next.column + marginModules + 0.5) * cellSize,
        y: (next.row + marginModules + 0.5) * cellSize,
      };
      const transitionColor = getModuleContrastColor(nextCodeword.modules[0], qrDefinition, debugModel);
      drawMetadataBridge(
        context,
        from,
        to,
        transitionColor,
        0.78,
        Math.max(0.8, cellSize * 0.11),
        metadataRouteIndex,
        cellSize
      );
      return;
    }

    if (codeword.kind === 'metadata' || nextCodeword.kind === 'metadata') {
      return;
    }

    const from = points[points.length - 1];
    const next = nextCodeword.modules[0];
    const to = {
      x: (next.column + marginModules + 0.5) * cellSize,
      y: (next.row + marginModules + 0.5) * cellSize,
    };

    const transitionColor = getModuleContrastColor(nextCodeword.modules[0], qrDefinition, debugModel);
    context.strokeStyle = hexToRgba(transitionColor, strokeOpacity);
    context.lineWidth = Math.max(1, cellSize * 0.1);
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
}

function addRoundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function getModuleShapeGeometry(shapeOptions = {}) {
  switch (shapeOptions.type) {
    case 'rounded':
      return { inset: 0, rounding: 32, rotation: 0 };
    case 'dots':
      return { inset: 8, rounding: 50, rotation: 0 };
    case 'diamond':
      return { inset: 15, rounding: 0, rotation: 45 };
    case 'custom':
      return {
        inset: Math.min(30, Math.max(0, shapeOptions.inset ?? 4)),
        rounding: Math.min(50, Math.max(0, shapeOptions.rounding ?? 25)),
        rotation: Math.min(45, Math.max(-45, shapeOptions.rotation ?? 0)),
      };
    default:
      return null;
  }
}

function drawQrModule(context, x, y, cellSize, shapeOptions) {
  const geometry = getModuleShapeGeometry(shapeOptions);
  if (!geometry || cellSize < 2) {
    context.fillRect(x, y, Math.ceil(cellSize), Math.ceil(cellSize));
    return;
  }

  const inset = cellSize * (geometry.inset / 100);
  const size = Math.max(0, cellSize - inset * 2);
  const radius = size * (geometry.rounding / 100);
  const centerX = x + cellSize / 2;
  const centerY = y + cellSize / 2;

  context.save();
  context.translate(centerX, centerY);
  context.rotate((geometry.rotation * Math.PI) / 180);
  addRoundedRectPath(context, -size / 2, -size / 2, size, size, radius);
  context.fill();
  context.restore();
}

function getEyeShapeGeometry(eyeOptions) {
  switch (eyeOptions.type) {
    case 'square':
      return { outerRounding: 0, centerRounding: 0 };
    case 'rounded':
      return { outerRounding: 18, centerRounding: 32 };
    case 'circle':
      return { outerRounding: 50, centerRounding: 50 };
    case 'custom':
      return {
        outerRounding: Math.min(50, Math.max(0, eyeOptions.outerRounding ?? 20)),
        centerRounding: Math.min(50, Math.max(0, eyeOptions.centerRounding ?? 35)),
      };
    default:
      return null;
  }
}

function fillEyeShape(context, x, y, size, rounding, fillStyle) {
  context.fillStyle = fillStyle;
  addRoundedRectPath(context, x, y, size, size, size * (rounding / 100));
  context.fill();
}

function drawFinderEyes(
  context,
  moduleCount,
  marginModules,
  cellSize,
  eyeOptions,
  moduleFillStyle,
  lightColor,
  transparentLight
) {
  const geometry = getEyeShapeGeometry(eyeOptions);
  if (!geometry) {
    return;
  }

  const origins = [
    [0, 0],
    [0, moduleCount - 7],
    [moduleCount - 7, 0],
  ];

  origins.forEach(([row, column]) => {
    const x = (column + marginModules) * cellSize;
    const y = (row + marginModules) * cellSize;
    fillEyeShape(context, x, y, cellSize * 7, geometry.outerRounding, moduleFillStyle);

    context.save();
    context.globalCompositeOperation = 'destination-out';
    fillEyeShape(context, x + cellSize, y + cellSize, cellSize * 5, geometry.outerRounding, '#000000');
    context.restore();
    if (!transparentLight) {
      fillEyeShape(context, x + cellSize, y + cellSize, cellSize * 5, geometry.outerRounding, lightColor);
    }

    fillEyeShape(
      context,
      x + cellSize * 2,
      y + cellSize * 2,
      cellSize * 3,
      geometry.centerRounding,
      moduleFillStyle
    );
  });
}

function createQrModuleFill(context, startColor, gradientOptions, marginModules, moduleCount, cellSize) {
  if (gradientOptions.type === 'solid') {
    return startColor;
  }

  const qrStart = marginModules * cellSize;
  const qrSize = moduleCount * cellSize;
  const center = qrStart + qrSize / 2;
  let gradient;

  if (gradientOptions.type === 'radial') {
    gradient = context.createRadialGradient(center, center, 0, center, center, (qrSize * Math.SQRT2) / 2);
  } else {
    const radians = (gradientOptions.angle * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const extent = (qrSize / 2) * (Math.abs(cosine) + Math.abs(sine));
    gradient = context.createLinearGradient(
      center - cosine * extent,
      center - sine * extent,
      center + cosine * extent,
      center + sine * extent
    );
  }

  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, gradientOptions.endColor);
  return gradient;
}

function fitCanvasText(context, text, maximumWidth) {
  let fitted = text;
  while (fitted && context.measureText(`${fitted}...`).width > maximumWidth) {
    fitted = fitted.slice(0, -1).trimEnd();
  }
  return fitted ? `${fitted}...` : '...';
}

function wrapFrameMessage(context, message, maximumWidth, maximumLines = 2) {
  let remaining = message.replace(/\s+/g, ' ').trim();
  const lines = [];

  while (remaining && lines.length < maximumLines) {
    let length = 1;
    while (length <= remaining.length && context.measureText(remaining.slice(0, length)).width <= maximumWidth) {
      length += 1;
    }
    length = Math.max(1, length - 1);

    if (length < remaining.length) {
      const wordBoundary = remaining.lastIndexOf(' ', length);
      if (wordBoundary >= Math.floor(length / 2)) {
        length = wordBoundary;
      }
    }

    const line = remaining.slice(0, length).trim();
    remaining = remaining.slice(length).trim();
    lines.push(line);
  }

  if (remaining && lines.length) {
    lines[lines.length - 1] = fitCanvasText(context, lines[lines.length - 1], maximumWidth);
  }
  return lines;
}

function drawFrameMessage(context, messageLines, canvasSize, captionHeight, fontSize, lineHeight, transparentLight, textColor) {
  if (!messageLines.length || captionHeight <= 0) {
    return;
  }

  context.save();
  if (!transparentLight) {
    context.strokeStyle = 'rgba(19, 34, 53, 0.12)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(canvasSize * 0.12, canvasSize + 0.5);
    context.lineTo(canvasSize * 0.88, canvasSize + 0.5);
    context.stroke();
  }

  context.fillStyle = textColor;
  context.font = `800 ${fontSize}px "Avenir Next", "Segoe UI", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const blockHeight = messageLines.length * lineHeight;
  const firstLineY = canvasSize + (captionHeight - blockHeight) / 2 + lineHeight / 2;
  messageLines.forEach((line, index) => {
    context.fillText(line, canvasSize / 2, firstLineY + index * lineHeight);
  });
  context.restore();
}

function getOpaqueArtworkBackground(lightColor) {
  return /^#[0-9a-f]{6}/i.test(lightColor) ? lightColor.slice(0, 7) : '#ffffff';
}

function drawCenterArtwork(context, qrStart, qrSize, lightColor) {
  const mode = centerArtMode.value;
  const emoji = centerEmoji.value.trim();
  const hasPixelArt = pixelArtPixels.some(Boolean);
  const hasArtwork =
    (mode === 'logo' && centerLogoImage) ||
    (mode === 'emoji' && emoji) ||
    (mode === 'pixel' && hasPixelArt);
  if (!hasArtwork) {
    return;
  }

  const badgeSize = qrSize * ((readInteger(centerArtSize) ?? 20) / 100);
  const center = qrStart + qrSize / 2;
  const badgeX = center - badgeSize / 2;
  const badgeY = center - badgeSize / 2;
  const artPadding = centerArtBackground.checked ? badgeSize * 0.13 : 0;
  const artSize = badgeSize - artPadding * 2;

  context.save();
  if (centerArtBackground.checked) {
    fillEyeShape(
      context,
      badgeX,
      badgeY,
      badgeSize,
      20,
      getOpaqueArtworkBackground(lightColor)
    );
  }

  if (mode === 'logo') {
    const scale = Math.min(artSize / centerLogoImage.naturalWidth, artSize / centerLogoImage.naturalHeight);
    const width = centerLogoImage.naturalWidth * scale;
    const height = centerLogoImage.naturalHeight * scale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(centerLogoImage, center - width / 2, center - height / 2, width, height);
  } else if (mode === 'emoji') {
    context.font = `${artSize * 0.82}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(emoji, center, center + artSize * 0.04);
  } else if (mode === 'pixel') {
    const pixelSize = artSize / pixelArtSize;
    const artX = center - artSize / 2;
    const artY = center - artSize / 2;
    const matchModuleShape = pixelArtMatchModuleShape.checked && moduleShape.value !== 'square';
    const pixelShapeOptions = getCurrentModuleShapeOptions();
    context.imageSmoothingEnabled = false;
    pixelArtPixels.forEach((color, index) => {
      if (!color) {
        return;
      }
      const row = Math.floor(index / pixelArtSize);
      const column = index % pixelArtSize;
      const left = Math.round(artX + column * pixelSize);
      const top = Math.round(artY + row * pixelSize);
      const right = Math.round(artX + (column + 1) * pixelSize);
      const bottom = Math.round(artY + (row + 1) * pixelSize);
      context.fillStyle = color;
      if (matchModuleShape) {
        drawQrModule(
          context,
          artX + column * pixelSize,
          artY + row * pixelSize,
          pixelSize,
          pixelShapeOptions
        );
      } else {
        context.fillRect(left, top, right - left, bottom - top);
      }
    });
  }
  context.restore();
}

function drawQr(qrDefinition, options) {
  const marginModules = options.margin ?? 4;
  const moduleCount = qrDefinition.modules.size;
  const totalModules = moduleCount + marginModules * 2;
  const minimumModuleScale = Math.max(1, options.scale ?? 4);
  const minimumCanvasSize = totalModules * minimumModuleScale;
  const maximumModuleScale = Math.max(minimumModuleScale, Math.floor(640 / totalModules));
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
  const captionFontSize = Math.max(10, Math.min(18, canvasSize * 0.05));
  const captionLineHeight = captionFontSize * 1.25;
  const captionPadding = Math.max(7, Math.min(14, canvasSize * 0.035));
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  context.font = `800 ${captionFontSize}px "Avenir Next", "Segoe UI", sans-serif`;
  const frameMessageLines = frameMessageText
    ? wrapFrameMessage(context, frameMessageText, Math.max(20, canvasSize - captionPadding * 2))
    : [];
  const captionHeight = frameMessageLines.length
    ? Math.ceil(frameMessageLines.length * captionLineHeight + captionPadding * 2)
    : 0;
  const debugActive = isDebugOverlayActive();
  const debugModel = debugActive ? buildDebugOverlayModel(qrDefinition, options) : null;
  const moduleShapeOptions = getCurrentModuleShapeOptions();
  const eyeShapeOptions = getCurrentEyeShapeOptions();
  const customEyesActive = !debugActive && eyeShapeOptions.type !== 'default';
  const gradientOptions = getCurrentGradientOptions();
  const lightAlpha = getColorAlpha(options.color.light);
  const gradientHasTransparency = gradientOptions.type !== 'solid' && getColorAlpha(gradientOptions.endColor) < 1;
  const hasTransparency = getColorAlpha(options.color.dark) < 1 || gradientHasTransparency || lightAlpha < 1;
  const transparentLight = lightAlpha === 0;

  canvas.height = canvasSize + captionHeight;
  canvas.classList.toggle('has-transparency', hasTransparency);

  const backgroundColor = options.color.light;
  const quietColor = options.color.light;

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!transparentLight) {
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
      if (!moduleIsDark(qrDefinition, row, column)) {
        continue;
      }
      if (customEyesActive && isFinderPattern(moduleCount, row, column)) {
        continue;
      }

      const category = debugActive
        ? getDebugCategory(row, column, qrDefinition, debugModel, 'overlay')
        : getModuleCategory(qrDefinition, row, column);
      context.fillStyle = debugActive ? hexToRgba(debugColors[category].value, 1) : moduleFillStyle;
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
      moduleFillStyle,
      options.color.light,
      transparentLight
    );
  }

  if (debugActive) {
    drawHighlightedBoundaries(context, qrDefinition, debugModel, marginModules, cellSize);
    drawCodewordOutlines(context, debugModel, marginModules, cellSize);
    drawCodewordPaths(context, qrDefinition, debugModel, marginModules, cellSize);
  }

  drawCenterArtwork(context, marginModules * cellSize, moduleCount * cellSize, options.color.light);

  const frameTextColor = /^#[0-9a-f]{6}/i.test(options.color.dark)
    ? options.color.dark.slice(0, 7)
    : '#132235';
  drawFrameMessage(
    context,
    frameMessageLines,
    canvasSize,
    captionHeight,
    captionFontSize,
    captionLineHeight,
    transparentLight,
    frameTextColor
  );
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
    const qrDefinition = QRCode.create(safeText, previewOptions);
    drawQr(qrDefinition, previewOptions);
  } catch (error) {
    clearCanvas();
  }

  drawInvalidOverlay(message);
}

function createMaskButton(maskValue) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mask-option';
  button.dataset.maskValue = maskValue;
  button.setAttribute('role', 'radio');

  const preview = document.createElement('div');
  preview.className = 'mask-preview';

  if (maskValue === '') {
    preview.classList.add('mask-preview-auto');
    preview.textContent = 'Auto';
  } else {
    const thumbnail = document.createElement('canvas');
    thumbnail.width = 72;
    thumbnail.height = 72;
    thumbnail.className = 'mask-canvas';
    preview.appendChild(thumbnail);
  }

  const label = document.createElement('span');
  label.className = 'mask-label';
  label.textContent = maskValue === '' ? 'Best fit' : `Mask ${maskValue}`;

  const detail = document.createElement('span');
  detail.className = 'mask-detail';
  detail.textContent = MASK_LABELS[maskValue];

  button.append(preview, label, detail);
  button.addEventListener('click', () => {
    maskPattern.value = maskValue;
    syncMaskSelection();
    renderQr();
  });

  return button;
}

function ensureMaskButtons() {
  if (maskGrid.childElementCount > 0) {
    return;
  }

  MASK_VALUES.forEach((maskValue) => {
    maskGrid.appendChild(createMaskButton(maskValue));
  });
}

function syncMaskSelection() {
  const activeValue = maskPattern.value;
  maskGrid.querySelectorAll('.mask-option').forEach((button) => {
    const isActive = button.dataset.maskValue === activeValue;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-checked', String(isActive));
  });
}

function renderMaskPreviews(encodedText) {
  ensureMaskButtons();

  const previewValue = encodedText.trim() || 'Preview';
  maskGrid.querySelectorAll('.mask-option').forEach((button) => {
    const maskValue = button.dataset.maskValue;
    const previewCanvas = button.querySelector('canvas');

    if (!previewCanvas) {
      return;
    }

    QRCode.toCanvas(previewCanvas, previewValue, buildMaskPreviewOptions(maskValue), (error) => {
      if (error) {
        console.error(error);
      }
    });
  });
}

function activateTab(tabName) {
  activeTabName = tabName;
  tabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });

  if (tabName === 'content' && qrFormat.value === 'geo') {
    window.requestAnimationFrame(() => {
      updateGeoMap();
    });
  }

  renderQr();
}

function activateDebugSubtab(subtabName) {
  activeDebugSubtab = subtabName;

  debugSubtabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.subtab === subtabName);
  });

  debugSubtabPanels.forEach((panel) => {
    const isActive = panel.dataset.subtabPanel === subtabName;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });

  renderQr();
}

function activateStyleSubtab(subtabName) {
  styleSubtabButtons.forEach((button) => {
    const isActive = button.dataset.styleSubtab === subtabName;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  styleSubtabPanels.forEach((panel) => {
    const isActive = panel.dataset.styleSubtabPanel === subtabName;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });
}

function activateContentSubtab(subtabName) {
  contentSubtabButtons.forEach((button) => {
    const isActive = button.dataset.contentSubtab === subtabName;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  contentSubtabPanels.forEach((panel) => {
    const isActive = panel.dataset.contentSubtabPanel === subtabName;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });

  if (subtabName === 'data' && qrFormat.value === 'geo') {
    window.requestAnimationFrame(() => {
      updateGeoMap();
    });
  }
}

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

function syncDebugOutlineSelection() {
  debugOutlineModeButtons.forEach((button) => {
    const isActive = button.dataset.outlineMode === activeDebugOutlineMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

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
    const qrDefinition = QRCode.create(payload, options);
    updateEncodingSummary(qrDefinition, options);
    setValidationMessage(formatValidationState.warning, [], formatValidationState.warning ? 'warning' : 'error');
    drawQr(qrDefinition, options);
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
  renderQr();
});

wifiEncryption.addEventListener('change', () => {
  syncChoiceButtons();
  syncWifiSecurityState();
  renderQr();
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
      syncCenterArtworkControls();
    }
    if (target === wifiEncryption) {
      syncWifiSecurityState();
    }

    if (target === qrFormat) {
      setFormatVisibility();
      activateContentSubtab('data');
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

pixelArtPalette.addEventListener('click', (event) => {
  const button = event.target.closest('.pixel-palette-button');
  if (!button) {
    return;
  }
  activePixelPaintColor = button.dataset.pixelColor || null;
  syncPixelArtPalette();
});

pixelArtColor.addEventListener('input', () => {
  activePixelPaintColor = pixelArtColor.value;
  syncPixelArtPalette();
});

pixelArtSizeInput.addEventListener('input', () => {
  resizePixelArt(Number.parseInt(pixelArtSizeInput.value, 10) || 16);
});

centerLogoInput.addEventListener('change', () => {
  const loadRequest = ++centerLogoLoadRequest;
  if (centerLogoObjectUrl) {
    URL.revokeObjectURL(centerLogoObjectUrl);
    centerLogoObjectUrl = '';
  }
  centerLogoImage = null;
  const [file] = centerLogoInput.files || [];
  if (!file || !file.type.startsWith('image/')) {
    renderQr();
    return;
  }

  centerLogoObjectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    if (loadRequest !== centerLogoLoadRequest) {
      return;
    }
    centerLogoImage = image;
    URL.revokeObjectURL(centerLogoObjectUrl);
    centerLogoObjectUrl = '';
    renderQr();
  };
  image.onerror = () => {
    if (loadRequest !== centerLogoLoadRequest) {
      return;
    }
    centerLogoImage = null;
    URL.revokeObjectURL(centerLogoObjectUrl);
    centerLogoObjectUrl = '';
    renderQr();
  };
  image.src = centerLogoObjectUrl;
});

centerLogoClear.addEventListener('click', () => {
  centerLogoLoadRequest += 1;
  if (centerLogoObjectUrl) {
    URL.revokeObjectURL(centerLogoObjectUrl);
    centerLogoObjectUrl = '';
  }
  centerLogoImage = null;
  centerLogoInput.value = '';
  renderQr();
});

pixelArtGrid.addEventListener('pointerdown', (event) => {
  const cell = event.target.closest('.pixel-art-cell');
  if (!cell) {
    return;
  }
  event.preventDefault();
  pixelPainting = true;
  pixelPaintValue = activePixelPaintColor;
  paintPixelArtCell(cell);
});

pixelArtGrid.addEventListener('pointermove', (event) => {
  if (!pixelPainting) {
    return;
  }
  event.preventDefault();
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.pixel-art-cell');
  if (cell && pixelArtGrid.contains(cell)) {
    paintPixelArtCell(cell);
  }
});

pixelArtGrid.addEventListener('click', (event) => {
  if (event.detail !== 0) {
    return;
  }
  const cell = event.target.closest('.pixel-art-cell');
  if (!cell) {
    return;
  }
  pixelPaintValue = activePixelPaintColor;
  paintPixelArtCell(cell);
});

window.addEventListener('pointerup', () => {
  pixelPainting = false;
});

window.addEventListener('pointercancel', () => {
  pixelPainting = false;
});

pixelArtClear.addEventListener('click', () => {
  pixelArtPixels = Array(pixelArtSize * pixelArtSize).fill(null);
  syncPixelArtGrid();
  renderQr();
});

fileChunkIndex.addEventListener('input', () => {
  invalidateChunkCapacityCache();
  syncFileCapacityHint();
  renderQr();
});

chunkPreviewPrev.addEventListener('click', () => {
  const current = Number.parseInt(fileChunkIndex.value, 10) || 1;
  if (current <= 1) {
    return;
  }

  fileChunkIndex.value = String(current - 1);
  syncFileChunkLabel();
  syncChunkPreviewNavigation();
  renderQr();
});

chunkPreviewNext.addEventListener('click', () => {
  const current = Number.parseInt(fileChunkIndex.value, 10) || 1;
  const total = Number.parseInt(fileChunkIndex.max, 10) || 1;
  if (current >= total) {
    return;
  }

  fileChunkIndex.value = String(current + 1);
  syncFileChunkLabel();
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

phoneFormatButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activePhoneFormat = button.dataset.phoneFormat || 'usa';
    syncPhoneFormatButtons();
    applyPhoneFormatToInput(phoneNumber);
    syncPhoneValuesAcrossAll(phoneNumber);
    applyPhoneFormatToInput(smsNumber);
    applyPhoneFormatToInput(vcardPhone);
    renderQr();
  });
});

phoneNumber.addEventListener('input', () => {
  syncPhoneValuesAcrossAll(phoneNumber);
});

phoneNumber.addEventListener('blur', () => {
  applyPhoneFormatToInput(phoneNumber);
  syncPhoneValuesAcrossAll(phoneNumber);
  applyPhoneFormatToInput(smsNumber);
  applyPhoneFormatToInput(vcardPhone);
  renderQr();
});

smsNumber.addEventListener('input', () => {
  syncPhoneValuesAcrossAll(smsNumber);
});

smsNumber.addEventListener('blur', () => {
  applyPhoneFormatToInput(smsNumber);
  syncPhoneValuesAcrossAll(smsNumber);
  applyPhoneFormatToInput(phoneNumber);
  applyPhoneFormatToInput(vcardPhone);
  renderQr();
});

vcardPhone.addEventListener('input', () => {
  syncPhoneValuesAcrossAll(vcardPhone);
});

vcardPhone.addEventListener('blur', () => {
  applyPhoneFormatToInput(vcardPhone);
  syncPhoneValuesAcrossAll(vcardPhone);
  applyPhoneFormatToInput(phoneNumber);
  applyPhoneFormatToInput(smsNumber);
  renderQr();
});

emailTo.addEventListener('input', () => {
  syncEmailValuesAcrossAll(emailTo);
});

vcardEmail.addEventListener('input', () => {
  syncEmailValuesAcrossAll(vcardEmail);
});

textInput.addEventListener('input', () => {
  syncMessageValuesAcrossAll(textInput);
  syncSmsLengthHint();
  syncEmailBodyLengthHint();
});

smsBody.addEventListener('input', () => {
  syncMessageValuesAcrossAll(smsBody);
  syncSmsLengthHint();
  syncEmailBodyLengthHint();
});

emailBody.addEventListener('input', () => {
  syncMessageValuesAcrossAll(emailBody);
  syncSmsLengthHint();
  syncEmailBodyLengthHint();
});

debugOutlineModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeDebugOutlineMode = button.dataset.outlineMode || 'codewords';
    syncDebugOutlineSelection();
    renderQr();
  });
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateTab(button.dataset.tab);
  });
});

debugSubtabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateDebugSubtab(button.dataset.subtab || 'encoding');
  });
});

styleSubtabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateStyleSubtab(button.dataset.styleSubtab || 'size');
  });
});

contentSubtabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateContentSubtab(button.dataset.contentSubtab || 'data');
  });
});

ensurePixelArtPalette();
ensurePixelArtGrid();
syncPixelArtGrid();
syncOutputs();
textInput.value = getDefaultUrlValue();
setFormatVisibility();
ensureMaskButtons();
syncMaskSelection();
syncChoiceButtons();
syncWifiSecurityState();
syncPhoneFormatButtons();
syncFileCapacityHint();
syncChunkVersionControls();
syncFileChunkLabel();
applyPhoneFormatToInput(phoneNumber);
syncPhoneValuesAcrossAll(phoneNumber);
applyPhoneFormatToInput(smsNumber);
applyPhoneFormatToInput(vcardPhone);
syncEmailValuesAcrossAll(vcardEmail);
syncMessageValuesAcrossAll(textInput);
syncSmsLengthHint();
syncEmailBodyLengthHint();
syncDebugOutlineSelection();
activateContentSubtab('data');
activateStyleSubtab('size');
activateDebugSubtab('encoding');
activateTab('content');
triggerDownloadFromLocationPayload();
renderQr();
