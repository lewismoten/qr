import { validateEvent } from './validation.js';

export function createEventPlugin({ document, section, limits }) {
  return {
    build: section.buildPayload,
    preview: section.buildPayload,
    validate: () => validateEvent(document, limits),
  };
}
