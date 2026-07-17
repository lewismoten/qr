import assert from 'node:assert/strict';
import { createTaskProgress } from './src/js/app/ui/download/progress.js';

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
  showModal() { this.open = true; }
  close() { this.open = false; }
}

const elements = {
  dialog: new Dialog(), title: new Control(), phase: new Control(), meter: new Control(),
  percent: new Control(), elapsed: new Control(), remaining: new Control(),
  completion: new Control(), cancel: new Control(),
};
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const progress = createTaskProgress(elements, () => performance.now(), {
  showDelay: 10,
  completionHold: 15,
  windowObject: globalThis,
});

const quick = progress.start({ title: 'Quick', phase: 'Working' });
quick.finish({ completed: true });
await wait(20);
assert.equal(elements.dialog.open, false, 'quick tasks should never display progress');

const long = progress.start({ title: 'Long', phase: 'Working' });
await wait(12);
assert.equal(elements.dialog.open, true, 'long tasks should display progress');
long.update(0.8, 'Almost done');
long.finish({ completed: true });
assert.equal(elements.meter.value, 100);
assert.equal(elements.phase.textContent, 'Completed');
assert.equal(elements.cancel.disabled, true);
assert.equal(elements.dialog.open, true, 'completed state should remain visible briefly');
await wait(20);
assert.equal(elements.dialog.open, false, 'completed state should close after its hold');

console.log('Task progress timing tests passed.');
