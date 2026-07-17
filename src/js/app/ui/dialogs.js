export function initializeDialogs({ document, window }) {
  const dialogs = document.querySelectorAll('.info-dialog');

  const syncFromHash = () => {
    const targetId = window.location.hash.slice(1);
    const targetDialog = [...dialogs].find((dialog) => dialog.id === targetId);
    dialogs.forEach((dialog) => {
      if (dialog !== targetDialog && dialog.open) dialog.close();
    });
    if (targetDialog && !targetDialog.open) targetDialog.showModal();
  };

  document.querySelectorAll('[data-dialog-target]').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.location.hash === link.getAttribute('href')) window.requestAnimationFrame(syncFromHash);
    });
  });
  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });
  dialogs.forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (window.location.hash === `#${dialog.id}`) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    });
  });
  window.addEventListener('hashchange', syncFromHash);
  return { syncFromHash };
}
