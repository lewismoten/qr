import { loadHandbookPages } from './pages.js';
import { getHandbookCopy } from './copy.js';
import { HANDBOOK_TEXT_COLOR } from './handbook-styles.js';

const PRINT_DIALOG_DELAY_MS = 250;

const PRINT_CSS = `
@page { margin: .6in; }
body { color: ${HANDBOOK_TEXT_COLOR}; font: 11pt/1.5 Georgia, serif; }
h1, h2, h3 { break-after: avoid; font-family: sans-serif; }
a { color: inherit; }
.toc { break-after: page; }
.chapter { break-before: page; }
.chapter:first-of-type { break-before: auto; }
figure, table, article, pre { break-inside: avoid; }
img, svg, canvas { max-width: 100%; height: auto; }
button, input, select, textarea, dialog, .info-page-back { display: none; }
`;

function appendHeading(document, parent, level, text) {
  const heading = document.createElement(`h${level}`);
  heading.textContent = text;
  parent.append(heading);
}

function buildPrintDocument(document, pages, locale, copy) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.title = copy.title;
  const style = document.createElement('style');
  style.textContent = PRINT_CSS;
  document.head.replaceChildren(style);
  document.body.replaceChildren();
  appendHeading(document, document.body, 1, document.title);
  const contents = document.createElement('nav');
  contents.className = 'toc';
  appendHeading(document, contents, 2, copy.contents);
  const list = document.createElement('ol');
  contents.append(list);
  document.body.append(contents);
  pages.forEach((page, index) => {
    const id = `chapter-${index + 1}`;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = page.title;
    item.append(link);
    list.append(item);
    const chapter = document.createElement('section');
    chapter.id = id;
    chapter.className = 'chapter';
    appendHeading(document, chapter, 1, page.title);
    chapter.append(
      ...[...page.content.childNodes].map((node) => {
        return document.importNode(node, true);
      }),
    );
    document.body.append(chapter);
  });
}

export async function printHandbook(locale, target) {
  const copy = getHandbookCopy(locale);
  target.document.body.textContent = copy.preparing;
  const pages = await loadHandbookPages(locale);
  buildPrintDocument(target.document, pages, locale, copy);
  setTimeout(() => target.print(), PRINT_DIALOG_DELAY_MS);
}
