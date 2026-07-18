import assert from 'node:assert/strict';
import { createTaskProgress } from '../src/js/app/ui/download/progress.js';

class Control extends EventTarget {
  constructor() {
    super();
    this.textContent = '';
    this.value = 0;
    this.disabled = false;
  }
}

class Dialog extends EventTarget {
  open = false;
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
}

const elements = {
  dialog: new Dialog(),
  title: new Control(),
  phase: new Control(),
  meter: new Control(),
  percent: new Control(),
  elapsed: new Control(),
  remaining: new Control(),
  completion: new Control(),
  cancel: new Control(),
};
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const progress = createTaskProgress(elements, () => performance.now(), {
  showDelay: 10,
  completionHold: 15,
  windowObject: globalThis,
});

const quick = progress.start({ title: 'Quick', phase: 'Working' });
quick.finish({ completed: true });
await wait(20);
assert.equal(
  elements.dialog.open,
  false,
  'quick tasks should never display progress',
);

const long = progress.start({ title: 'Long', phase: 'Working' });
await wait(12);
assert.equal(elements.dialog.open, true, 'long tasks should display progress');
long.update(0.8, 'Almost done');
long.finish({ completed: true });
assert.equal(elements.meter.value, 100);
assert.equal(elements.phase.textContent, 'Completed');
assert.equal(elements.cancel.disabled, true);
assert.equal(
  elements.dialog.open,
  true,
  'completed state should remain visible briefly',
);
await wait(20);
assert.equal(
  elements.dialog.open,
  false,
  'completed state should close after its hold',
);

const canceled = progress.start({ title: 'Cancel', phase: 'Starting' });
canceled.update(-0.5);
assert.equal(elements.meter.value, 0, 'progress should clamp below zero');
canceled.update(1.5, 'Finishing');
assert.equal(elements.meter.value, 100, 'progress should clamp above 100%');
elements.cancel.dispatchEvent(new Event('click'));
assert.equal(canceled.signal.aborted, true);
assert.equal(elements.cancel.disabled, true);
assert.equal(elements.phase.textContent, 'Canceling...');
canceled.update(0.5, 'Ignored after cancellation');
assert.equal(elements.meter.value, 100);
canceled.finish();

const replaced = progress.start({ title: 'Old', phase: 'Working' });
const replacement = progress.start({ title: 'New', phase: 'Working' });
assert.equal(
  replaced.signal.aborted,
  true,
  'a new task should abort the old one',
);
replacement.finish();

const incomplete = progress.start({ title: 'Incomplete', phase: 'Working' });
await wait(12);
assert.equal(elements.dialog.open, true);
incomplete.finish();
assert.equal(
  elements.dialog.open,
  false,
  'an incomplete task should close without the completion hold',
);

console.log('Task progress timing tests passed.');
