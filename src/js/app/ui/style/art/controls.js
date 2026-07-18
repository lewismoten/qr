import { lookup } from '../../../../i18n/index.js';

export function createArtworkControls({ elements: e, pixelEditor }) {
  const syncEmoji = () =>
    e.emojiOptions.forEach((button) => {
      const active = button.dataset.emoji === e.emoji.value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  const syncOutline = () => {
    const supportsOutline =
      e.mode.value === 'emoji' || e.mode.value === 'pixel';
    e.outlineControls.hidden = !supportsOutline;
    e.outlineThickness.disabled = !e.background.checked;
    e.outlineThicknessValue.textContent = lookup('units.percent', '{value}%', {
      value: e.outlineThickness.value,
    });
  };
  const sync = () => {
    const mode = e.mode.value;
    e.controls.hidden = mode === 'none';
    e.logoControls.hidden = mode !== 'logo';
    e.emojiControls.hidden = mode !== 'emoji';
    e.pixelControls.hidden = mode !== 'pixel';
    e.sizeValue.textContent = lookup('units.percent', '{value}%', {
      value: e.size.value,
    });
    e.backgroundLabel.textContent =
      mode === 'emoji' || mode === 'pixel'
        ? lookup('art.protectOutline', 'Protect with a light outline')
        : lookup('art.protectBackground', 'Protect with a light background');
    pixelEditor.syncSizeLabel();
    syncOutline();
    syncEmoji();
  };
  return { sync, syncEmoji, syncOutline };
}
