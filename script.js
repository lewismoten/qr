const form = document.getElementById('qr-form');
const canvas = document.getElementById('qr-canvas');
const optionsPreview = document.getElementById('options-preview');
const encodedPreview = document.getElementById('encoded-preview');
const payloadRevealSecrets = document.getElementById('payload-reveal-secrets');
const payloadRevealToggle = document.getElementById('payload-reveal-toggle');
const qrFormat = document.getElementById('qr-format');
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
const modeValidation = document.getElementById('mode-validation');
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');
const debugEnabled = document.getElementById('debug-enabled');
const debugOutlineModeButtons = document.querySelectorAll('.outline-mode-button');

const textInput = document.getElementById('text-input');
const urlInput = document.getElementById('url-input');
const wifiSsid = document.getElementById('wifi-ssid');
const wifiPassword = document.getElementById('wifi-password');
const wifiEncryption = document.getElementById('wifi-encryption');
const wifiHidden = document.getElementById('wifi-hidden');
const emailTo = document.getElementById('email-to');
const emailSubject = document.getElementById('email-subject');
const emailBody = document.getElementById('email-body');
const phoneNumber = document.getElementById('phone-number');
const smsNumber = document.getElementById('sms-number');
const smsBody = document.getElementById('sms-body');
const geoLatitude = document.getElementById('geo-latitude');
const geoLongitude = document.getElementById('geo-longitude');
const geoQuery = document.getElementById('geo-query');
const geoMapElement = document.getElementById('geo-map');
const geoMapStatus = document.getElementById('geo-map-status');
const vcardName = document.getElementById('vcard-name');
const vcardOrg = document.getElementById('vcard-org');
const vcardTitle = document.getElementById('vcard-title');
const vcardPhone = document.getElementById('vcard-phone');
const vcardEmail = document.getElementById('vcard-email');
const vcardUrl = document.getElementById('vcard-url');
const fileInput = document.getElementById('file-input');

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
let geoMap = null;
let geoMarker = null;
let geoPopup = null;
let geoLabelMarker = null;
let activeTabName = 'content';
let activeDebugOutlineMode = 'codewords';

function isDebugOverlayActive() {
  return activeTabName === 'debug' || debugEnabled.checked;
}

function getDefaultUrlValue() {
  if (window.location.protocol === 'file:') {
    return 'https://qr.lewismoten.com';
  }

  return window.location.href;
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
  qrWidthValue.textContent = qrWidthAuto.checked ? 'Auto' : `${qrWidth.value} px`;
}

function formatScaleLabel() {
  qrScaleValue.textContent = qrScale.value;
}

function formatMarginLabel() {
  qrMarginValue.textContent = qrMargin.value;
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
  formatVersionLabel();
  formatErrorCorrection();
  qrVersion.disabled = versionAuto.checked;
  encodingMode.disabled = modeAuto.checked;
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
}

async function readSelectedFile() {
  const file = fileInput.files?.[0];
  if (!file) {
    cachedFile = null;
    cachedFilePayload = '';
    return '';
  }

  if (cachedFile === file && cachedFilePayload) {
    return cachedFilePayload;
  }

  const payload = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });

  cachedFile = file;
  cachedFilePayload = payload;
  return payload;
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

function buildEmailPayload() {
  const params = new URLSearchParams();
  if (emailSubject.value.trim()) {
    params.set('subject', emailSubject.value.trim());
  }
  if (emailBody.value.trim()) {
    params.set('body', emailBody.value.trim());
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
    geoMapStatus.textContent = 'Map preview could not load.';
    return;
  }

  ensureGeoMap();

  const coordinates = getGeoCoordinates();
  const label = geoQuery.value.trim();

  if (!coordinates) {
    geoMapStatus.textContent = 'Enter latitude and longitude to preview the location.';
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
  geoMapStatus.textContent = label
    ? `Marker: ${label} at ${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`
    : `Marker at ${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`;

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
    case 'url':
      return urlInput.value;
    case 'wifi':
      return buildWifiPayload();
    case 'email':
      return buildEmailPayload();
    case 'phone':
      return phoneNumber.value.trim() ? `tel:${phoneNumber.value.trim()}` : '';
    case 'sms':
      if (!smsNumber.value.trim() && !smsBody.value.trim()) {
        return '';
      }
      return `SMSTO:${smsNumber.value.trim()}:${smsBody.value}`;
    case 'geo':
      if (!geoLatitude.value.trim() || !geoLongitude.value.trim()) {
        return '';
      }
      return buildGeoPayload();
    case 'vcard':
      return buildVCardPayload();
    case 'file':
      return readSelectedFile();
    default:
      return '';
  }
}

