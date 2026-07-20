import { lookup } from '../../../../i18n/index.js';
import { validatePrintableText } from '../../../data/validation.js';

const HEX_PATTERN = /^[\dA-Fa-f]+$/;
const PRINTABLE_ASCII_PATTERN = /^[\x20-\x7e]+$/;
const WEP_ASCII_SHORT_LENGTH = 5;
const WEP_ASCII_LONG_LENGTH = 13;
const WEP_HEX_SHORT_LENGTH = 10;
const WEP_HEX_LONG_LENGTH = 26;
const WEP_ASCII_LENGTHS = new Set([
  WEP_ASCII_SHORT_LENGTH,
  WEP_ASCII_LONG_LENGTH,
]);
const WEP_HEX_LENGTHS = new Set([WEP_HEX_SHORT_LENGTH, WEP_HEX_LONG_LENGTH]);
const SECURITY_TYPES = new Set(['WPA', 'WEP', 'nopass']);
const MAXIMUM_SSID_BYTES = 32;
const MAXIMUM_PASSWORD_LENGTH = 64;
const WPA_MINIMUM_PASSWORD_LENGTH = 8;
const WPA_MAXIMUM_PASSWORD_LENGTH = 63;

function message(key, fallback, options) {
  return lookup(`validation.wifi.${key}`, fallback, options);
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
    maxLength: MAXIMUM_SSID_BYTES,
  });
  if (ssidError) return ssidError;
  if (new TextEncoder().encode(ssid).length > MAXIMUM_SSID_BYTES) {
    return message(
      'ssidBytes',
      'Not valid for Wi-Fi format yet: network name must fit within {maxBytes} UTF-8 bytes.',
      { maxBytes: MAXIMUM_SSID_BYTES },
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
    maxLength: MAXIMUM_PASSWORD_LENGTH,
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
          'Not valid for Wi-Fi format yet: WEP keys must be {asciiShort} or {asciiLong} characters, or {hexShort} or {hexLong} hexadecimal digits.',
          {
            asciiShort: WEP_ASCII_SHORT_LENGTH,
            asciiLong: WEP_ASCII_LONG_LENGTH,
            hexShort: WEP_HEX_SHORT_LENGTH,
            hexLong: WEP_HEX_LONG_LENGTH,
          },
        );
  }

  const validHexKey =
    password.length === MAXIMUM_PASSWORD_LENGTH && HEX_PATTERN.test(password);
  return validHexKey ||
    (password.length >= WPA_MINIMUM_PASSWORD_LENGTH &&
      password.length <= WPA_MAXIMUM_PASSWORD_LENGTH)
    ? ''
    : message(
        'wpaPassword',
        'Not valid for Wi-Fi format yet: WPA passwords must be {minimum} to {maximum} characters, or exactly {hexLength} hexadecimal digits.',
        {
          minimum: WPA_MINIMUM_PASSWORD_LENGTH,
          maximum: WPA_MAXIMUM_PASSWORD_LENGTH,
          hexLength: MAXIMUM_PASSWORD_LENGTH,
        },
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
