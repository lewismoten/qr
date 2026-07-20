import { validateVCard } from './vcard-content-validation.js';

export function createVCardPlugin({ document, section }) {
  return {
    build: section.buildPayload,
    preview: section.buildPreview,
    validate: () => validateVCard(document),
  };
}
