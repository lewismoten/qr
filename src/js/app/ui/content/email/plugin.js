import { createEmailCapacityFromDocument } from './capacity.js';
import { validateEmail } from './validation.js';

export function createEmailPlugin({
  document,
  section,
  encoder,
  runtime,
  limits,
  isActive,
}) {
  const capacity = createEmailCapacityFromDocument(document, {
    encoder,
    buildOptions: runtime.buildOptions,
    buildPayload: runtime.buildPayload,
    buildEmail: section.buildEmailPayloadWithBody,
    isActive,
  });
  return {
    build: section.buildEmailPayload,
    preview: section.buildEmailPreview,
    validate: () => validateEmail(document, capacity.getInfo(), limits),
    syncCapacity: capacity.sync,
    getCapacity: capacity.getInfo,
  };
}
