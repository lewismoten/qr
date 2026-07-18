function isPlainPrimaryClick(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function initializeLazyDialogs({ document, window }) {
  let controller = null;
  let request = null;
  const ensure = () => {
    if (controller) return Promise.resolve(controller);
    if (!request) {
      request = import('./dialogs.js')
        .then(({ initializeDialogs }) => {
          controller = initializeDialogs({ document, window });
          return controller;
        })
        .catch((error) => {
          request = null;
          throw error;
        });
    }
    return request;
  };
  const isDialogHash = () => {
    const id = window.location.hash.slice(1);
    return document.getElementById(id)?.classList.contains('info-dialog');
  };
  const syncHash = () => {
    if (controller || !isDialogHash()) return;
    ensure()
      .then((system) => system.syncFromHash())
      .catch(console.error);
  };
  document.addEventListener('click', (event) => {
    if (controller || !isPlainPrimaryClick(event)) return;
    const link = event.target.closest('[data-dialog-target]');
    if (!link) return;
    event.preventDefault();
    ensure()
      .then((system) => system.open(link.dataset.dialogTarget))
      .catch(console.error);
  });
  window.addEventListener('hashchange', syncHash);
  syncHash();
}
