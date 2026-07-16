const form = document.getElementById('qr-form');
const input = document.getElementById('qr-input');
const canvas = document.getElementById('qr-canvas');
const status = document.getElementById('status');

function renderQr(value) {
  canvas.width = 240;
  canvas.height = 240;

  if (!value.trim()) {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    status.textContent = 'Enter some text or a URL to make a QR code.';
    return;
  }

  status.textContent = 'Generating...';

  QRCode.toCanvas(
    canvas,
    value,
    {
      width: 240,
      margin: 1,
      color: { dark: '#111827', light: '#ffffff' },
    },
    (error) => {
      if (error) {
        status.textContent = 'Unable to generate QR code.';
        console.error(error);
        return;
      }
      status.textContent = 'QR code ready.';
    }
  );
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  renderQr(input.value);
});

renderQr(input.value);