function buildEncodedPreviewTemplate() {
  switch (qrFormat.value) {
    case 'text':
      return textInput.value || '[enter plain text]';
    case 'url':
      return urlInput.value || 'https://example.com';
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
      return `tel:${placeholderValue(phoneNumber.value, '[phone-number]')}`;
    case 'sms':
      return `SMSTO:${placeholderValue(smsNumber.value, '[phone-number]')}:${placeholderValue(
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
      const file = fileInput.files?.[0];
      return file ? `[data URL for ${file.name}]` : '[choose a file to encode]';
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
      dark: colorDark.value.trim() || '#111827',
      light: colorLight.value.trim() || '#ffffff',
    },
  };

  if (!qrWidthAuto.checked) {
    baseOptions.width = readInteger(qrWidth) ?? 320;
  }

  const version = versionAuto.checked ? undefined : readInteger(qrVersion);
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

  return { ...baseOptions, ...extraOptions };
}

function buildPayload(encodedText) {
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

function updateEncodedPreview(encodedText) {
  encodedPreview.textContent = getEncodedPreviewText(encodedText);
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

function setValidationMessage(message, invalidIndexes = []) {
  modeValidation.hidden = !message;
  modeValidation.textContent = message;
  encodedPreview.classList.toggle('has-error', Boolean(message));

  const activeFieldset = document.querySelector(`.format-fields[data-format-fields="${qrFormat.value}"]`);
  activeFieldset?.classList.toggle('has-error', Boolean(message));

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
}

function buildMaskPreviewOptions(maskValue) {
  const selectedErrorLevel = getSelectedErrorLevel();
  const options = {
    errorCorrectionLevel: selectedErrorLevel.value,
    margin: 1,
    width: 72,
    color: {
      dark: colorDark.value.trim() || '#111827',
      light: colorLight.value.trim() || '#ffffff',
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

function drawQr(qrDefinition, options) {
  const marginModules = options.margin ?? 4;
  const moduleCount = qrDefinition.modules.size;
  const totalModules = moduleCount + marginModules * 2;
  const canvasSize = typeof options.width === 'number' ? options.width : totalModules * (options.scale ?? 4);
  const cellSize = canvasSize / totalModules;
  const context = canvas.getContext('2d');
  const debugActive = isDebugOverlayActive();
  const debugModel = debugActive ? buildDebugOverlayModel(qrDefinition, options) : null;

  canvas.width = canvasSize;
  canvas.height = canvasSize;

  const backgroundColor = options.color.light;
  const quietColor = options.color.light;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = quietColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = backgroundColor;
  context.fillRect(
    marginModules * cellSize,
    marginModules * cellSize,
    moduleCount * cellSize,
    moduleCount * cellSize
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

      const category = debugActive
        ? getDebugCategory(row, column, qrDefinition, debugModel, 'overlay')
        : getModuleCategory(qrDefinition, row, column);
      context.fillStyle = debugActive ? hexToRgba(debugColors[category].value, 1) : options.color.dark;
      context.fillRect(
        (column + marginModules) * cellSize,
        (row + marginModules) * cellSize,
        Math.ceil(cellSize),
        Math.ceil(cellSize)
      );
    }
  }

  if (debugActive) {
    drawHighlightedBoundaries(context, qrDefinition, debugModel, marginModules, cellSize);
    drawCodewordOutlines(context, debugModel, marginModules, cellSize);
    drawCodewordPaths(context, qrDefinition, debugModel, marginModules, cellSize);
  }
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
    clearCanvas();
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

  const isModeValid = validateManualMode(encodedText);
  if (!encodedText.trim()) {
    clearCanvas();
    updateEncodingSummary(null, options);
    return;
  }

  if (!isModeValid) {
    clearCanvas();
    updateEncodingSummary(null, options);
    return;
  }

  try {
    const payload = buildPayload(encodedText);
    const qrDefinition = QRCode.create(payload, options);
    updateEncodingSummary(qrDefinition, options);
    setValidationMessage('');
    drawQr(qrDefinition, options);
  } catch (error) {
    clearCanvas();
    setValidationMessage(error.message || 'Unable to encode this content.');
    updateEncodingSummary(null, options);
    console.error(error);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
});

form.addEventListener('input', () => {
  renderQr();
});

fileInput.addEventListener('change', () => {
  cachedFile = null;
  cachedFilePayload = '';
  renderQr();
});

qrFormat.addEventListener('change', () => {
  setFormatVisibility();
  renderQr();
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

syncOutputs();
urlInput.value = getDefaultUrlValue();
setFormatVisibility();
ensureMaskButtons();
syncMaskSelection();
syncDebugOutlineSelection();
activateTab('content');
renderQr();
