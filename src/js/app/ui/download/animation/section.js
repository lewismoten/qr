import { lookup } from '../../../../i18n/index.js';

export function createAnimationSection({
  timingMode,
  minutesInput,
  secondsInput,
  millisecondsInput,
  summary,
  mp4Button,
  getFrameCount,
  getSupportedMp4MimeType,
}) {
  const getTiming = (frameCount = getFrameCount()) => {
    const minutes = Math.min(60, Math.max(0, Number.parseInt(minutesInput.value, 10) || 0));
    const seconds = Math.min(59, Math.max(0, Number.parseInt(secondsInput.value, 10) || 0));
    const milliseconds = Math.min(999, Math.max(0, Number.parseInt(millisecondsInput.value, 10) || 0));
    const enteredDurationMs = minutes * 60000 + seconds * 1000 + milliseconds;
    const perFrameMs = timingMode.value === 'total'
      ? enteredDurationMs / Math.max(1, frameCount)
      : enteredDurationMs;
    return { enteredDurationMs, perFrameMs, totalDurationMs: perFrameMs * Math.max(1, frameCount) };
  };

  const formatDuration = (milliseconds) => {
    if (milliseconds >= 60000) {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(3).padStart(6, '0');
      return `${minutes}:${seconds}`;
    }
    return lookup('download.seconds', '{seconds} seconds', { seconds: (milliseconds / 1000).toFixed(3) });
  };

  const sync = () => {
    const frameCount = getFrameCount();
    const { perFrameMs, totalDurationMs } = getTiming(frameCount);
    summary.textContent = lookup('download.durationSummary', '{perImage} per image - {total} total.', {
      perImage: formatDuration(perFrameMs), total: formatDuration(totalDurationMs),
    });
    mp4Button.title = getSupportedMp4MimeType()
      ? lookup('download.mp4Title', 'Download an MP4 animation')
      : lookup('download.mp4Unavailable', 'MP4 encoding is not available in this browser; animated GIF remains available.');
  };

  return { getTiming, formatDuration, sync };
}
