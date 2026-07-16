const form = document.getElementById('qr-form');
const input = document.getElementById('qr-input');
const canvas = document.getElementById('qr-canvas');
const status = document.getElementById('status');
const optionsPreview = document.getElementById('options-preview');
const errorCorrection = document.getElementById('error-correction');
const qrVersion = document.getElementById('qr-version');
const maskPattern = document.getElementById('mask-pattern');
const qrWidth = document.getElementById('qr-width');
const qrScale = document.getElementById('qr-scale');
const qrMargin = document.getElementById('qr-margin');
const colorDark = document.getElementById('color-dark');
const colorLight = document.getElementById('color-light');
const optionsJson = document.getElementById('options-json');

function clearCanvas() {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function readInteger(inputElement) {
  if (!inputElement.value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(inputElement.value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function buildOptions() {
  const parsedWidth = readInteger(qrWidth);
  const baseOptions = {
    errorCorrectionLevel: errorCorrection.value,
    margin: readInteger(qrMargin) ?? 1,
    scale: readInteger(qrScale) ?? 4,
    width: parsedWidth ?? 240,
    color: {
      dark: colorDark.value.trim() || '#111827',
      light: colorLight.value.trim() || '#ffffff',
    },
  };

  const version = readInteger(qrVersion);
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

function renderQr(value) {
  let options;

  try {
    options = buildOptions();
  } catch (error) {
    clearCanvas();
    status.textContent = 'Extra options JSON is invalid.';
    optionsPreview.textContent = optionsJson.value.trim() || '{}';
    console.error(error);
    return;
  }

  const canvasSize = options.width ?? 240;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  updateOptionsPreview(options);

  if (!value.trim()) {
    clearCanvas();
    status.textContent = 'Enter some text or a URL to make a QR code.';
    return;
  }

  status.textContent = 'Generating...';

  QRCode.toCanvas(canvas, value, options, (error) => {
    if (error) {
      status.textContent = 'Unable to generate QR code.';
      console.error(error);
      return;
    }
    status.textContent = 'QR code ready.';
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  renderQr(input.value);
});

form.addEventListener('input', () => {
  renderQr(input.value);
});

renderQr(input.value);
