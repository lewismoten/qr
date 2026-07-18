export function createFormatVisibility({
  document,
  elements: e,
  syncBulk,
  syncFile,
  syncEvent,
  prepareFormat,
}) {
  let activeFieldset = document.querySelector('.format-fields.is-active');
  let secretToggle = null;
  return function sync() {
    syncBulk();
    const format = e.format.value;
    void prepareFormat(format).catch(console.error);
    const nextFieldset = e.bulkEnabled.checked
      ? null
      : document.querySelector(`[data-format-fields="${format}"]`);
    if (activeFieldset && activeFieldset !== nextFieldset) {
      activeFieldset.hidden = true;
      activeFieldset.classList.remove('is-active');
      activeFieldset.setAttribute('aria-hidden', 'true');
    }
    if (nextFieldset) {
      nextFieldset.hidden = false;
      nextFieldset.classList.add('is-active');
      nextFieldset.setAttribute('aria-hidden', 'false');
    }
    activeFieldset = nextFieldset;
    const showSecrets = format === 'wifi';
    if (showSecrets && !secretToggle) {
      secretToggle = document.getElementById('payload-reveal-toggle');
    }
    if (secretToggle) {
      secretToggle.hidden = !showSecrets;
      secretToggle.setAttribute('aria-hidden', String(!showSecrets));
    }
    syncFile();
    syncEvent();
  };
}
