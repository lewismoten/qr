const CHAPTER_PREFIX = 'handbook-chapter-';
const ID_REFERENCE_ATTRIBUTES = new Set([
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-errormessage',
  'aria-labelledby',
  'aria-owns',
  'for',
  'headers',
]);

function routeSlug(route) {
  return route.replaceAll('/', '-').replace(/[^a-z0-9-]/gi, '-');
}

export function getChapterId(route) {
  return `${CHAPTER_PREFIX}${routeSlug(route)}`;
}

function pageLocation(url) {
  return `${url.origin}${url.pathname}`;
}

function namespacePageIds(page) {
  const chapterId = getChapterId(page.route);
  const ids = new Map();
  page.content.querySelectorAll('[id]').forEach((element) => {
    const original = element.id;
    const replacement = `${chapterId}-${original}`;
    ids.set(original, replacement);
    element.id = replacement;
  });
  page.chapterId = chapterId;
  page.ids = ids;
  rewriteIdReferences(page);
}

function rewriteIdReferences(page) {
  page.content.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (ID_REFERENCE_ATTRIBUTES.has(attribute.name)) {
        const value = attribute.value
          .split(/\s+/)
          .map((id) => page.ids.get(id) || id)
          .join(' ');
        element.setAttribute(attribute.name, value);
        return;
      }
      if (element.matches('a[href]') && attribute.name === 'href') return;
      const value = attribute.value
        .replace(/url\(#([^)]+)\)/g, (match, id) => {
          return page.ids.has(id) ? `url(#${page.ids.get(id)})` : match;
        })
        .replace(/^#(.+)$/, (match, id) => {
          return page.ids.has(id) ? `#${page.ids.get(id)}` : match;
        });
      if (value !== attribute.value)
        element.setAttribute(attribute.name, value);
    });
  });
}

function decodedFragment(url) {
  if (!url.hash) return '';
  try {
    return decodeURIComponent(url.hash.slice(1));
  } catch {
    return url.hash.slice(1);
  }
}

function rewritePageLinks(page, pagesByLocation, chapterHref) {
  page.content.querySelectorAll('a[href]').forEach((link) => {
    let url;
    try {
      url = new URL(link.href, page.url);
    } catch {
      return;
    }
    const targetPage = pagesByLocation.get(pageLocation(url));
    if (!targetPage) return;
    const originalId = decodedFragment(url);
    const targetId = targetPage.ids.get(originalId) || targetPage.chapterId;
    link.setAttribute('href', `${chapterHref(targetPage)}#${targetId}`);
  });
}

export function prepareHandbookPages(pages, chapterHref = () => '') {
  pages.forEach(namespacePageIds);
  const pagesByLocation = new Map(
    pages.map((page) => [pageLocation(page.url), page]),
  );
  pages.forEach((page) => {
    rewritePageLinks(page, pagesByLocation, chapterHref);
  });
  return pages;
}

export function buildHandbookOutline(pages, sectionLabels = {}) {
  const outline = [];
  const groups = new Map();
  pages.forEach((page) => {
    const [section] = page.route.split('/');
    if (!page.route.includes('/')) {
      outline.push({ page, title: page.title });
      return;
    }
    let group = groups.get(section);
    if (!group) {
      group = {
        title: sectionLabels[section] || section,
        children: [],
      };
      groups.set(section, group);
      outline.push(group);
    }
    group.children.push({ page, title: page.title });
  });
  return outline;
}
