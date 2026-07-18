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
  const buildBulkText = () =>
    bulk.build({
      frameIndex: runtime.getFrameIndex(),
      alphanumericCharacters,
    });
  const frameOptions = {
    format: e.format,
    isBulkMode: bulk.isMode,
    getBulkRow: bulk.getRow,
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
  };
  let frameController = null;
  let frameRequest = null;
  const ensureFrame = () => {
    if (frameController) return Promise.resolve(frameController);
    if (!frameRequest) {
      frameRequest = import('./frame/section.js')
        .then(({ createFrameSection }) => {
          frameController = createFrameSection(frameOptions);
          return frameController;
        })
        .catch((error) => {
          frameRequest = null;
          throw error;
        });
    }
    return frameRequest;
  };
  const frame = {
    getMessage() {
      if (e.frameMode.value === 'none') return '';
      if (frameController) return frameController.getMessage();
      ensureFrame().then(runtime.render).catch(console.error);
      return '';
    },
    setCentered(enabled) {
      e.frameCenter.checked = enabled;
      e.frameCenterArt.checked = enabled;
      if (enabled && e.artMode.value !== 'none') {
        frameOptions.onDisableArtwork();
      }
    },
    getFont: (size) =>
      frameController?.getFont(size) ??
      `800 ${size}px "Avenir Next", "Segoe UI", sans-serif`,
    sync() {
      e.customFrameField.hidden = e.frameMode.value !== 'custom';
      if (e.frameMode.value === 'auto') {
        ensureFrame().then(runtime.render).catch(console.error);
      }
    },
  };
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
    previews: builders.previews,
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
