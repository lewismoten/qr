import { createLazySection } from './lazy-section.js';

export function createContentSections({
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
    create: ({ createEventSection }) => {
      const section = createEventSection({
        title: e.eventTitle,
        allDay: e.eventAllDay,
        startDate: e.eventStartDate,
        startTime: e.eventStartTime,
        endDate: e.eventEndDate,
        endTime: e.eventEndTime,
        location: e.eventLocation,
        description: e.eventDescription,
        url: e.eventUrl,
        timeFields: e.eventTimeFields,
      });
      section.initialize();
      section.sync();
      return section;
    },
  });
  const geoLoader = createLazySection({
    region,
    load: () => import('./geo/section.js'),
    create: ({ createGeoSection }) =>
      createGeoSection({
        latitudeInput: e.geoLatitude,
        longitudeInput: e.geoLongitude,
        labelInput: e.geoQuery,
        mapElement: e.geoMapElement,
        isActive: () => e.qrFormat.value === 'geo',
        onChange: () => runtime.render(),
      }),
  });
  const numberLoader = createLazySection({
    region,
    load: () => import('./number/section.js'),
    create: ({ createNumberSection }) => {
      const section = createNumberSection({
        startInput: e.numberStart,
        endInput: e.numberEnd,
        stepInput: e.numberStep,
        prefixInput: e.numberPrefix,
        suffixInput: e.numberSuffix,
        indexInput: e.numberSequenceIndex,
        statusElement: e.numberSequenceValue,
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
    create: ({ createPhoneSection }) => {
      const section = createPhoneSection({
        buttons: e.phoneFormatButtons,
        inputs: [e.phoneNumber, e.smsNumber, e.vcardPhone],
        phoneInput: e.phoneNumber,
        smsInput: e.smsNumber,
        smsBody: e.smsBody,
        onChange: () => runtime.render(),
      });
      section.initialize();
      return section;
    },
  });
  const sharedLoader = createLazySection({
    region,
    load: () => import('./shared-fields.js'),
    create: ({ createSharedFieldsSection }) => {
      const section = createSharedFieldsSection({
        emailInputs: [e.emailTo, e.vcardEmail],
        messageInputs: [e.textInput, e.smsBody, e.emailBody],
        emailSubject: e.emailSubject,
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
    create: ({ createWifiSection }) => {
      const section = createWifiSection({
        ssid: e.wifiSsid,
        password: e.wifiPassword,
        encryption: e.wifiEncryption,
        hidden: e.wifiHidden,
        revealSecrets: e.payloadRevealSecrets,
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
    create: ({ createVCardSection }) =>
      createVCardSection({
        name: e.vcardName,
        organization: e.vcardOrg,
        title: e.vcardTitle,
        phone: e.vcardPhone,
        email: e.vcardEmail,
        website: e.vcardUrl,
      }),
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
