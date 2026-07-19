import { createAnimationStage, drawAnimationStageFrame } from './gif.js';
import { getSupportedMp4MimeType } from '../media-support.js';
import { createLocalizedError } from '../../localized-error.js';
import { throwIfAborted, waitFor } from '../abort.js';

export async function createAnimatedMp4Blob(
  frames,
  frameDurationMs,
  { onProgress, signal } = {},
) {
  const mimeType = getSupportedMp4MimeType();
  if (!mimeType) {
    throw createLocalizedError(
      'download.mp4EncoderUnavailable',
      'This browser does not provide an MP4 encoder. Animated GIF is available instead.',
    );
  }

  const stage = createAnimationStage(frames);
  drawAnimationStageFrame(stage, frames[0], true);
  const frameRate = Math.min(
    60,
    Math.max(1, Math.ceil(1000 / Math.max(16, frameDurationMs))),
  );
  const stream = stage.captureStream(frameRate);
  let recorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) {
        chunks.push(event.data);
      }
    });
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener(
        'error',
        () =>
          reject(
            recorder.error ||
              createLocalizedError(
                'download.mp4EncodeError',
                'Unable to encode MP4.',
              ),
          ),
        {
          once: true,
        },
      );
    });

    recorder.start(1000);
    for (let index = 0; index < frames.length; index += 1) {
      throwIfAborted(signal);
      drawAnimationStageFrame(stage, frames[index], true);
      await waitFor(frameDurationMs, signal);
      onProgress?.(index + 1, frames.length);
    }
    recorder.stop();
    await stopped;
    return new Blob(chunks, { type: mimeType });
  } finally {
    if (recorder?.state && recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
  }
}
