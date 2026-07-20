import { getHandbookCopy } from './copy.js';

function download(blob, name) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function action(label, run) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'handbook-action';
  button.textContent = label;
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
    action(copy.print, async () => {
      const target = window.open('', '_blank');
      if (!target) throw new Error(copy.blocked);
      const { printHandbook } = await import('./print.js');
      try {
        await printHandbook(locale, target);
      } catch (error) {
        target.close();
        throw error;
      }
    }),
    action(copy.epub, async () => {
      const { createHandbookEpub } = await import('./epub.js');
      const blob = await createHandbookEpub(locale);
      download(blob, `qr-handbook-${locale}.epub`);
    }),
  );
  controls.querySelectorAll('button').forEach((button) => {
    button.dataset.error = copy.failed;
  });
  const language = footer.querySelector('.guide-language-switcher');
  footer.insertBefore(controls, language);
}
