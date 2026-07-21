export function bindApplicationEvents({
  elements: e,
  actions: a,
  defaultVersion,
}) {
  e.form.addEventListener('submit', (event) => event.preventDefault());
  e.form.addEventListener('input', (event) => {
    if (event.target === e.bulkEnabled) {
      a.syncFormat();
      a.activateContent('data');
      a.render();
      return;
    }
    a.syncSmsLength();
    a.syncEmailLength();
    a.render();
  });
  e.qrFormat.addEventListener('change', () => {
    a.syncFormat();
    a.syncChoices(e.qrFormat.id);
    a.activateContent('data');
    a.render();
  });
  e.form.addEventListener('click', (event) => {
    const button = event.target.closest('.choice-button');
    if (!button) return;
    const target = document.getElementById(button.dataset.choiceTarget);
    const value = button.dataset.choiceValue;
    if (!target || target.value === value) return;
    target.value = value;
    target.dispatchEvent(new Event('change', { bubbles: true }));
    if (target === e.qrFormat) return;
    a.syncChoices(target.id);
    a.render();
  });

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
      e.qrVersion.value = String(defaultVersion);
      a.scheduleChunkRefresh({ resetChunkIndex: true, delay: 0 });
    }
    a.syncChunkVersion();
  });
  e.qrVersion.addEventListener('input', a.syncChunkVersion);
}
