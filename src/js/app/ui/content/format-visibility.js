export function createFormatVisibility({ elements: e, syncBulk, syncFile, syncEvent }) {
  return function sync() {
    syncBulk();
    const format = e.format.value;
    e.fieldsets.forEach((fieldset) => {
      const active = !e.bulkEnabled.checked && fieldset.dataset.formatFields === format;
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
