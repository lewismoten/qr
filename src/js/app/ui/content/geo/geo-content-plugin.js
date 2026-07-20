import { validateGeo } from './geo-content-validation.js';

export function createGeoPlugin({ document, section }) {
  return {
    build: section.buildPayload,
    preview: section.buildPreview,
    validate: () => validateGeo(document),
  };
}
