import { createEmailCapacity } from './email/capacity.js';
import { createContentPipeline } from './pipeline.js';
import { createFormatValidator } from './validation.js';
import { createQrConfiguration } from '../encoding/configuration.js';

export function createContentEncodingSetup({ e, encoder, bulk, file, sections, runtime, helpers, config }) {
  const pipeline = createContentPipeline({
    elements: { format: e.qrFormat, fileIndex: e.fileChunkIndex,
      frameMode: e.frameMessageMode, customFrameField: e.customFrameMessageField,
      customFrameMessage: e.customFrameMessage, frameCenter: e.frameMessageCenter,
      frameCenterArt: e.frameMessageCenterArt, artMode: e.centerArtMode,
      frameFont: e.frameFont, url: e.urlInput, text: e.textInput, wifi: e.wifiSsid,
      email: e.emailTo, phone: e.phoneNumber, sms: e.smsNumber, smsBody: e.smsBody,
      geoLabel: e.geoQuery, latitude: e.geoLatitude, longitude: e.geoLongitude,
      vcardName: e.vcardName, vcardOrg: e.vcardOrg, vcardTitle: e.vcardTitle,
      vcardPhone: e.vcardPhone, vcardEmail: e.vcardEmail, vcardUrl: e.vcardUrl,
      wifiEncryption: e.wifiEncryption, wifiPassword: e.wifiPassword,
      wifiHidden: e.wifiHidden, emailSubject: e.emailSubject, emailBody: e.emailBody,
      includeManifest: e.fileIncludeManifest,
      event: { title: e.eventTitle, allDay: e.eventAllDay, startDate: e.eventStartDate,
        startTime: e.eventStartTime, endDate: e.eventEndDate, endTime: e.eventEndTime } },
    bulk: { isMode: bulk.isMode, getRow: bulk.getRow },
    number: { getPayload: sections.number.getPayload },
    file: { getActive: file.getActive, getMode: file.getMode, getCapacity: file.getCapacity },
    builders: { number: sections.number.getPayload, wifi: sections.wifi.buildPayload,
      email: sections.shared.buildEmailPayload, event: sections.event.buildPayload,
      geo: sections.geo.buildPayload, vcard: sections.vcard.buildPayload,
      file: file.buildPayload },
    runtime: { getFrameIndex: runtime.getFrameIndex, syncChoices: runtime.syncChoices,
      syncArtwork: runtime.syncArtwork },
    alphanumericCharacters: config.alphanumericCharacters,
  });
  const qr = createQrConfiguration({
    elements: { qrMargin: e.qrMargin, qrScale: e.qrScale, colorDark: e.colorDark,
      colorDarkTransparency: e.colorDarkTransparency, colorLight: e.colorLight,
      colorLightTransparency: e.colorLightTransparency, qrWidthAuto: e.qrWidthAuto,
      qrWidth: e.qrWidth, qrFormat: e.qrFormat, versionAuto: e.versionAuto,
      qrVersion: e.qrVersion, maskPattern: e.maskPattern,
      modeAuto: e.modeAuto },
    encoder,
    helpers: { getErrorLevel: helpers.getErrorLevel, readInteger: helpers.readInteger,
      colorWithTransparency: helpers.colorWithTransparency, getFileMode: file.getMode,
      getChunkVersion: file.getChunkVersion, getEncodingMode: helpers.getEncodingMode },
    alphanumericCharacters: config.alphanumericCharacters,
  });
  const emailCapacity = createEmailCapacity({
    body: e.emailBody, hint: e.emailBodyLengthHint, encoder,
    buildOptions: qr.buildOptions, buildPayload: qr.buildPayload,
    buildEmail: sections.shared.buildEmailPayloadWithBody,
    isActive: () => e.qrFormat.value === 'email',
  });
  const validation = createFormatValidator({
    elements: { qrFormat: e.qrFormat, urlInput: e.urlInput,
      emailTo: e.emailTo, emailSubject: e.emailSubject,
      emailBody: e.emailBody, phoneNumber: e.phoneNumber, smsNumber: e.smsNumber,
      smsBody: e.smsBody, geoLatitude: e.geoLatitude, geoLongitude: e.geoLongitude,
      geoQuery: e.geoQuery, vcardName: e.vcardName, vcardOrg: e.vcardOrg,
      vcardTitle: e.vcardTitle, vcardPhone: e.vcardPhone, vcardEmail: e.vcardEmail,
      vcardUrl: e.vcardUrl, eventTitle: e.eventTitle, eventAllDay: e.eventAllDay,
      eventStartDate: e.eventStartDate, eventStartTime: e.eventStartTime,
      eventEndDate: e.eventEndDate, eventEndTime: e.eventEndTime,
      eventLocation: e.eventLocation, eventDescription: e.eventDescription,
      eventUrl: e.eventUrl },
    bulk: { isMode: bulk.isMode, getFrameIndex: runtime.getFrameIndex,
      getValidationState: bulk.getValidationState },
    numberSection: sections.number,
    file: { getActive: file.getActive, getMode: file.getMode, getCapacity: file.getCapacity },
    getEmailCapacity: emailCapacity.getInfo,
    limits: config.validationLimits,
  });
  const updateTextPreview = (text) => {
    const debugState = runtime.getDebugState();
    if (debugState.tab !== 'debug' || debugState.subtab !== 'payload') return;
    const preview = text || pipeline.payload.preview();
    e.encodedPreview.textContent = e.qrFormat.value === 'wifi'
      ? sections.wifi.maskPayload(preview)
      : preview;
  };
  return { pipeline, qr, emailCapacity, validation, updateTextPreview };
}
