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
    if (
      event.target === e.bulkFileInput ||
      event.target === e.fileChunkVersionAuto ||
      event.target === e.fileChunkIndex
    )
      return;
    if (
      [
        e.animationMinutes,
        e.animationSeconds,
        e.animationMilliseconds,
      ].includes(event.target)
    ) {
      a.syncAnimation();
      return;
    }
    if (event.target === e.downloadQuality) {
      a.syncDownloads();
      return;
    }
    if (
      [
        e.fileIncludeManifest,
        e.fileCompressTransfer,
        e.fileCustomMetadata,
      ].includes(event.target)
    ) {
      a.resetTransfer();
      a.scheduleChunkRefresh({ resetChunkIndex: true });
      return;
    }
    if (event.target === e.fileChunkVersion) {
      e.fileChunkVersionValue.textContent = `V${e.fileChunkVersion.value}`;
      e.qrVersion.value = e.fileChunkVersion.value;
      a.formatVersion();
      a.scheduleChunkRefresh({ resetChunkIndex: true });
      return;
    }
    a.syncSmsLength();
    a.syncEmailLength();
    a.syncFileCapacity();
    a.render();
  });

  e.fileInput.addEventListener('change', () => {
    a.resetFileCache();
    e.fileChunkIndex.value = '1';
    a.syncFileCapacity();
    a.render();
  });
  e.clearFileButton.addEventListener('click', () => {
    a.clearFile();
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
  e.frameMessageCenter.addEventListener('input', () =>
    a.setFrameCentered(e.frameMessageCenter.checked),
  );
  e.frameMessageCenterArt.addEventListener('input', () =>
    a.setFrameCentered(e.frameMessageCenterArt.checked),
  );

  e.choiceButtons.forEach((button) =>
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.choiceTarget);
      const value = button.dataset.choiceValue;
      if (!target || target.value === value) return;
      target.value = value;
      a.syncChoices();
      if (target === e.gradientType) a.syncGradient();
      if (target === e.moduleShape) a.syncModules();
      if (target === e.eyeShape) a.syncEyes();
      if (target === e.centerArtMode) {
        if (value !== 'none') a.setFrameCentered(false);
        a.syncArtwork();
      }
      if (target.id === 'wifi-encryption') a.syncWifi();
      if (target === e.qrFormat) {
        a.syncFormat();
        a.activateContent('data');
        if (a.isBulkMode() && e.bulkFileInput.files?.[0]) {
          a.loadBulkFile();
          return;
        }
      }
      if (target === e.downloadFormat) {
        a.syncDownloads();
        return;
      }
      if (target === e.animationTimingMode) {
        a.syncAnimation();
        return;
      }
      if (target === e.fileEncodingMode) {
        if (value === 'chunked' && e.versionAuto.checked)
          e.qrVersion.value = String(defaultChunkVersion);
        a.syncChunkVersion();
        a.formatVersion();
        a.scheduleChunkRefresh({ resetChunkIndex: true, delay: 0 });
        return;
      }
      a.render();
    }),
  );

  e.emojiOptions.forEach((button) =>
    button.addEventListener('click', () => {
      e.centerEmoji.value = button.dataset.emoji || '';
      a.syncEmoji();
      a.render();
    }),
  );
  e.imageFillRecommended.addEventListener('click', () => {
    a.applyImageContrast();
    a.render();
  });
  e.fileChunkIndex.addEventListener('input', () => {
    a.invalidateCapacity();
    a.syncFileCapacity();
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
  e.fileChunkVersionAuto.addEventListener('change', () => {
    e.versionAuto.checked = e.fileChunkVersionAuto.checked;
    if (e.fileChunkVersionAuto.checked)
      e.qrVersion.value = String(defaultChunkVersion);
    a.formatVersion();
    a.syncChunkVersion();
    a.scheduleChunkRefresh({ resetChunkIndex: true, delay: 0 });
  });
  e.fileChunkVersion.addEventListener('input', () => {
    e.qrVersion.value = e.fileChunkVersion.value;
    a.formatVersion();
    a.syncChunkVersion();
    a.scheduleChunkRefresh({ resetChunkIndex: true });
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
