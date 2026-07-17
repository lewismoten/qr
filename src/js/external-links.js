function prepareExternalLink(link) {
  const href = link.getAttribute('href');
  if (!href) return;

  let destination;
  try {
    destination = new URL(href, window.location.href);
  } catch {
    return;
  }
  if (
    !['http:', 'https:'].includes(destination.protocol) ||
    destination.origin === window.location.origin
  )
    return;

  link.setAttribute('target', '_blank');
  const relations = new Set(
    (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean),
  );
  relations.add('noopener');
  relations.add('noreferrer');
  link.setAttribute('rel', [...relations].join(' '));

  link.classList.add('external-link');
  if (!link.querySelector(':scope > .external-link-indicator')) {
    const indicator = document.createElement('span');
    indicator.className = 'external-link-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.textContent = '\u2197';
    link.append(indicator);
  }
}

function prepareLinks(root) {
  if (root.matches?.('a[href]')) prepareExternalLink(root);
  root.querySelectorAll?.('a[href]').forEach(prepareExternalLink);
}

export function setupExternalLinks(root = document) {
  prepareLinks(root);

  root.addEventListener(
    'click',
    (event) => {
      const link = event.target.closest?.('a[href]');
      if (link) prepareExternalLink(link);
    },
    true,
  );

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') prepareExternalLink(mutation.target);
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) prepareLinks(node);
      });
    });
  });
  observer.observe(root.documentElement || root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['href'],
  });

  return () => observer.disconnect();
}
