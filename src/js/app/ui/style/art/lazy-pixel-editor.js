export function createLazyPixelArtEditor(options, { isActive, onReady }) {
  let editor = null;
  let request = null;

  const getSize = () => Number.parseInt(options.sizeInput.value, 10) || 16;
  const syncFallbackLabel = () => {
    const size = getSize();
    options.sizeValue.textContent = `${size} x ${size}`;
  };
  const load = () => {
    if (editor) return Promise.resolve(editor);
    if (!request) {
      request = import('./pixel-editor.js').then(({ createPixelArtEditor }) => {
        editor = createPixelArtEditor(options);
        editor.initialize();
        onReady();
        return editor;
      }).catch((error) => {
        request = null;
        throw error;
      });
    }
    return request;
  };
  const preload = () => load().catch(console.error);

  options.grid.addEventListener('pointerdown', preload, { once: true });
  options.grid.addEventListener('focusin', preload, { once: true });
  options.paletteElement.addEventListener('pointerdown', preload, { once: true });
  options.customColorInput.addEventListener('focus', preload, { once: true });

  return {
    initialize: syncFallbackLabel,
    syncPalette: () => editor?.syncPalette(),
    syncSizeLabel() {
      syncFallbackLabel();
      if (isActive()) load().catch(console.error);
    },
    getState() {
      if (editor) return editor.getState();
      const size = getSize();
      return { size, pixels: Array(size * size).fill(null) };
    },
    load,
  };
}
