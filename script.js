const form = document.getElementById('qr-form');
const input = document.getElementById('qr-input');
const canvas = document.getElementById('qr-canvas');
const status = document.getElementById('status');
const optionsPreview = document.getElementById('options-preview');
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
const tabButtons = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

const MASK_VALUES = ['', '0', '1', '2', '3', '4', '5', '6', '7'];

const ERROR_LEVELS = [
  { value: 'L', label: 'Low', detail: 'About 7% recovery.' },
  { value: 'M', label: 'Medium', detail: 'About 15% recovery.' },
  { value: 'Q', label: 'Quartile', detail: 'About 25% recovery.' },
  { value: 'H', label: 'High', detail: 'About 30% recovery.' },
];

const MODE_LABELS = {
  numeric: 'Numeric',
  alphanumeric: 'Alphanumeric',
  byte: 'Byte / Binary',
  kanji: 'Kanji',
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

function buildInputPayload() {
  const value = input.value;
  const mode = getCurrentEncodingMode();

  if (!value.trim()) {
    return value;
  }

  if (!mode) {
    return value;
  }

  return [{ data: value, mode }];
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

function updateOptionsPreview(options) {
  optionsPreview.textContent = JSON.stringify(options, null, 2);
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

function updateEncodingSummary(payload, options) {
  if (!input.value.trim()) {
    detectedMode.textContent = 'Waiting for content';
    segmentSummary.textContent = '0';
    versionSummary.textContent = 'Auto';
    capacitySummary.textContent = '-';
    status.textContent = '';
    return;
  }

  const qrDefinition = QRCode.create(payload, options);
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
    capacitySummary.textContent = capacity ? `${capacity} max` : '-';
  }

  status.textContent = `${detectedMode.textContent} • Version ${versionValue} • ${correctionLevel}`;
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

function renderMaskPreviews() {
  ensureMaskButtons();

  const previewValue = input.value.trim() || 'Preview';
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

function getCanvasSize(payload, options) {
  if (typeof options.width === 'number') {
    return options.width;
  }

  const qrDefinition = QRCode.create(payload || 'Preview', options);
  const moduleCount = qrDefinition.modules.size;
  const scale = options.scale ?? 4;
  const margin = options.margin ?? 4;

  return (moduleCount + margin * 2) * scale;
}

function activateTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle('is-active', isActive);
    panel.hidden = !isActive;
  });
}

function renderQr() {
  const payload = buildInputPayload();
  let options;

  try {
    options = buildOptions();
  } catch (error) {
    clearCanvas();
    status.textContent = 'Advanced JSON is invalid.';
    optionsPreview.textContent = optionsJson.value.trim() || '{}';
    console.error(error);
    return;
  }

  syncOutputs();
  syncMaskSelection();
  renderMaskPreviews();
  updateOptionsPreview(options);
  updateEncodingSummary(payload, options);

  if (!input.value.trim()) {
    clearCanvas();
    return;
  }

  const canvasSize = getCanvasSize(payload, options);
  canvas.width = canvasSize;
  canvas.height = canvasSize;

  QRCode.toCanvas(canvas, payload, options, (error) => {
    if (error) {
      status.textContent = 'Unable to generate QR code.';
      console.error(error);
    }
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
});

form.addEventListener('input', () => {
  renderQr();
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateTab(button.dataset.tab);
  });
});

syncOutputs();
ensureMaskButtons();
syncMaskSelection();
activateTab('content');
renderQr();
