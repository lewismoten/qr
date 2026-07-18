export function createContentPayload({
  elements: e,
  bulk,
  builders,
  previews,
  file,
}) {
  const build = async () => {
    if (bulk.isMode()) return bulk.build();
    switch (e.qrFormat.value) {
      case 'url':
        return e.urlInput.value.trim();
      case 'text':
        return e.textInput.value;
      case 'number':
        return builders.number();
      case 'wifi':
        return builders.wifi();
      case 'email':
        return builders.email();
      case 'phone':
        return builders.phone();
      case 'sms':
        return builders.sms();
      case 'event':
        return builders.event();
      case 'geo':
        return builders.geo();
      case 'vcard':
        return builders.vcard();
      case 'file':
        return builders.file();
      default:
        return '';
    }
  };

  const preview = () => {
    if (bulk.isMode())
      return bulk.build() || `[CSV row for ${e.qrFormat.value}]`;
    switch (e.qrFormat.value) {
      case 'url':
        return e.urlInput.value || '[enter a full https:// URL]';
      case 'text':
        return e.textInput.value || '[enter text]';
      case 'number':
        return previews.number();
      case 'wifi':
        return previews.wifi();
      case 'email':
        return previews.email();
      case 'phone':
        return previews.phone();
      case 'sms':
        return previews.sms();
      case 'event':
        return previews.event();
      case 'geo':
        return previews.geo();
      case 'vcard':
        return previews.vcard();
      case 'file':
        return file.preview();
      default:
        return '';
    }
  };

  return { build, preview };
}
