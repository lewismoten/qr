import { getErrorText, lookup } from '../../../i18n/index.js';
import { isAbortError, throwIfAborted } from '../../abort.js';

const MAX_ANIMATION_FRAMES = 200;
const MINIMUM_FRAME_DURATION_MS = 10;
const MAXIMUM_GIF_FRAME_DURATION_MS = 655_350;
const MINIMUM_MP4_FRAME_DURATION_MS = 16;
const GIF_CAPTURE_PROGRESS_WEIGHT = 0.45;
const MP4_CAPTURE_PROGRESS_WEIGHT = 0.25;

export function createAnimationDownloader(deps) {
  const captureFrames = async (total, task, captureWeight) => {
    const { cloneCanvas } = await deps.loadExporters();
    const originalFrame = deps.getCurrentFrame();
    const frames = [];
    try {
      for (let frame = 1; frame <= total; frame += 1) {
        throwIfAborted(task.signal);
        const message = lookup(
          'download.capturingFrame',
          'Capturing animation frame {frame} of {total}...',
          { frame, total },
        );
        deps.status.textContent = message;
        task.update(((frame - 1) / total) * captureWeight, message);
        deps.setCurrentFrame(frame);
        deps.syncFrameNavigation();
        await deps.render();
        frames.push(cloneCanvas(deps.canvas));
        task.update((frame / total) * captureWeight, message);
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
      return frames;
    } finally {
      await deps.restoreFrame(originalFrame);
    }
  };

  return async (format) => {
    const total = deps.getFrameCount();
    if (total <= 1) return;
    if (total > MAX_ANIMATION_FRAMES) {
      deps.status.textContent = lookup(
        'download.animationLimit',
        'Animation is limited to {max} images to protect browser memory.',
        { max: MAX_ANIMATION_FRAMES },
      );
      return;
    }
    const { enteredDurationMs, perFrameMs, totalDurationMs } =
      deps.getAnimationTiming(total);
    if (enteredDurationMs <= 0 || perFrameMs < MINIMUM_FRAME_DURATION_MS) {
      deps.status.textContent = lookup(
        'download.durationMinimum',
        'Choose a duration that provides at least 10 milliseconds per image.',
      );
      return;
    }
    if (format === 'gif' && perFrameMs > MAXIMUM_GIF_FRAME_DURATION_MS) {
      deps.status.textContent = lookup(
        'download.gifDurationMaximum',
        'GIF supports at most 10 minutes 55.35 seconds per image.',
      );
      return;
    }
    if (format === 'mp4' && perFrameMs < MINIMUM_MP4_FRAME_DURATION_MS) {
      deps.status.textContent = lookup(
        'download.mp4DurationMinimum',
        'MP4 needs at least 16 milliseconds per image.',
      );
      return;
    }

    deps.setDisabled(true);
    const captureWeight =
      format === 'gif'
        ? GIF_CAPTURE_PROGRESS_WEIGHT
        : MP4_CAPTURE_PROGRESS_WEIGHT;
    const title = lookup(
      format === 'gif'
        ? 'download.progress.titleGif'
        : 'download.progress.titleMp4',
      format === 'gif' ? 'Creating animated GIF' : 'Creating MP4 animation',
    );
    const task = deps.taskProgress.start({
      title,
      phase: lookup('download.progress.preparing', 'Preparing animation...'),
    });
    let completed = false;
    try {
      const frames = await captureFrames(total, task, captureWeight);
      throwIfAborted(task.signal);
      if (format === 'gif') {
        const { createAnimatedGifBlob } = await deps.loadExporters();
        const message = lookup(
          'download.encodingGif',
          'Encoding animated GIF...',
        );
        deps.status.textContent = message;
        task.update(captureWeight, message);
        const blob = await createAnimatedGifBlob(frames, perFrameMs, {
          signal: task.signal,
          onProgress: (frame, count) =>
            task.update(
              captureWeight + (frame / count) * (1 - captureWeight),
              lookup(
                'download.progress.encodingFrame',
                'Encoding GIF frame {frame} of {total}...',
                { frame, total: count },
              ),
            ),
        });
        throwIfAborted(task.signal);
        deps.triggerDownload(blob, `qr-animation-${total}.gif`);
        deps.status.textContent = lookup(
          'download.gifReady',
          'Animated GIF ready - {duration} total.',
          { duration: deps.formatAnimationDuration(totalDurationMs) },
        );
      } else {
        const { createAnimatedMp4Blob } = await deps.loadExporters();
        const message = lookup(
          'download.recordingMp4',
          'Recording MP4 in real time - {duration}...',
          { duration: deps.formatAnimationDuration(totalDurationMs) },
        );
        deps.status.textContent = message;
        task.update(captureWeight, message);
        const blob = await createAnimatedMp4Blob(frames, perFrameMs, {
          signal: task.signal,
          onProgress: (frame, count) => {
            const frameMessage = lookup(
              'download.recordingFrame',
              'Recording MP4 frame {frame} of {total}...',
              { frame, total: count },
            );
            deps.status.textContent = frameMessage;
            task.update(
              captureWeight + (frame / count) * (1 - captureWeight),
              frameMessage,
            );
          },
        });
        throwIfAborted(task.signal);
        deps.triggerDownload(blob, `qr-animation-${total}.mp4`);
        deps.status.textContent = lookup('download.mp4Ready', 'MP4 ready.');
      }
      completed = true;
    } catch (error) {
      if (isAbortError(error)) {
        deps.status.textContent = lookup(
          'download.progress.canceled',
          'Animation export canceled.',
        );
      } else {
        deps.status.textContent = getErrorText(
          error,
          lookup(
            'download.animationError',
            'Unable to create {format} animation.',
            { format: format.toUpperCase() },
          ),
        );
        console.error(error);
      }
    } finally {
      task.finish({ completed });
      deps.setDisabled(false);
    }
  };
}
