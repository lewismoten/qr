import { createAnimationStage, drawAnimationStageFrame } from './gif.js';

export function getSupportedMp4MimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }
  return ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'].find((type) =>
    MediaRecorder.isTypeSupported(type)
  ) || '';
}

export async function createAnimatedMp4Blob(frames, frameDurationMs, onProgress) {
  const mimeType = getSupportedMp4MimeType();
  if (!mimeType) {
    throw new Error('This browser does not provide an MP4 encoder. Animated GIF is available instead.');
  }

  const stage = createAnimationStage(frames);
  drawAnimationStageFrame(stage, frames[0], true);
  const frameRate = Math.min(60, Math.max(1, Math.ceil(1000 / Math.max(16, frameDurationMs))));
  const stream = stage.captureStream(frameRate);
  try {
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) {
        chunks.push(event.data);
      }
    });
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', () => reject(recorder.error || new Error('Unable to encode MP4.')), {
        once: true,
      });
    });

    recorder.start(1000);
    for (let index = 0; index < frames.length; index += 1) {
      drawAnimationStageFrame(stage, frames[index], true);
      onProgress?.(index + 1, frames.length);
      await new Promise((resolve) => window.setTimeout(resolve, frameDurationMs));
    }
    recorder.stop();
    await stopped;
    return new Blob(chunks, { type: mimeType });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

