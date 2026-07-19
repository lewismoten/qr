const PIXELS_PER_LINE = 16;

function pixelDelta(event, threshold) {
  if (event.deltaMode === 1) return event.deltaY * PIXELS_PER_LINE;
  if (event.deltaMode === 2) return event.deltaY * threshold;
  return event.deltaY;
}

export function createWheelZoomHandler(
  onStep,
  { threshold = 80, cooldown = 180 } = {},
) {
  let accumulated = 0;
  let lastEventAt = -Infinity;
  let lastStepAt = -Infinity;

  return (event) => {
    event.preventDefault();
    const now = Number.isFinite(event.timeStamp) ? event.timeStamp : 0;
    const delta = pixelDelta(event, threshold);
    const changedDirection =
      accumulated !== 0 && Math.sign(delta) !== Math.sign(accumulated);
    if (now - lastEventAt > cooldown || changedDirection) accumulated = 0;
    lastEventAt = now;
    if (now - lastStepAt < cooldown) return;
    accumulated += delta;
    if (Math.abs(accumulated) < threshold) return;
    onStep(accumulated < 0 ? 1 : -1);
    accumulated = 0;
    lastStepAt = now;
  };
}
