import { getErrorText, lookup } from '../../../i18n/index.js';

export function setupLazyDownloadActions(options, importActions) {
  const watched = new WeakSet();
  let actions = null;
  let ready = false;
  let request = null;

  const load = () => {
    if (ready) return Promise.resolve();
    if (!request) {
      request = importActions()
        .then(({ createDownloadActions }) => {
          actions = createDownloadActions(options);
          ready = true;
        })
        .catch((error) => {
          request = null;
          throw error;
        });
    }
    return request;
  };
  const preload = () => load().catch(console.error);
  const watch = (button) => {
    if (!button || watched.has(button)) return;
    watched.add(button);
    button.addEventListener('pointerenter', preload, { once: true });
    button.addEventListener('focus', preload, { once: true });
    button.addEventListener('pointerdown', preload, { once: true });
    button.addEventListener('click', async (event) => {
      if (ready) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await load();
        button.click();
      } catch (error) {
        console.error(error);
        options.status.textContent = getErrorText(
          error,
          lookup('download.toolsError', 'Download tools could not be loaded.'),
        );
      }
    });
  };
  const update = (next) => {
    Object.assign(options, next);
    const buttons = [
      options.currentButton,
      options.currentPdfButton,
      options.zipButton,
      options.allPdfButton,
      options.gifButton,
      options.mp4Button,
    ];
    buttons.forEach(watch);
    actions?.attachButtons(options);
  };
  update(options);
  return { update };
}
