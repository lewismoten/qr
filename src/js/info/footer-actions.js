const ACTION_ICONS = Object.freeze({
  about: '\u{2139}\u{FE0F}',
  privacy: '\u{1F512}',
  spec: '\u{1F4D0}',
});

function inferredAction(link) {
  const name = new URL(link.href, document.baseURI).pathname.split('/').pop();
  return {
    'about.html': 'about',
    'privacy.html': 'privacy',
    'spec.html': 'spec',
  }[name];
}

export function setupFooterActions(root = document) {
  root
    .querySelectorAll('.site-footer a, .info-page-footer a, .spec-footer a')
    .forEach((link) => {
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
