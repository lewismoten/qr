import { lookup } from '../../../i18n/index.js';
import { loadFeatureStylesheet } from '../../../stylesheets.js';

const clamp = (value) => Math.min(1, Math.max(0, value));
const SHOW_DELAY_MS = 400;
const COMPLETION_HOLD_MS = 2000;

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  if (seconds < 60)
    return lookup('download.progress.seconds', '{count} seconds', {
      count: seconds,
    });
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return lookup('download.progress.minutes', '{minutes} min {seconds} sec', {
    minutes,
    seconds: remainder,
  });
}

export function createTaskProgress(
  elements,
  now = () => performance.now(),
  {
    showDelay = SHOW_DELAY_MS,
    completionHold = COMPLETION_HOLD_MS,
    windowObject = globalThis.window,
    ensureStyles = () => loadFeatureStylesheet('task-progress'),
  } = {},
) {
  let active = null;

  const renderTime = () => {
    if (!active) return;
    const elapsed = now() - active.startedAt;
    elements.elapsed.textContent = formatDuration(elapsed);
    if (active.fraction > 0.01 && active.fraction < 1) {
      const remaining = (elapsed * (1 - active.fraction)) / active.fraction;
      elements.remaining.textContent = formatDuration(remaining);
      elements.completion.textContent = new Date(
        Date.now() + remaining,
      ).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
    } else if (active.fraction >= 1) {
      elements.remaining.textContent = formatDuration(0);
      elements.completion.textContent = lookup('download.progress.now', 'Now');
    } else {
      elements.remaining.textContent = lookup(
        'download.progress.estimating',
        'Estimating...',
      );
      elements.completion.textContent = '-';
    }
  };

  const cancel = () => {
    if (!active || active.finished || active.controller.signal.aborted) return;
    elements.cancel.disabled = true;
    elements.phase.textContent = lookup(
      'download.progress.canceling',
      'Canceling...',
    );
    active.controller.abort();
  };
  elements.cancel.addEventListener('click', cancel);
  elements.dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    cancel();
  });

  const start = ({ title, phase }) => {
    const styleRequest = ensureStyles().catch((error) => {
      console.error(error);
    });
    active?.controller.abort();
    if (active?.showTimer) windowObject.clearTimeout(active.showTimer);
    if (active?.clockTimer) windowObject.clearInterval(active.clockTimer);
    if (active?.closeTimer) windowObject.clearTimeout(active.closeTimer);
    if (elements.dialog.open) elements.dialog.close();
    const controller = new AbortController();
    const task = {
      controller,
      startedAt: now(),
      fraction: 0,
      visible: false,
      finished: false,
      showTimer: 0,
      clockTimer: 0,
      closeTimer: 0,
    };
    active = task;
    elements.title.textContent = title;
    elements.phase.textContent = phase;
    elements.meter.value = 0;
    elements.percent.textContent = lookup('units.percent', '{value}%', {
      value: 0,
    });
    elements.cancel.disabled = false;
    task.showTimer = windowObject.setTimeout(() => {
      styleRequest.then(() => {
        if (active !== task || task.finished) return;
        task.visible = true;
        if (!elements.dialog.open) elements.dialog.showModal();
        renderTime();
        task.clockTimer = windowObject.setInterval(renderTime, 500);
      });
    }, showDelay);

    return {
      signal: controller.signal,
      cancel: () => controller.abort(),
      update(fraction, message) {
        if (controller.signal.aborted || active?.controller !== controller)
          return;
        active.fraction = clamp(fraction);
        const percent = Math.round(active.fraction * 100);
        elements.meter.value = percent;
        elements.percent.textContent = lookup('units.percent', '{value}%', {
          value: percent,
        });
        if (message) elements.phase.textContent = message;
        renderTime();
      },
      finish({ completed = false } = {}) {
        if (active !== task) return;
        task.finished = true;
        windowObject.clearTimeout(task.showTimer);
        windowObject.clearInterval(task.clockTimer);
        if (!completed || !task.visible) {
          active = null;
          if (elements.dialog.open) elements.dialog.close();
          return;
        }

        task.fraction = 1;
        elements.meter.value = 100;
        elements.percent.textContent = lookup('units.percent', '{value}%', {
          value: 100,
        });
        elements.phase.textContent = lookup(
          'download.progress.completed',
          'Completed',
        );
        elements.cancel.disabled = true;
        renderTime();
        task.closeTimer = windowObject.setTimeout(() => {
          if (active !== task) return;
          active = null;
          if (elements.dialog.open) elements.dialog.close();
        }, completionHold);
      },
    };
  };

  return { start };
}
