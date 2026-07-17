export function setupLazyDownloadActions(options) {
  const buttons = [
    options.currentButton,
    options.currentPdfButton,
    options.zipButton,
    options.allPdfButton,
    options.gifButton,
    options.mp4Button,
  ].filter(Boolean);
  let ready = false;
  let request = null;

  const load = () => {
    if (ready) return Promise.resolve();
    if (!request) {
      request = import('./actions.js').then(({ createDownloadActions }) => {
        createDownloadActions(options);
        ready = true;
      }).catch((error) => {
        request = null;
        throw error;
      });
    }
    return request;
  };
  const preload = () => load().catch(console.error);

  buttons.forEach((button) => {
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
        options.status.textContent = `Download tools could not be loaded: ${error.message}`;
      }
    });
  });
}
