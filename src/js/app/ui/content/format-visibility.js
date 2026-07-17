export function createFormatVisibility({
  elements: e,
  syncBulk,
  syncFile,
  syncEvent,
  prepareFormat,
}) {
  return function sync() {
    syncBulk();
    const format = e.format.value;
    void prepareFormat(format).catch(console.error);
    e.fieldsets.forEach((fieldset) => {
      const active =
        !e.bulkEnabled.checked && fieldset.dataset.formatFields === format;
      fieldset.hidden = !active;
      fieldset.classList.toggle('is-active', active);
      fieldset.setAttribute('aria-hidden', String(!active));
    });
    const showSecrets = format === 'wifi';
    e.secretToggle.hidden = !showSecrets;
    e.secretToggle.setAttribute('aria-hidden', String(!showSecrets));
    syncFile();
    syncEvent();
  };
}
