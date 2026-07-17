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

  return { buildPayload };
}
