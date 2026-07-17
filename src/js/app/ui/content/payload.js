import { normalizePhoneNumber } from '../../phone.js';
import { encodeStreamPosition, getCompactFileExtension, getFileManifestFlag } from './file/protocol.js';
import { escapeWifiValue } from './wifi/section.js';

const valueOr = (value, fallback) => value.trim() || fallback;

export function createContentPayload({ elements: e, bulk, builders, file }) {
  const build = async () => {
    if (bulk.isMode()) return bulk.build();
    switch (e.qrFormat.value) {
      case 'url': return e.urlInput.value.trim();
      case 'text': return e.textInput.value;
      case 'number': return builders.number();
      case 'wifi': return builders.wifi();
      case 'email': return builders.email();
      case 'phone': {
        const number = normalizePhoneNumber(e.phoneNumber.value);
        return number ? `tel:${number}` : '';
      }
      case 'sms':
        return !e.smsNumber.value.trim() && !e.smsBody.value.trim()
          ? ''
          : `SMSTO:${normalizePhoneNumber(e.smsNumber.value)}:${e.smsBody.value}`;
      case 'event': return builders.event();
      case 'geo': return e.geoLatitude.value.trim() && e.geoLongitude.value.trim() ? builders.geo() : '';
      case 'vcard': return builders.vcard();
      case 'file': return builders.file();
      default: return '';
    }
  };

  const preview = () => {
    if (bulk.isMode()) return bulk.build() || `[CSV row for ${e.qrFormat.value}]`;
    switch (e.qrFormat.value) {
      case 'url': return e.urlInput.value || '[enter a full https:// URL]';
      case 'text': return e.textInput.value || '[enter text]';
      case 'number': return builders.number();
      case 'wifi': {
        const encryption = e.wifiEncryption.value || 'WPA';
        const segments = [`T:${encryption}`, `S:${escapeWifiValue(valueOr(e.wifiSsid.value, '[network-name]'))}`];
        if (encryption !== 'nopass') segments.push(`P:${escapeWifiValue(valueOr(e.wifiPassword.value, '[password]'))}`);
        if (e.wifiHidden.checked) segments.push('H:true');
        return `WIFI:${segments.join(';')};;`;
      }
      case 'email': {
        const params = new URLSearchParams();
        params.set('subject', valueOr(e.emailSubject.value, '[subject]'));
        params.set('body', valueOr(e.emailBody.value, '[message]'));
        return `mailto:${valueOr(e.emailTo.value, '[recipient@example.com]')}?${params}`;
      }
      case 'phone': return `tel:${normalizePhoneNumber(e.phoneNumber.value) || '[phone-number]'}`;
      case 'sms': return `SMSTO:${normalizePhoneNumber(e.smsNumber.value) || '[phone-number]'}:${valueOr(e.smsBody.value, '[message]')}`;
      case 'event': return builders.event();
      case 'geo': {
        const coordinates = `${valueOr(e.geoLatitude.value, '[latitude]')},${valueOr(e.geoLongitude.value, '[longitude]')}`;
        return e.geoQuery.value.trim() ? `geo:${coordinates}?q=${encodeURIComponent(e.geoQuery.value.trim())}` : `geo:${coordinates}`;
      }
      case 'vcard': return [
        'BEGIN:VCARD', 'VERSION:3.0',
        `FN:${valueOr(e.vcardName.value, '[full-name]')}`,
        `ORG:${valueOr(e.vcardOrg.value, '[organization]')}`,
        `TITLE:${valueOr(e.vcardTitle.value, '[title]')}`,
        `TEL:${valueOr(e.vcardPhone.value, '[phone-number]')}`,
        `EMAIL:${valueOr(e.vcardEmail.value, '[email]')}`,
        `URL:${valueOr(e.vcardUrl.value, '[website]')}`,
        'END:VCARD',
      ].join('\n');
      case 'file': return file.preview();
      default: return '';
    }
  };

  return { build, preview };
}

export function createFilePayloadPreview({ getFile, getMode, getCapacity, includeManifest }) {
  return () => {
    const file = getFile();
    const mode = getMode();
    if (!file) return mode === 'chunked' ? 'FILE:1:S:M:[base64url-data]' : mode === 'blob' ? '[shareable download URL]' : '[data URL for a selected file]';
    if (mode === 'blob') return `[shareable download URL for ${file.name}]`;
    if (mode !== 'chunked') return `[data URL for ${file.name}]`;
    const { chunkCapacity, currentChunk, streamLength, isSingleFrame } = getCapacity(file);
    if (isSingleFrame) return includeManifest.checked ? 'FILE:1:S:M:[base64url-data]' : `FILE:1:S:-:${getCompactFileExtension(file.name)}:[base64url-data]`;
    const offset = Math.max(0, currentChunk - 1) * chunkCapacity;
    return `FILE:1:C:${getFileManifestFlag(includeManifest.checked)}:[base64url-id]:${getCompactFileExtension(file.name)}:${encodeStreamPosition(offset, streamLength)}:${streamLength}:[base64url-data]`;
  };
}
