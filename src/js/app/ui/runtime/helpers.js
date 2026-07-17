export function createRuntimeHelpers({ window, canvas, controls, errorLevels, getDebugState }) {
  function getDefaultUrl() {
    return window.location.protocol === 'file:'
      ? 'https://qr.lewismoten.com'
      : window.location.href;
  }

  function getShareableUrl() {
    return window.location.protocol === 'file:'
      ? 'https://qr.lewismoten.com/'
      : `${window.location.origin}${window.location.pathname}`;
  }

  function clearCanvas() {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }

  function readInteger(input) {
    if (!input?.value.trim()) return undefined;
    const parsed = Number.parseInt(input.value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  function getErrorLevel() {
    return errorLevels[Number.parseInt(controls.errorCorrection.value, 10)] ?? errorLevels[1];
  }

  function getEncodingMode() {
    return controls.modeAuto.checked ? undefined : controls.encodingMode.value;
  }

  function isDebugOverlayActive() {
    const state = getDebugState();
    return (state.tab === 'debug' && state.subtab === 'overlay') || controls.debugEnabled.checked;
  }

  return {
    clearCanvas,
    getDefaultUrl,
    getEncodingMode,
    getErrorLevel,
    getShareableUrl,
    isDebugOverlayActive,
    readInteger,
  };
}
