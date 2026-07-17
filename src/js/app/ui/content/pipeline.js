import { parseBoolean } from '../../csv.js';
import { serializeBulkRow } from './bulk/payload.js';
import { createFrameSection } from './frame/section.js';
import { createContentPayload, createFilePayloadPreview } from './payload.js';

export function createContentPipeline({
  elements: e,
  bulk,
  number,
  file,
  builders,
  runtime,
  alphanumericCharacters,
}) {
  const buildBulkText = (row = bulk.getRow()) =>
    serializeBulkRow({
      row,
      format: e.format.value,
      frameIndex: runtime.getFrameIndex(),
      alphanumericCharacters,
    });
  const frame = createFrameSection({
    format: e.format,
    isBulkMode: bulk.isMode,
    getBulkRow: bulk.getRow,
    buildBulkText,
    parseBoolean,
    getNumberPayload: number.getPayload,
    getActiveFile: file.getActive,
    getFileMode: file.getMode,
    fileIndex: e.fileIndex,
    mode: e.frameMode,
    customField: e.customFrameField,
    customMessage: e.customFrameMessage,
    centerCheckbox: e.frameCenter,
    artCenterCheckbox: e.frameCenterArt,
    artMode: e.artMode,
    font: e.frameFont,
    values: {
      url: e.url,
      text: e.text,
      wifi: e.wifi,
      email: e.email,
      phone: e.phone,
      sms: e.sms,
      geoLabel: e.geoLabel,
      latitude: e.latitude,
      longitude: e.longitude,
      vcardName: e.vcardName,
      vcardOrg: e.vcardOrg,
      vcardEmail: e.vcardEmail,
    },
    event: e.event,
    onDisableArtwork() {
      e.artMode.value = 'none';
      runtime.syncChoices();
      runtime.syncArtwork();
    },
  });
  const payload = createContentPayload({
    elements: {
      qrFormat: e.format,
      urlInput: e.url,
      textInput: e.text,
      phoneNumber: e.phone,
      smsNumber: e.sms,
      smsBody: e.smsBody,
      wifiEncryption: e.wifiEncryption,
      wifiSsid: e.wifi,
      wifiPassword: e.wifiPassword,
      wifiHidden: e.wifiHidden,
      emailTo: e.email,
      emailSubject: e.emailSubject,
      emailBody: e.emailBody,
      geoLatitude: e.latitude,
      geoLongitude: e.longitude,
      geoQuery: e.geoLabel,
      vcardName: e.vcardName,
      vcardOrg: e.vcardOrg,
      vcardTitle: e.vcardTitle,
      vcardPhone: e.vcardPhone,
      vcardEmail: e.vcardEmail,
      vcardUrl: e.vcardUrl,
    },
    bulk: { isMode: bulk.isMode, build: buildBulkText },
    builders,
    file: {
      preview: createFilePayloadPreview({
        getFile: file.getActive,
        getMode: file.getMode,
        getCapacity: file.getCapacity,
        includeManifest: e.includeManifest,
      }),
    },
  });
  return { frame, payload, buildBulkText };
}
