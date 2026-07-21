import { lookup } from '../../../../i18n/index.js';

const DECIMAL_RADIX = 10;
const MAXIMUM_MINUTES = 60;
const MAXIMUM_SECONDS = 59;
const MAXIMUM_MILLISECONDS = 999;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const DURATION_DECIMAL_PLACES = 3;
const CLOCK_SECONDS_WIDTH = 6;

export function createAnimationSection({
  timingMode,
  minutesInput,
  secondsInput,
  millisInput,
  summary,
  mp4Button,
  getFrameCount,
  getSupportedMp4MimeType,
}) {
  const getTiming = (frameCount = getFrameCount()) => {
    const minutes = Math.min(
      MAXIMUM_MINUTES,
      Math.max(0, Number.parseInt(minutesInput.value, DECIMAL_RADIX) || 0),
    );
    const seconds = Math.min(
      MAXIMUM_SECONDS,
      Math.max(0, Number.parseInt(secondsInput.value, DECIMAL_RADIX) || 0),
    );
    const milliseconds = Math.min(
      MAXIMUM_MILLISECONDS,
      Math.max(0, Number.parseInt(millisInput.value, DECIMAL_RADIX) || 0),
    );
    const durationMs =
      minutes * MILLISECONDS_PER_MINUTE +
      seconds * MILLISECONDS_PER_SECOND +
      milliseconds;
    const perFrameMs =
      timingMode.value === 'total'
        ? durationMs / Math.max(1, frameCount)
        : durationMs;
    return {
      durationMs,
      perFrameMs,
      totalDurationMs: perFrameMs * Math.max(1, frameCount),
    };
  };

  const formatDuration = (milliseconds) => {
    if (milliseconds >= MILLISECONDS_PER_MINUTE) {
      const minutes = Math.floor(milliseconds / MILLISECONDS_PER_MINUTE);
      const seconds = (
        (milliseconds % MILLISECONDS_PER_MINUTE) /
        MILLISECONDS_PER_SECOND
      )
        .toFixed(DURATION_DECIMAL_PLACES)
        .padStart(CLOCK_SECONDS_WIDTH, '0');
      return `${minutes}:${seconds}`;
    }
    return lookup('download.seconds', '{seconds} seconds', {
      seconds: (milliseconds / MILLISECONDS_PER_SECOND).toFixed(
        DURATION_DECIMAL_PLACES,
      ),
    });
  };

  const sync = () => {
    const frameCount = getFrameCount();
    const { perFrameMs, totalDurationMs } = getTiming(frameCount);
    summary.textContent = lookup(
      'download.durationSummary',
      '{perImage} per image - {total} total.',
      {
        perImage: formatDuration(perFrameMs),
        total: formatDuration(totalDurationMs),
      },
    );
    mp4Button.title = getSupportedMp4MimeType()
      ? lookup('download.mp4Title', 'Download an MP4 animation')
      : lookup(
          'download.mp4Unavailable',
          'MP4 encoding is not available in this browser; animated GIF remains available.',
        );
  };

  return { getTiming, formatDuration, sync };
}
