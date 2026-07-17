export function createArtworkControls({ elements: e, pixelEditor }) {
  const syncEmoji = () => e.emojiOptions.forEach((button) => {
    const active = button.dataset.emoji === e.emoji.value;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const sync = () => {
    const mode = e.mode.value;
    e.controls.hidden = mode === 'none';
    e.logoControls.hidden = mode !== 'logo';
    e.emojiControls.hidden = mode !== 'emoji';
    e.pixelControls.hidden = mode !== 'pixel';
    e.sizeValue.textContent = `${e.size.value}%`;
    e.backgroundLabel.textContent = mode === 'emoji'
      ? 'Protect with a light outline'
      : 'Protect with a light background';
    pixelEditor.syncSizeLabel();
    syncEmoji();
  };
  return { sync, syncEmoji };
}
