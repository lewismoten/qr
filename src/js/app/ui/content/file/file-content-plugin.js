import { validateFile } from './file-content-validation.js';

export function createFilePlugin(file) {
  return {
    build: file.build,
    preview: file.preview,
    validate: () =>
      validateFile({
        getActive: file.getActive,
        getMode: file.getMode,
        getCapacity: file.getCapacity,
      }),
  };
}
