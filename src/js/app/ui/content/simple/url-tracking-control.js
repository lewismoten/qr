import {
  getTrackingParameterNames,
  removeTrackingParameters,
} from '../../../data/url-tracking.js';

const CONTROL_SELECTOR = '[data-url-tracking-control]';
const DIALOG_SELECTOR = '[data-url-tracking-dialog]';
const KEEP_SELECTOR = '[data-url-tracking-keep]';
const NAMES_SELECTOR = '[data-url-tracking-names]';
const OPEN_SELECTOR = '[data-url-tracking-open]';
const REMOVE_SELECTOR = '[data-url-tracking-remove]';

export function setupUrlTrackingControl(input) {
  const control = input.closest('fieldset')?.querySelector(CONTROL_SELECTOR);
  const dialog = control?.querySelector(DIALOG_SELECTOR);
  const keep = control?.querySelector(KEEP_SELECTOR);
  const names = control?.querySelector(NAMES_SELECTOR);
  const open = control?.querySelector(OPEN_SELECTOR);
  const remove = control?.querySelector(REMOVE_SELECTOR);
  if (!control || !dialog || !keep || !names || !open || !remove) {
    return { sync() {} };
  }

  const sync = () => {
    const detected = getTrackingParameterNames(input.value);
    names.textContent = detected.join(', ');
    control.hidden = detected.length === 0;
    if (detected.length === 0 && dialog.open) dialog.close();
  };
  input.addEventListener('input', sync);
  open.addEventListener('click', () => dialog.showModal());
  keep.addEventListener('click', () => dialog.close('kept'));
  remove.addEventListener('click', () => {
    const cleaned = removeTrackingParameters(input.value);
    if (cleaned === input.value) return;
    input.value = cleaned;
    dialog.close('removed');
    const EventConstructor = input.ownerDocument.defaultView.Event;
    input.dispatchEvent(new EventConstructor('input', { bubbles: true }));
  });
  sync();
  return { sync };
}
