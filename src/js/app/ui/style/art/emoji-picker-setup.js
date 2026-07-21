const loadEmojiDialog = () => import('./emoji-dialog.js');

export function installEmojiPicker({
  button,
  document,
  input,
  load = loadEmojiDialog,
  onSelect,
}) {
  if (!button) return;
  let request;
  button.addEventListener('click', async () => {
    if (!request) {
      request = load().then((module) =>
        module.createEmojiDialog({ document, input, onSelect }),
      );
    }
    try {
      (await request).open();
    } catch (error) {
      request = null;
      console.error(error);
    }
  });
}
