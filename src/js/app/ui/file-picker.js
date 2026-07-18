import { lookup } from '../../i18n/index.js';

const SYNC_EVENT = 'file-picker:sync';
const initializedInputs = new WeakSet();

function sync(input) {
  const status = input
    .closest('.file-picker')
    ?.querySelector('[data-file-picker-status]');
  if (!status) return;
  const fileName = input.files?.[0]?.name || '';
  status.textContent =
    fileName || lookup('common.noFileSelected', 'No file selected');
  status.title = fileName;
  status.classList.toggle('has-file', Boolean(fileName));
}

export function setupFilePicker(input) {
  if (!input || initializedInputs.has(input)) return;
  initializedInputs.add(input);
  input.addEventListener('change', () => sync(input));
  input.addEventListener(SYNC_EVENT, () => sync(input));
  sync(input);
}

export function refreshFilePicker(input) {
  const EventConstructor =
    input?.ownerDocument?.defaultView?.Event || globalThis.Event;
  if (input && EventConstructor)
    input.dispatchEvent(new EventConstructor(SYNC_EVENT));
}
