export function createOutputSetup({ elements: e, actions, getErrorLevel, smsMaxLength }) {
  function formatVersion() {
    e.qrVersionValue.textContent = e.versionAuto.checked ? 'Auto' : e.qrVersion.value;
  }

  function formatErrorCorrection() {
    const selected = getErrorLevel();
    e.errorCorrectionLabel.textContent = selected.label;
    e.errorCorrectionValue.textContent = selected.value;
    e.errorCorrectionHelp.textContent = selected.detail;
  }

  function syncSmsLength() {
    e.smsLengthHint.textContent = `${e.smsBody.value.length} / ${smsMaxLength}`;
  }

  function sync() {
    actions.syncSizeLabels();
    actions.formatColorTransparency();
    actions.syncGradientControls();
    actions.syncNumberSequenceControls();
    actions.getCurrentFrameMessage();
    e.frameMessageCenterArt.checked = e.frameMessageCenter.checked;
    e.frameLineHeightValue.textContent = `${e.frameLineHeight.value} px`;
    actions.syncModuleShapeControls();
    actions.syncEyeShapeControls();
    actions.syncCenterArtworkControls();
    actions.syncChunkPreviewNavigation();
    actions.syncPrintWidthControls();
    formatVersion();
    formatErrorCorrection();
    e.qrVersion.disabled = e.versionAuto.checked;
    e.encodingMode.disabled = e.modeAuto.checked;
    e.encodingModeButtons.forEach((button) => {
      button.disabled = e.modeAuto.checked;
      button.setAttribute('aria-disabled', String(e.modeAuto.checked));
    });
    actions.syncEmailBodyLengthHint();
    actions.syncFileCapacityHint();
  }

  return { formatVersion, sync, syncSmsLength };
}
