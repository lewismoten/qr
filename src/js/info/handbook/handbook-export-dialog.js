import { isAbortError, throwIfAborted } from '../../app/abort.js';
import { createTaskProgress } from '../../app/ui/download/progress.js';
import { lookup } from '../../i18n/index.js';
import { loadFeatureStylesheet } from '../../stylesheets.js';
import { getHandbookCopy } from './copy.js';

const OBJECT_URL_REVOCATION_DELAY_MS = 1000;
const PERCENT_MAXIMUM = 100;
let controller;

function element(document, name, className, text) {
  const result = document.createElement(name);
  if (className) result.className = className;
  if (text) result.textContent = text;
  return result;
}

function download(document, blob, name) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOCATION_DELAY_MS);
}

function createProgressCard(document, copy) {
  const card = element(document, 'section', 'task-progress-card');
  card.hidden = true;
  const header = document.createElement('header');
  const kicker = element(
    document,
    'span',
    'task-progress-kicker',
    lookup('download.progress.working', 'Task in progress'),
  );
  const title = document.createElement('h2');
  header.append(kicker, title);
  const phase = element(document, 'p', 'task-progress-phase');
  phase.setAttribute('aria-live', 'polite');
  const row = element(document, 'div', 'task-progress-meter-row');
  const meter = document.createElement('progress');
  meter.max = PERCENT_MAXIMUM;
  const percent = document.createElement('output');
  percent.className = 'task-progress-percent';
  row.append(meter, percent);
  const times = element(document, 'dl', 'task-progress-times');
  const timeValues = [
    [lookup('download.progress.elapsed', 'Elapsed'), ''],
    [
      lookup('download.progress.remaining', 'Estimated remaining'),
      lookup('download.progress.estimating', 'Estimating...'),
    ],
    [lookup('download.progress.completion', 'Estimated completion'), '-'],
  ].map(([label, value]) => {
    const wrapper = document.createElement('div');
    wrapper.append(
      element(document, 'dt', '', label),
      element(document, 'dd', '', value),
    );
    times.append(wrapper);
    return wrapper.lastElementChild;
  });
  const cancel = element(
    document,
    'button',
    'task-progress-cancel',
    copy.cancel,
  );
  cancel.type = 'button';
  card.append(header, phase, row, times, cancel);
  return {
    card,
    elements: {
      title,
      phase,
      meter,
      percent,
      elapsed: timeValues[0],
      remaining: timeValues[1],
      completion: timeValues[2],
      cancel,
    },
  };
}

function createChoiceCard(document, copy) {
  const card = element(document, 'section', 'task-progress-card');
  const header = document.createElement('header');
  header.append(
    element(document, 'h2', '', copy.download),
    element(document, 'p', 'task-progress-phase', copy.choose),
  );
  const choices = element(document, 'div', 'handbook-export-choices');
  const pdf = element(document, 'button', 'handbook-export-choice', copy.pdf);
  const epub = element(document, 'button', 'handbook-export-choice', copy.epub);
  const close = element(
    document,
    'button',
    'handbook-export-close',
    copy.cancel,
  );
  for (const button of [pdf, epub, close]) button.type = 'button';
  choices.append(pdf, epub, close);
  card.append(header, choices);
  return { card, pdf, epub, close };
}

function createController(document, locale) {
  const copy = getHandbookCopy(locale);
  const dialog = document.createElement('dialog');
  dialog.className = 'task-progress-dialog';
  const choice = createChoiceCard(document, copy);
  const progressView = createProgressCard(document, copy);
  dialog.append(choice.card, progressView.card);
  document.body.append(dialog);
  let running = false;
  const reset = () => {
    choice.card.hidden = false;
    progressView.card.hidden = true;
    choice.pdf.disabled = false;
    choice.epub.disabled = false;
  };
  const progress = createTaskProgress(
    { dialog, ...progressView.elements },
    undefined,
    { ensureStyles: () => loadFeatureStylesheet('task-progress') },
  );

  const run = async (format) => {
    running = true;
    choice.pdf.disabled = true;
    choice.epub.disabled = true;
    choice.card.hidden = true;
    progressView.card.hidden = false;
    const phase = format === 'pdf' ? copy.creatingPdf : copy.creatingEpub;
    const task = progress.start({ title: copy.title, phase });
    let completed = false;
    try {
      const module =
        format === 'pdf'
          ? await import('./handbook-pdf.js')
          : await import('./epub.js');
      const create =
        format === 'pdf' ? module.createHandbookPdf : module.createHandbookEpub;
      const blob = await create(locale, {
        signal: task.signal,
        onProgress: (fraction) => task.update(fraction, phase),
      });
      throwIfAborted(task.signal);
      task.update(1, phase);
      download(document, blob, `qr-handbook-${locale}.${format}`);
      completed = true;
    } catch (error) {
      if (!isAbortError(error)) {
        console.error(error);
        alert(copy.failed);
      }
    } finally {
      running = false;
      task.finish({ completed });
      if (!dialog.open) reset();
    }
  };
  choice.pdf.addEventListener('click', () => void run('pdf'));
  choice.epub.addEventListener('click', () => void run('epub'));
  choice.close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!running) reset();
  });
  dialog.addEventListener('cancel', () => {
    if (!running) dialog.close();
  });
  return {
    async open() {
      await loadFeatureStylesheet('task-progress');
      reset();
      if (!dialog.open) dialog.showModal();
    },
  };
}

export async function openHandbookExportDialog(locale = 'en-US') {
  controller ??= createController(document, locale);
  await controller.open();
}
