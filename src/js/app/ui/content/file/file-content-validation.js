import { lookup } from '../../../../i18n/index.js';

const invalid = (error) => ({ error, warning: '' });

export function validateFile(file) {
  const activeFile = file.getActive();
  if (!activeFile) {
    return invalid(
      lookup(
        'validation.file.required',
        'Not valid for File format yet: choose a file to encode.',
      ),
    );
  }
  if (file.getMode() === 'blob') {
    return {
      error: '',
      warning: lookup(
        'validation.file.embeddedWarning',
        'Warning for File format: this shareable download URL embeds the file bytes directly, so larger files will hit QR capacity quickly.',
      ),
    };
  }
  if (file.getMode() === 'chunked') {
    const { totalChunks } = file.getCapacity(activeFile);
    return {
      error: '',
      warning:
        totalChunks > 1
          ? lookup(
              'validation.file.chunksWarning',
              'Warning for File format: this compact FILE stream is split across {totalChunks} QR codes. Each scan needs the same file ID plus every chunk to reconstruct the file.',
              { totalChunks },
            )
          : '',
    };
  }
  return { error: '', warning: '' };
}
