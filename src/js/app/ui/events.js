export function bindApplicationEvents({
  elements: e,
  actions: a,
  defaultChunkVersion,
}) {
  e.form.addEventListener('submit', (event) => event.preventDefault());
  e.form.addEventListener('input', (event) => {
    if (event.target === e.bulkEnabled) {
      a.syncFormat();
      a.activateContent('data');
      if (e.bulkEnabled.checked && e.bulkFileInput.files?.[0]) a.loadBulkFile();
      else a.render();
      return;
    }
    if (event.target === e.bulkFileInput) return;
    a.syncSmsLength();
    a.syncEmailLength();
    a.render();
  });
  e.qrFormat.addEventListener('change', () => {
    a.syncFormat();
    a.syncChoices();
    a.syncWifi();
    a.activateContent('data');
    if (a.isBulkMode() && e.bulkFileInput.files?.[0]) a.loadBulkFile();
    else a.render();
  });
  e.choiceButtons.forEach((button) =>
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.choiceTarget);
      const value = button.dataset.choiceValue;
      if (!target || target.value === value) return;
      target.value = value;
      a.syncChoices();
      if (target.id === 'wifi-encryption') a.syncWifi();
      if (target === e.qrFormat) {
        a.syncFormat();
        a.activateContent('data');
        if (a.isBulkMode() && e.bulkFileInput.files?.[0]) {
          a.loadBulkFile();
          return;
        }
      }
      a.render();
    }),
  );

  e.chunkPreviewPrev.addEventListener('click', () => {
    const current = a.getCurrentFrame();
    if (current <= 1) return;
    a.setCurrentFrame(current - 1);
    a.syncNavigation();
    a.render();
  });
  e.chunkPreviewNext.addEventListener('click', () => {
    const current = a.getCurrentFrame();
    if (current >= a.getFrameCount()) return;
    a.setCurrentFrame(current + 1);
    a.syncNavigation();
    a.render();
  });
  e.versionAuto.addEventListener('change', () => {
    if (
      e.versionAuto.checked &&
      e.qrFormat.value === 'file' &&
      a.getFileMode() === 'chunked'
    ) {
      e.qrVersion.value = String(defaultChunkVersion);
      a.scheduleChunkRefresh({ resetChunkIndex: true, delay: 0 });
    }
    a.syncChunkVersion();
  });
  e.qrVersion.addEventListener('input', a.syncChunkVersion);
}
