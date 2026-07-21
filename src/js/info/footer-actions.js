import { lookup } from '../i18n/index.js';

const ACTION_ICONS = Object.freeze({
  about: '\u{2139}\u{FE0F}',
  generator: '\u{25A6}',
  guides: '\u{1F9ED}',
  privacy: '\u{1F512}',
  spec: '\u{1F4D0}',
});
const GUIDE_ACTIONS = Object.freeze([
  {
    action: 'generator',
    href: '/index.html',
    label: () => lookup('info.guides.generator', 'Generator'),
  },
  {
    action: 'guides',
    href: '/guides/',
    label: () => lookup('footer.guides', 'Guides'),
  },
  {
    action: 'spec',
    href: '/spec.html',
    label: () => lookup('footer.specification', 'QR spec'),
  },
  {
    action: 'about',
    href: '/about.html',
    label: () => lookup('footer.about', 'About'),
  },
  {
    action: 'privacy',
    href: '/privacy.html',
    label: () => lookup('footer.privacy', 'Privacy'),
  },
]);

function inferredAction(link) {
  const name = new URL(link.href, document.baseURI).pathname.split('/').pop();
  return {
    'about.html': 'about',
    'guide-directory.html': 'guides',
    'index.html': 'generator',
    'privacy.html': 'privacy',
    'spec.html': 'spec',
  }[name];
}

function normalizeGuideFooter(footer) {
  const language = footer.querySelector(':scope > .guide-language-switcher');
  const existing = new Map();
  footer.querySelectorAll(':scope > nav > a').forEach((link) => {
    const action = link.dataset.footerAction || inferredAction(link);
    if (action) existing.set(action, link);
  });
  const navigation =
    footer.querySelector(':scope > nav') || document.createElement('nav');
  navigation.replaceChildren(
    ...GUIDE_ACTIONS.map(({ action, href, label }) => {
      const link = existing.get(action) || document.createElement('a');
      link.dataset.footerAction = action;
      if (!link.hasAttribute('href')) link.href = href;
      if (!link.textContent.trim()) link.textContent = label();
      return link;
    }),
  );
  footer.replaceChildren(navigation);
  if (language) footer.append(language);
  return navigation;
}

function decorateActions(navigation) {
  navigation.querySelectorAll(':scope > a').forEach((link) => {
    const action = link.dataset.footerAction || inferredAction(link);
    const iconValue = ACTION_ICONS[action];
    if (!iconValue || link.querySelector('.footer-action-icon')) return;
    const accessibleLabel = link.textContent.trim();
    const icon = document.createElement('span');
    const label = document.createElement('span');
    icon.className = 'footer-action-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = iconValue;
    label.className = 'footer-action-label';
    label.append(...link.childNodes);
    if (!link.hasAttribute('aria-label')) {
      link.setAttribute('aria-label', accessibleLabel);
    }
    if (link.dataset.i18n) {
      label.dataset.i18n = link.dataset.i18n;
      delete link.dataset.i18n;
    }
    link.dataset.footerAction = action;
    link.append(icon, label);
  });
}

export function setupFooterActions(root = document) {
  root.querySelectorAll('.info-page-footer, .spec-footer').forEach((footer) => {
    decorateActions(normalizeGuideFooter(footer));
  });
  root.querySelectorAll('.site-footer').forEach((footer) => {
    const navigation = footer.querySelector(':scope > nav');
    if (navigation) decorateActions(navigation);
  });
}
