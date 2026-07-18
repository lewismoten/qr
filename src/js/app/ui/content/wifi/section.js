import { serializeWifi } from '../../../content-formats.js';

export function createWifiSection({
  ssid,
  password,
  encryption,
  hidden,
  revealSecrets,
  onChange,
}) {
  const sync = () => {
    const open = encryption.value === 'nopass';
    password.disabled = open;
    password.setAttribute('aria-disabled', String(open));
    password.placeholder = open
      ? lookup('wifi.openPassword', 'Not used for open networks')
      : lookup('wifi.password', 'Password');
  };

  const buildPayload = () =>
    serializeWifi({
      security: encryption.value,
      ssid: ssid.value,
      password: password.value,
      hidden: hidden.checked,
    });
  const buildPreview = () =>
    serializeWifi({
      security: encryption.value || 'WPA',
      ssid:
        ssid.value.trim() ||
        lookup('content.preview.networkName', '[Network name]'),
      password:
        password.value || lookup('content.preview.password', '[Password]'),
      hidden: hidden.checked,
    });

  const maskPayload = (payload) =>
    revealSecrets.checked
      ? payload
      : payload.replace(/P:([^;]*)/, 'P:[hidden-password]');

  encryption.addEventListener('change', () => {
    sync();
    onChange();
  });

  return { sync, buildPayload, buildPreview, maskPayload };
}
import { lookup } from '../../../../i18n/index.js';

export function createWifiSectionFromDocument(document, options) {
  return createWifiSection({
    ssid: document.getElementById('wifi-ssid'),
    password: document.getElementById('wifi-password'),
    encryption: document.getElementById('wifi-encryption'),
    hidden: document.getElementById('wifi-hidden'),
    revealSecrets: document.getElementById('payload-reveal-secrets'),
    ...options,
  });
}
