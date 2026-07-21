const CHAPTER_PREFIX = 'handbook-chapter-';
const PUBLIC_SITE_ORIGIN = 'https://qr.lewismoten.com';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
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
  const normalized = new URL(url);
  if (LOCAL_HOSTS.has(normalized.hostname)) {
    const publicOrigin = new URL(PUBLIC_SITE_ORIGIN);
    normalized.protocol = publicOrigin.protocol;
    normalized.host = publicOrigin.host;
  }
  return `${normalized.origin}${normalized.pathname}`;
}

function ensureHeadingIds(page) {
  page.content.querySelectorAll('h2, h3').forEach((heading, index) => {
    if (!heading.id) heading.id = `section-${index + 1}`;
  });
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
    if (!targetPage) {
      link.classList?.add('handbook-external-link');
      const ownerDocument = page.content.ownerDocument;
      if (
        ownerDocument &&
        !link.querySelector?.(
          '.handbook-external-indicator, .external-link-indicator',
        )
      ) {
        const indicator = ownerDocument.createElement('span');
        indicator.className = 'handbook-external-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        indicator.textContent = '\u2197';
        link.append(indicator);
      }
      return;
    }
    const originalId = decodedFragment(url);
    const targetId = targetPage.ids.get(originalId) || targetPage.chapterId;
    link.setAttribute('href', `${chapterHref(targetPage)}#${targetId}`);
    link.removeAttribute?.('target');
    link.removeAttribute?.('rel');
    link
      .querySelectorAll?.(
        '.external-link-indicator, .resource-language-indicator',
      )
      .forEach((indicator) => indicator.remove());
  });
}

export function prepareHandbookPages(pages, chapterHref = () => '') {
  pages.forEach(ensureHeadingIds);
  pages.forEach(namespacePageIds);
  const pagesByLocation = new Map(
    pages.map((page) => [pageLocation(page.url), page]),
  );
  pages.forEach((page) => {
    rewritePageLinks(page, pagesByLocation, chapterHref);
  });
  return pages;
}

function headingOutline(page) {
  const roots = [];
  let parent = null;
  page.content.querySelectorAll('h2, h3').forEach((heading) => {
    const node = {
      title: heading.textContent.trim(),
      href: `#${heading.id}`,
      children: [],
    };
    if (heading.tagName === 'H2') {
      roots.push(node);
      parent = node;
    } else if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function buildHandbookOutline(pages, sectionLabels = {}) {
  const outline = [];
  const groups = new Map();
  pages.forEach((page) => {
    const [section] = page.route.split('/');
    if (!page.route.includes('/')) {
      outline.push({
        page,
        title: page.title,
        children: page.content ? headingOutline(page) : [],
      });
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
