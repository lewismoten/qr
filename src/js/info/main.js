import { setupExternalLinks } from '../external-links.js';

const isEmbedded = new URLSearchParams(window.location.search).has('embed');
if (isEmbedded && window.parent !== window) {
  document.querySelectorAll('[data-parent-dialog-target]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      window.parent.location.hash = link.dataset.parentDialogTarget;
    });
  });
}

setupExternalLinks();
