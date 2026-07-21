export const HANDBOOK_AUTHOR = 'Lewis Moten III';
export const HANDBOOK_COVER_WIDTH = 1200;
export const HANDBOOK_COVER_HEIGHT = 1600;
const HANDBOOK_URL = 'https://qr.lewismoten.com/';
const QUIET_ZONE_MODULES = 4;
let encoderRequest;

export function loadHandbookEncoder() {
  encoderRequest ??= import('/dist/qr.min.js').then((module) => module.default);
  return encoderRequest;
}

function qrSvg(document, qrEncoder) {
  const { modules } = qrEncoder.create(HANDBOOK_URL, {
    errorCorrectionLevel: 'M',
  });
  const extent = modules.size + QUIET_ZONE_MODULES * 2;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${extent} ${extent}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', HANDBOOK_URL);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const commands = [];
  for (let row = 0; row < modules.size; row += 1) {
    for (let column = 0; column < modules.size; column += 1) {
      if (!modules.get(row, column)) continue;
      const x = column + QUIET_ZONE_MODULES;
      const y = row + QUIET_ZONE_MODULES;
      commands.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  path.setAttribute('d', commands.join(''));
  path.setAttribute('fill', '#071827');
  svg.append(path);
  return svg;
}

function element(document, name, className, text) {
  const result = document.createElement(name);
  result.className = className;
  if (text) result.textContent = text;
  return result;
}

function metadataList(document, copy, metadata) {
  const list = document.createElement('dl');
  for (const [term, description] of [
    [copy.author, metadata.author],
    [copy.published, metadata.publishedText],
  ]) {
    const wrapper = document.createElement('div');
    wrapper.append(
      element(document, 'dt', '', term),
      element(document, 'dd', '', description),
    );
    list.append(wrapper);
  }
  return list;
}

export function createFrontMatter(document, copy, metadata, qrEncoder) {
  const cover = element(document, 'section', 'handbook-cover');
  const qr = element(document, 'div', 'handbook-cover-qr');
  qr.append(qrSvg(document, qrEncoder));
  cover.append(
    qr,
    element(document, 'h1', '', copy.title),
    element(document, 'p', '', copy.subtitle),
    element(document, 'p', 'handbook-cover-author', metadata.author),
  );

  const title = element(document, 'section', 'handbook-title-page');
  title.append(
    element(document, 'h1', '', copy.title),
    element(document, 'p', '', copy.subtitle),
    metadataList(document, copy, metadata),
  );

  const preface = element(document, 'section', 'handbook-preface');
  preface.append(
    element(document, 'h1', '', copy.prefaceTitle),
    element(document, 'p', '', copy.prefaceIntroduction),
    element(document, 'p', '', copy.prefaceCaveat),
  );
  return { cover, title, preface };
}

export function createDivision(document, title, index) {
  const section = element(document, 'section', 'handbook-division');
  section.append(
    element(
      document,
      'p',
      'handbook-division-kicker',
      String(index).padStart(2, '0'),
    ),
    element(document, 'h1', '', title),
  );
  return section;
}

export async function loadHandbookMetadata(locale, signal) {
  let publishedAt;
  try {
    const response = await fetch('/site-metadata.json', { signal });
    if (response.ok) ({ publishedAt } = await response.json());
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  const parsed = Date.parse(publishedAt);
  const date = Number.isFinite(parsed) ? new Date(parsed) : new Date();
  return {
    author: HANDBOOK_AUTHOR,
    publishedAt: date.toISOString(),
    publishedText: new Intl.DateTimeFormat(locale, {
      dateStyle: 'long',
    }).format(date),
  };
}

export function createCoverImage(document, copy, metadata, qrEncoder) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('xmlns', namespace);
  svg.setAttribute('width', String(HANDBOOK_COVER_WIDTH));
  svg.setAttribute('height', String(HANDBOOK_COVER_HEIGHT));
  svg.setAttribute(
    'viewBox',
    `0 0 ${HANDBOOK_COVER_WIDTH} ${HANDBOOK_COVER_HEIGHT}`,
  );
  const definitions = document.createElementNS(namespace, 'defs');
  const gradient = document.createElementNS(namespace, 'linearGradient');
  gradient.id = 'cover-gradient';
  gradient.setAttribute('x2', '1');
  gradient.setAttribute('y2', '1');
  for (const [offset, color] of [
    ['0', '#071827'],
    ['0.65', '#0f4c4b'],
    ['1', '#d7a849'],
  ]) {
    const stop = document.createElementNS(namespace, 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    gradient.append(stop);
  }
  definitions.append(gradient);
  const background = document.createElementNS(namespace, 'rect');
  background.setAttribute('width', '1200');
  background.setAttribute('height', '1600');
  background.setAttribute('fill', 'url(#cover-gradient)');
  const qrCard = document.createElementNS(namespace, 'rect');
  qrCard.setAttribute('x', '270');
  qrCard.setAttribute('y', '240');
  qrCard.setAttribute('width', '660');
  qrCard.setAttribute('height', '660');
  qrCard.setAttribute('rx', '52');
  qrCard.setAttribute('fill', '#ffffff');
  const qr = qrSvg(document, qrEncoder);
  qr.setAttribute('x', '300');
  qr.setAttribute('y', '270');
  qr.setAttribute('width', '600');
  qr.setAttribute('height', '600');
  const title = document.createElementNS(namespace, 'text');
  title.setAttribute('x', '600');
  title.setAttribute('y', '1080');
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('textLength', '930');
  title.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  title.setAttribute('fill', '#fffaf0');
  title.setAttribute('font-family', 'sans-serif');
  title.setAttribute('font-size', '68');
  title.setAttribute('font-weight', '800');
  title.textContent = copy.title;
  const author = document.createElementNS(namespace, 'text');
  author.setAttribute('x', '600');
  author.setAttribute('y', '1240');
  author.setAttribute('text-anchor', 'middle');
  author.setAttribute('fill', '#5eead4');
  author.setAttribute('font-family', 'sans-serif');
  author.setAttribute('font-size', '42');
  author.textContent = metadata.author;
  svg.append(definitions, background, qrCard, qr, title, author);
  return new XMLSerializer().serializeToString(svg);
}
