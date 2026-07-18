import { getActiveLocale } from '../../i18n/index.js';
import { getLocalizedGuidePath } from '../../i18n/guide-path.js';

export function initializeDialogs({ document, window }) {
  const dialogs = document.querySelectorAll('.info-dialog');

  const loadDialogContent = (dialog) => {
    dialog.querySelectorAll('[data-dialog-src]').forEach((element) => {
      const source = getLocalizedGuidePath(
        element.dataset.dialogSrc,
        getActiveLocale(),
      );
      if (element.getAttribute('src') !== source) {
        element.setAttribute('src', source);
      }
    });
  };

  const syncFromHash = () => {
    const targetId = window.location.hash.slice(1);
    const targetDialog = [...dialogs].find((dialog) => dialog.id === targetId);
    dialogs.forEach((dialog) => {
      if (dialog !== targetDialog && dialog.open) dialog.close();
    });
    if (targetDialog && !targetDialog.open) {
      loadDialogContent(targetDialog);
      targetDialog.showModal();
    }
  };

  const open = (targetId) => {
    if (![...dialogs].some((dialog) => dialog.id === targetId)) return;
    const targetHash = `#${targetId}`;
    if (window.location.hash === targetHash) {
      window.requestAnimationFrame(syncFromHash);
    } else {
      window.location.hash = targetHash;
    }
  };

  document.querySelectorAll('[data-dialog-target]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const targetId = link.dataset.dialogTarget;
      event.preventDefault();
      open(targetId);
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
        history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`,
        );
      }
    });
  });
  window.addEventListener('hashchange', syncFromHash);
  document.addEventListener('languagechange', () => {
    dialogs.forEach((dialog) => {
      if (dialog.open) loadDialogContent(dialog);
    });
  });
  return { open, syncFromHash };
}
