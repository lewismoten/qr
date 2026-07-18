import { validatePhone } from './validation.js';

export function createPhonePlugin({ document, format, section, limits }) {
  const sms = format === 'sms';
  return {
    build: sms ? section.buildSmsPayload : section.buildPhonePayload,
    preview: sms ? section.buildSmsPreview : section.buildPhonePreview,
    validate: () => validatePhone(document, format, limits),
  };
}
