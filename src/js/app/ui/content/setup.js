import { createLazySection } from './lazy-section.js';
import { createContentPluginRegistry } from './plugin-registry.js';
import { lookup } from '../../../i18n/index.js';

export function createContentSections({
  document,
  elements: e,
  runtime,
  limits,
  alphanumericCharacters,
  validatePrintableText,
  file,
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

  const loadingPreview = () =>
    lookup(
      'content.preview.loading',
      '[Content preview loads after selecting this format]',
    );
  let registry;
  const pluginLoaders = {
    text: () =>
      import('./text/plugin.js').then(({ createTextPlugin }) =>
        createTextPlugin(document),
      ),
    number: () =>
      numberLoader.ensure().then((section) => ({
        build: section.getPayload,
        preview: section.getPayload,
      })),
    wifi: () =>
      wifiLoader.ensure().then((section) => ({
        build: section.buildPayload,
        preview: section.buildPreview,
      })),
    email: () =>
      sharedLoader.ensure().then((section) => ({
        build: section.buildEmailPayload,
        preview: section.buildEmailPreview,
      })),
    phone: () =>
      phoneLoader.ensure().then((section) => ({
        build: section.buildPhonePayload,
        preview: section.buildPhonePreview,
      })),
    sms: () =>
      Promise.all([phoneLoader.ensure(), sharedLoader.ensure()]).then(
        ([section]) => ({
          build: section.buildSmsPayload,
          preview: section.buildSmsPreview,
        }),
      ),
    event: () =>
      eventLoader.ensure().then((section) => ({
        build: section.buildPayload,
        preview: section.buildPayload,
      })),
    geo: () =>
      geoLoader.ensure().then((section) => ({
        build: section.buildPayload,
        preview: section.buildPreview,
      })),
    vcard: () =>
      Promise.all([
        phoneLoader.ensure(),
        sharedLoader.ensure(),
        vcardLoader.ensure(),
      ]).then(([, , section]) => ({
        build: section.buildPayload,
        preview: section.buildPreview,
      })),
    file: () =>
      Promise.resolve({
        build: file.build,
        preview: file.preview,
      }),
  };
  registry = createContentPluginRegistry({
    format: e.qrFormat,
    initial: {
      url: {
        build: () => e.urlInput.value.trim(),
        preview: () =>
          e.urlInput.value ||
          lookup('content.preview.url', '[Enter a complete HTTPS URL]'),
      },
    },
    loaders: pluginLoaders,
  });

  const event = {
    initialize() {},
    sync: () => {
      if (e.qrFormat.value === 'event') void eventLoader.run('sync');
    },
    buildPayload: () =>
      registry.ensure('event').then((plugin) => plugin.build()),
    buildPreview: () => registry.get('event')?.preview() ?? loadingPreview(),
  };
  const geo = {
    update: () => {
      if (e.qrFormat.value === 'geo') void geoLoader.run('update');
    },
    buildPayload: () => registry.ensure('geo').then((plugin) => plugin.build()),
    buildPreview: () => registry.get('geo')?.preview() ?? loadingPreview(),
  };
  const number = {
    getPayload: () =>
      registry.get('number')?.build() ??
      registry.ensure('number').then((plugin) => plugin.build()),
    getPreview: () => registry.get('number')?.preview() ?? loadingPreview(),
    getSequenceInfo: () =>
      numberLoader.get()?.getSequenceInfo() ?? { total: 1, current: 1 },
    getIndexInput: () => numberLoader.get()?.getIndexInput() ?? null,
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
    buildPayload: () =>
      registry.ensure('wifi').then((plugin) => plugin.build()),
    buildPreview: () => registry.get('wifi')?.preview() ?? loadingPreview(),
    maskPayload: (payload) => wifiLoader.get()?.maskPayload(payload) ?? payload,
  };
  const shared = {
    initialize() {},
    buildEmailPayload: () =>
      registry.ensure('email').then((plugin) => plugin.build()),
    buildEmailPayloadWithBody: (body) =>
      sharedLoader.get()?.buildEmailPayloadWithBody(body) ?? '',
    buildEmailPreview: () =>
      registry.get('email')?.preview() ?? loadingPreview(),
  };
  const vcard = {
    buildPayload: () =>
      registry.ensure('vcard').then((plugin) => plugin.build()),
    buildPreview: () => registry.get('vcard')?.preview() ?? loadingPreview(),
  };
  const phone = {
    initialize() {},
    buildPhonePayload: () =>
      registry.ensure('phone').then((plugin) => plugin.build()),
    buildSmsPayload: () =>
      registry.ensure('sms').then((plugin) => plugin.build()),
    buildPhonePreview: () =>
      registry.get('phone')?.preview() ?? loadingPreview(),
    buildSmsPreview: () => registry.get('sms')?.preview() ?? loadingPreview(),
    syncSmsLength: () => phoneLoader.get()?.syncSmsLength(),
  };
  const ensureFormat = (format) => registry.ensure(format);

  return {
    event,
    geo,
    number,
    phone,
    shared,
    vcard,
    wifi,
    plugins: registry,
    ensureFormat,
  };
}
