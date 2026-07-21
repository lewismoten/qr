import { base64UrlToBase64 } from '../content/file/transfer/protocol.js';

const OBJECT_URL_REVOCATION_DELAY_MS = 1000;

export function restoreLocationDownload({ window, document }) {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const data = params.get('data') || '';
  if (params.get('download') !== '1' || !data) return;
  try {
    const binary = atob(base64UrlToBase64(data));
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );
    const blob = new Blob([bytes], {
      type: params.get('type') || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = params.get('name') || 'download.bin';
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(
      () => URL.revokeObjectURL(url),
      OBJECT_URL_REVOCATION_DELAY_MS,
    );
  } catch (error) {
    console.error(
      'Unable to restore downloadable file from the QR URL.',
      error,
    );
  }
}
