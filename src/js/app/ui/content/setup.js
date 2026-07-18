import { createLazySection } from './lazy-section.js';

export function createContentSections({
  document,
  elements: e,
  runtime,
  limits,
  alphanumericCharacters,
  validatePrintableText,
}) {
  const region = e.tabPanels[0]?.parentElement;
  const eventLoader = createLazySection({
    region,
    load: () => import('./event/section.js'),
    create: ({ createEventSectionFromDocument }) => {
      const section = createEventSectionFromDocument(document);
      section.initialize();
      section.sync();
      return section;
    },
  });
  const geoLoader = createLazySection({
    region,
    load: () => import('./geo/section.js'),
    create: ({ createGeoSectionFromDocument }) =>
      createGeoSectionFromDocument(document, {
        isActive: () => e.qrFormat.value === 'geo',
        onChange: () => runtime.render(),
      }),
  });
  const numberLoader = createLazySection({
    region,
    load: () => import('./number/section.js'),
    create: ({ createNumberSectionFromDocument }) => {
      const section = createNumberSectionFromDocument(document, {
        maxFrames: limits.numberFrames,
        alphanumericCharacters,
        validatePrintableText,
      });
      section.sync();
      return section;
    },
  });
  const phoneLoader = createLazySection({
    region,
    load: () => import('./phone/section.js'),
    create: ({ createPhoneSectionFromDocument }) => {
      const section = createPhoneSectionFromDocument(document, {
        onChange: () => runtime.render(),
        smsMaxLength: limits.sms,
      });
      section.initialize();
      return section;
    },
  });
  const sharedLoader = createLazySection({
    region,
    load: () => import('./shared-fields.js'),
    create: ({ createSharedFieldsSectionFromDocument }) => {
      const section = createSharedFieldsSectionFromDocument(document, {
        onMessageChange() {
          runtime.syncSmsLength();
          runtime.syncEmailLength();
        },
      });
      section.initialize();
      return section;
    },
  });
  const wifiLoader = createLazySection({
    region,
    load: () => import('./wifi/section.js'),
    create: ({ createWifiSectionFromDocument }) => {
      const section = createWifiSectionFromDocument(document, {
        onChange() {
          runtime.syncChoices();
          runtime.render();
        },
      });
      section.sync();
      return section;
    },
  });
  const vcardLoader = createLazySection({
    region,
    load: () => import('./vcard/section.js'),
    create: ({ createVCardSectionFromDocument }) =>
      createVCardSectionFromDocument(document),
  });

  const event = {
    initialize() {},
    sync: () => {
      if (e.qrFormat.value === 'event') void eventLoader.run('sync');
    },
    buildPayload: () => eventLoader.run('buildPayload'),
    buildPreview: () => eventLoader.get()?.buildPayload() ?? '[calendar event]',
  };
  const geo = {
    update: () => {
      if (e.qrFormat.value === 'geo') void geoLoader.run('update');
    },
    buildPayload: () => geoLoader.run('buildPayload'),
    buildPreview: () =>
      geoLoader.get()?.buildPreview() ?? 'geo:[latitude],[longitude]',
  };
  const number = {
    getPayload: () =>
      numberLoader.get()?.getPayload() ?? numberLoader.run('getPayload'),
    getPreview: () => numberLoader.get()?.getPayload() ?? '[number]',
    getSequenceInfo: () =>
      numberLoader.get()?.getSequenceInfo() ?? { total: 1, current: 1 },
    getValidationState: () =>
      numberLoader.get()?.getValidationState() ?? {
        error: '',
        warning: '',
      },
    sync: () => numberLoader.get()?.sync(),
  };
  const wifi = {
    sync: () => {
      if (e.qrFormat.value === 'wifi') void wifiLoader.run('sync');
    },
    buildPayload: () => wifiLoader.run('buildPayload'),
    buildPreview: () =>
      wifiLoader.get()?.buildPreview() ?? 'WIFI:S:[network-name];;',
    maskPayload: (payload) => wifiLoader.get()?.maskPayload(payload) ?? payload,
  };
  const shared = {
    initialize() {},
    buildEmailPayload: () =>
      sharedLoader.get()?.buildEmailPayload() ??
      sharedLoader.run('buildEmailPayload'),
    buildEmailPayloadWithBody: (body) =>
      sharedLoader.get()?.buildEmailPayloadWithBody(body) ?? '',
    buildEmailPreview: () =>
      sharedLoader.get()?.buildEmailPreview() ??
      'mailto:[recipient@example.com]',
  };
  const vcard = {
    buildPayload: () => vcardLoader.run('buildPayload'),
    buildPreview: () =>
      vcardLoader.get()?.buildPreview() ?? 'BEGIN:VCARD\nEND:VCARD',
  };
  const phone = {
    initialize() {},
    buildPhonePayload: () => phoneLoader.run('buildPhonePayload'),
    buildSmsPayload: () => phoneLoader.run('buildSmsPayload'),
    buildPhonePreview: () =>
      phoneLoader.get()?.buildPhonePreview() ?? 'tel:[phone-number]',
    buildSmsPreview: () =>
      phoneLoader.get()?.buildSmsPreview() ?? 'SMSTO:[phone-number]:[message]',
    syncSmsLength: () => phoneLoader.get()?.syncSmsLength(),
  };
  const ensureFormat = (format) => {
    const loaders = {
      text: [sharedLoader],
      phone: [phoneLoader],
      sms: [phoneLoader, sharedLoader],
      email: [sharedLoader],
      event: [eventLoader],
      geo: [geoLoader],
      number: [numberLoader],
      wifi: [wifiLoader],
      vcard: [phoneLoader, sharedLoader, vcardLoader],
    }[format];
    return loaders
      ? Promise.all(loaders.map((loader) => loader.ensure()))
      : Promise.resolve();
  };

  return {
    event,
    geo,
    number,
    phone,
    shared,
    vcard,
    wifi,
    ensureFormat,
  };
}
