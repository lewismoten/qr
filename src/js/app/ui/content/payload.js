import { serializeEmail, serializeGeo, serializePhone, serializeSms, serializeVCard,
  serializeWifi } from '../../content-formats.js';
import { normalizePhoneNumber } from '../../phone.js';
import { encodeStreamPosition, getCompactFileExtension, getFileManifestFlag } from './file/protocol.js';

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
      case 'phone': return serializePhone(e.phoneNumber.value);
      case 'sms':
        return !e.smsNumber.value.trim() && !e.smsBody.value.trim()
          ? ''
          : serializeSms({ number: e.smsNumber.value, message: e.smsBody.value });
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
        return serializeWifi({ security: encryption,
          ssid: valueOr(e.wifiSsid.value, '[network-name]'),
          password: valueOr(e.wifiPassword.value, '[password]'), hidden: e.wifiHidden.checked });
      }
      case 'email': return serializeEmail({ email: valueOr(e.emailTo.value, '[recipient@example.com]'),
        subject: valueOr(e.emailSubject.value, '[subject]'),
        body: valueOr(e.emailBody.value, '[message]') });
      case 'phone': return `tel:${normalizePhoneNumber(e.phoneNumber.value) || '[phone-number]'}`;
      case 'sms': return serializeSms({ number: e.smsNumber.value,
        message: valueOr(e.smsBody.value, '[message]') })
        .replace('SMSTO::', 'SMSTO:[phone-number]:');
      case 'event': return builders.event();
      case 'geo': return serializeGeo({ latitude: valueOr(e.geoLatitude.value, '[latitude]'),
        longitude: valueOr(e.geoLongitude.value, '[longitude]'), label: e.geoQuery.value });
      case 'vcard': return serializeVCard({ name: valueOr(e.vcardName.value, '[full-name]'),
        organization: valueOr(e.vcardOrg.value, '[organization]'),
        title: valueOr(e.vcardTitle.value, '[title]'),
        phone: valueOr(e.vcardPhone.value, '[phone-number]'),
        email: valueOr(e.vcardEmail.value, '[email]'), url: valueOr(e.vcardUrl.value, '[website]') });
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
