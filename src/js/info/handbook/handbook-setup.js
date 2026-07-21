import { getHandbookCopy } from './copy.js';

function action(label, run) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'handbook-action';
  const icon = document.createElement('span');
  icon.className = 'handbook-action-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '\u{1F4D6}';
  button.append(icon, document.createTextNode(label));
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await run();
    } catch (error) {
      console.error(error);
      alert(button.dataset.error);
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

export function setupHandbookExports(locale = 'en-US') {
  const footer = document.querySelector('.info-page-footer, .spec-footer');
  if (!footer || footer.querySelector('.handbook-actions')) return;
  const copy = getHandbookCopy(locale);
  const controls = document.createElement('div');
  controls.className = 'handbook-actions';
  controls.append(
    action(copy.download, async () => {
      const { openHandbookExportDialog } =
        await import('./handbook-export-dialog.js');
      await openHandbookExportDialog(locale);
    }),
  );
  controls.querySelectorAll('button').forEach((button) => {
    button.dataset.error = copy.failed;
  });
  const language = footer.querySelector('.guide-language-switcher');
  footer.insertBefore(controls, language);
}
