import { serializeVCard } from '../../../content-formats.js';
import { lookup } from '../../../../i18n/index.js';

export function createVCardSection({
  name,
  organization,
  title,
  phone,
  email,
  website,
}) {
  const buildPayload = () =>
    serializeVCard({
      name: name.value,
      organization: organization.value,
      title: title.value,
      phone: phone.value,
      email: email.value,
      url: website.value,
    });
  const buildPreview = () =>
    serializeVCard({
      name:
        name.value.trim() || lookup('content.preview.fullName', '[Full name]'),
      organization:
        organization.value.trim() ||
        lookup('content.preview.organization', '[Organization]'),
      title: title.value.trim() || lookup('content.preview.title', '[Title]'),
      phone:
        phone.value.trim() ||
        lookup('content.preview.phoneNumber', '[Phone number]'),
      email:
        email.value.trim() ||
        lookup('content.preview.email', '[Email address]'),
      url:
        website.value.trim() || lookup('content.preview.website', '[Website]'),
    });

  return { buildPayload, buildPreview };
}

export function createVCardSectionFromDocument(document) {
  return createVCardSection({
    name: document.getElementById('vcard-name'),
    organization: document.getElementById('vcard-org'),
    title: document.getElementById('vcard-title'),
    phone: document.getElementById('vcard-phone'),
    email: document.getElementById('vcard-email'),
    website: document.getElementById('vcard-url'),
  });
}
