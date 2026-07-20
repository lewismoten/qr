import { lookup } from '../../../../i18n/index.js';
import { validatePrintableText } from '../../../data/validation.js';

const HEX_PATTERN = /^[\dA-Fa-f]+$/;
const PRINTABLE_ASCII_PATTERN = /^[\x20-\x7e]+$/;
const WEP_ASCII_LENGTHS = new Set([5, 13]);
const WEP_HEX_LENGTHS = new Set([10, 26]);
const SECURITY_TYPES = new Set(['WPA', 'WEP', 'nopass']);

function message(key, fallback) {
  return lookup(`validation.wifi.${key}`, fallback);
}

export function validateWifiValues({ security, ssid, password }) {
  if (!SECURITY_TYPES.has(security)) {
    return message(
      'security',
      'Not valid for Wi-Fi format yet: choose WPA, WEP, or Open.',
    );
  }

  if (!ssid.trim()) {
    return message(
      'ssidRequired',
      'Not valid for Wi-Fi format yet: network name is required.',
    );
  }
  const ssidError = validatePrintableText(ssid, {
    label: message('ssidLabel', 'Wi-Fi network name'),
    maxLength: 32,
  });
  if (ssidError) return ssidError;
  if (new TextEncoder().encode(ssid).length > 32) {
    return message(
      'ssidBytes',
      'Not valid for Wi-Fi format yet: network name must fit within 32 UTF-8 bytes.',
    );
  }

  if (security === 'nopass') return '';
  if (!password) {
    return message(
      'passwordRequired',
      'Not valid for Wi-Fi format yet: a password is required.',
    );
  }
  const passwordError = validatePrintableText(password, {
    label: message('passwordLabel', 'Wi-Fi password'),
    maxLength: 64,
  });
  if (passwordError) return passwordError;

  if (security === 'WEP') {
    const validAscii =
      WEP_ASCII_LENGTHS.has(password.length) &&
      PRINTABLE_ASCII_PATTERN.test(password);
    const validHex =
      WEP_HEX_LENGTHS.has(password.length) && HEX_PATTERN.test(password);
    return validAscii || validHex
      ? ''
      : message(
          'wepPassword',
          'Not valid for Wi-Fi format yet: WEP keys must be 5 or 13 characters, or 10 or 26 hexadecimal digits.',
        );
  }

  const validHexKey = password.length === 64 && HEX_PATTERN.test(password);
  return validHexKey || (password.length >= 8 && password.length <= 63)
    ? ''
    : message(
        'wpaPassword',
        'Not valid for Wi-Fi format yet: WPA passwords must be 8 to 63 characters, or exactly 64 hexadecimal digits.',
      );
}

export function validateWifi(document) {
  const error = validateWifiValues({
    security: document.getElementById('wifi-encryption').value,
    ssid: document.getElementById('wifi-ssid').value,
    password: document.getElementById('wifi-password').value,
  });
  return { error, warning: '' };
}
