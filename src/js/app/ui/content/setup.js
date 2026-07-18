import { createLazySection } from './lazy-section.js';
import { createContentPluginRegistry } from './plugin-registry.js';
import { ensurePanelFragment } from '../fragment-loader.js';
import { lookup } from '../../../i18n/index.js';
import { validateUrl } from './url-validation.js';

export function createContentSections({
  document,
  elements: e,
  runtime,
  encoder,
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
      const section = createWifiSectionFromDocument(document);
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
  const sharedMarkupFormats = new Set([
    'text',
    'email',
    'phone',
    'sms',
    'vcard',
  ]);
  const ensureMarkup = (format) => {
    const formats = sharedMarkupFormats.has(format)
      ? sharedMarkupFormats
      : [format];
    return Promise.all(
      [...formats].map((name) => {
        const fieldset = document.querySelector(
          `[data-format-fields="${name}"]`,
        );
        return ensurePanelFragment(fieldset);
      }),
    );
  };
  const withMarkup = (format, load) => async () => {
    await ensureMarkup(format);
    return load();
  };
  let registry;
  const loaders = {
    text: () =>
      import('./text/plugin.js').then(({ createTextPlugin }) =>
        createTextPlugin(document),
      ),
    number: () =>
      numberLoader.ensure().then((section) => ({
        build: section.getPayload,
        preview: section.getPayload,
        validate: section.getValidationState,
      })),
    wifi: () =>
      Promise.all([wifiLoader.ensure(), import('./wifi/plugin.js')]).then(
        ([section, { createWifiPlugin }]) =>
          createWifiPlugin({ document, section }),
      ),
    email: () =>
      Promise.all([sharedLoader.ensure(), import('./email/plugin.js')]).then(
        ([section, { createEmailPlugin }]) =>
          createEmailPlugin({
            document,
            section,
            encoder,
            runtime,
            limits,
            isActive: () => e.qrFormat.value === 'email',
          }),
      ),
    phone: () =>
      Promise.all([phoneLoader.ensure(), import('./phone/plugin.js')]).then(
        ([section, { createPhonePlugin }]) =>
          createPhonePlugin({ document, format: 'phone', section, limits }),
      ),
    sms: () =>
      Promise.all([phoneLoader.ensure(), sharedLoader.ensure()]).then(
        ([section]) =>
          import('./phone/plugin.js').then(({ createPhonePlugin }) =>
            createPhonePlugin({ document, format: 'sms', section, limits }),
          ),
      ),
    event: () =>
      Promise.all([eventLoader.ensure(), import('./event/plugin.js')]).then(
        ([section, { createEventPlugin }]) =>
          createEventPlugin({ document, section, limits }),
      ),
    geo: () =>
      Promise.all([geoLoader.ensure(), import('./geo/plugin.js')]).then(
        ([section, { createGeoPlugin }]) =>
          createGeoPlugin({ document, section }),
      ),
    vcard: () =>
      Promise.all([
        phoneLoader.ensure(),
        sharedLoader.ensure(),
        vcardLoader.ensure(),
        import('./vcard/plugin.js'),
      ]).then(([, , section, { createVCardPlugin }]) =>
        createVCardPlugin({ document, section }),
      ),
    file: () =>
      import('./file/plugin.js').then(({ createFilePlugin }) =>
        createFilePlugin(file),
      ),
  };
  const pluginLoaders = Object.fromEntries(
    Object.entries(loaders).map(([format, load]) => [
      format,
      withMarkup(format, load),
    ]),
  );
  registry = createContentPluginRegistry({
    format: e.qrFormat,
    initial: {
      url: {
        build: () => e.urlInput.value.trim(),
        preview: () =>
          e.urlInput.value ||
          lookup('content.preview.url', '[Enter a complete HTTPS URL]'),
        validate: () => validateUrl(e.urlInput.value),
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
      registry.get('number')?.validate?.() ?? { error: '', warning: '' },
    sync: () => numberLoader.get()?.sync(),
  };
  const shared = {
    initialize() {},
    buildEmailPayload: () =>
      registry.ensure('email').then((plugin) => plugin.build()),
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
    plugins: registry,
    ensureFormat,
  };
}
