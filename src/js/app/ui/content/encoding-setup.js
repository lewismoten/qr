import { createContentPipeline } from './pipeline.js';
import { validateUrl } from './url-validation.js';
import { createQrConfiguration } from '../encoding/configuration.js';
import { createLoadingIndicator } from '../loading-indicator.js';

export function createContentEncodingSetup({
  document,
  e,
  encoder,
  bulk,
  file,
  sections,
  runtime,
  helpers,
  config,
}) {
  const pipeline = createContentPipeline({
    document,
    elements: {
      format: e.qrFormat,
      fileIndex: e.fileChunkIndex,
      frameMode: e.frameMessageMode,
      customFrameField: e.customFrameMessageField,
      customFrameMessage: e.customFrameMessage,
      frameCenter: e.frameMessageCenter,
      frameCenterArt: e.frameMessageCenterArt,
      artMode: e.centerArtMode,
      frameFont: e.frameFont,
      url: e.urlInput,
      text: e.textInput,
      includeManifest: e.fileIncludeManifest,
    },
    bulk: { isMode: bulk.isMode, getRow: bulk.getRow, build: bulk.build },
    number: { getPayload: sections.number.getPayload },
    file: {
      getActive: file.getActive,
      getMode: file.getMode,
      getCapacity: file.getCapacity,
    },
    builders: {
      number: sections.number.getPayload,
      wifi: sections.wifi.buildPayload,
      email: sections.shared.buildEmailPayload,
      phone: sections.phone.buildPhonePayload,
      sms: sections.phone.buildSmsPayload,
      event: sections.event.buildPayload,
      geo: sections.geo.buildPayload,
      vcard: sections.vcard.buildPayload,
      file: file.buildPayload,
      previews: {
        number: sections.number.getPreview,
        wifi: sections.wifi.buildPreview,
        email: sections.shared.buildEmailPreview,
        phone: sections.phone.buildPhonePreview,
        sms: sections.phone.buildSmsPreview,
        event: sections.event.buildPreview,
        geo: sections.geo.buildPreview,
        vcard: sections.vcard.buildPreview,
      },
    },
    runtime: {
      getFrameIndex: runtime.getFrameIndex,
      syncChoices: runtime.syncChoices,
      syncArtwork: runtime.syncArtwork,
    },
    alphanumericCharacters: config.alphanumericCharacters,
  });
  const qr = createQrConfiguration({
    elements: {
      qrMargin: e.qrMargin,
      qrScale: e.qrScale,
      colorDark: e.colorDark,
      colorDarkTransparency: e.colorDarkTransparency,
      colorLight: e.colorLight,
      colorLightTransparency: e.colorLightTransparency,
      qrWidthAuto: e.qrWidthAuto,
      qrWidth: e.qrWidth,
      qrFormat: e.qrFormat,
      versionAuto: e.versionAuto,
      qrVersion: e.qrVersion,
      maskPattern: e.maskPattern,
      modeAuto: e.modeAuto,
    },
    encoder,
    helpers: {
      getErrorLevel: helpers.getErrorLevel,
      readInteger: helpers.readInteger,
      colorWithTransparency: helpers.colorWithTransparency,
      getFileMode: file.getMode,
      getChunkVersion: file.getChunkVersion,
      getEncodingMode: helpers.getEncodingMode,
    },
    alphanumericCharacters: config.alphanumericCharacters,
  });
  const loading = createLoadingIndicator({
    region: e.tabPanels[0]?.parentElement,
  });
  const emailCapacityOptions = {
    encoder,
    buildOptions: qr.buildOptions,
    buildPayload: qr.buildPayload,
    buildEmail: sections.shared.buildEmailPayloadWithBody,
    isActive: () => e.qrFormat.value === 'email',
  };
  let emailCapacityController = null;
  let emailCapacityRequest = null;
  const ensureEmailCapacity = () => {
    if (emailCapacityController) {
      return Promise.resolve(emailCapacityController);
    }
    if (!emailCapacityRequest) {
      emailCapacityRequest = loading
        .track(import('./email/capacity.js'))
        .then(({ createEmailCapacityFromDocument }) => {
          emailCapacityController = createEmailCapacityFromDocument(
            document,
            emailCapacityOptions,
          );
          return emailCapacityController;
        });
    }
    return emailCapacityRequest;
  };
  const emailCapacity = {
    getInfo: () =>
      emailCapacityController?.getInfo() ?? {
        current: document.getElementById('email-body')?.value.length ?? 0,
        max: 0,
      },
    sync() {
      if (e.qrFormat.value !== 'email') return;
      ensureEmailCapacity()
        .then((controller) => controller.sync())
        .catch(console.error);
    },
  };
  const validatorLoaders = {
    email: () => import('./email/validation.js'),
    event: () => import('./event/validation.js'),
    file: () => import('./file/validation.js'),
    geo: () => import('./geo/validation.js'),
    phone: () => import('./phone/validation.js'),
    sms: () => import('./phone/validation.js'),
    vcard: () => import('./vcard/validation.js'),
  };
  const validatorRequests = new Map();
  const loadValidator = (format) => {
    if (!validatorRequests.has(format)) {
      validatorRequests.set(format, loading.track(validatorLoaders[format]()));
    }
    return validatorRequests.get(format);
  };
  const validation = async () => {
    if (bulk.isMode()) {
      return bulk.getValidationState({
        rowNumber: runtime.getFrameIndex() + 1,
        limits: config.validationLimits,
      });
    }
    const format = e.qrFormat.value;
    if (format === 'url') {
      return validateUrl(e.urlInput.value);
    }
    if (format === 'number') {
      await sections.ensureFormat(format);
      return sections.number.getValidationState();
    }
    if (!validatorLoaders[format]) return { error: '', warning: '' };
    if (format === 'email') await ensureEmailCapacity();
    const validator = await loadValidator(format);
    if (format === 'email') {
      return validator.validateEmail(
        document,
        emailCapacity.getInfo(),
        config.validationLimits,
      );
    }
    if (format === 'event') {
      return validator.validateEvent(document, config.validationLimits);
    }
    if (format === 'file') {
      return validator.validateFile({
        getActive: file.getActive,
        getMode: file.getMode,
        getCapacity: file.getCapacity,
      });
    }
    if (format === 'geo') return validator.validateGeo(document);
    if (format === 'phone' || format === 'sms') {
      return validator.validatePhone(document, format, config.validationLimits);
    }
    return validator.validateVCard(document);
  };
  const updateTextPreview = (text) => {
    const debugState = runtime.getDebugState();
    if (debugState.tab !== 'debug' || debugState.subtab !== 'payload') return;
    const preview = text || pipeline.payload.preview();
    e.encodedPreview.textContent =
      e.qrFormat.value === 'wifi'
        ? sections.wifi.maskPayload(preview)
        : preview;
  };
  return { pipeline, qr, emailCapacity, validation, updateTextPreview };
}
