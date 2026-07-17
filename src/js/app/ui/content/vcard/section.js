import { serializeVCard } from '../../../content-formats.js';

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
      name: name.value.trim() || '[full-name]',
      organization: organization.value.trim() || '[organization]',
      title: title.value.trim() || '[title]',
      phone: phone.value.trim() || '[phone-number]',
      email: email.value.trim() || '[email]',
      url: website.value.trim() || '[website]',
    });

  return { buildPayload, buildPreview };
}
