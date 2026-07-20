import { createLocalizedError } from '../../localized-error.js';
import { COLOR_WHITE } from '../colors.js';

export function canvasToBlob(sourceCanvas, type, quality, flatten = false) {
  return new Promise((resolve, reject) => {
    let exportCanvas = sourceCanvas;
    if (flatten) {
      exportCanvas = document.createElement('canvas');
      exportCanvas.width = sourceCanvas.width;
      exportCanvas.height = sourceCanvas.height;
      const context = exportCanvas.getContext('2d');
      context.fillStyle = COLOR_WHITE;
      context.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      context.drawImage(sourceCanvas, 0, 0);
    }
    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            createLocalizedError(
              'download.imageError',
              'Unable to create {type} image.',
              { type },
            ),
          );
        }
      },
      type,
      quality,
    );
  });
}
