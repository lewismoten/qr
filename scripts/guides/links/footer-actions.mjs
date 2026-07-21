function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function relativeUrl(fromFile, target) {
  const value = path.relative(path.dirname(fromFile), target);
  return value.startsWith('.') ? value : `./${value}`;
}

function footerActions(context) {
  return ['generator', 'guides', 'spec', 'about', 'privacy'].map((route) => ({
    action: route,
    href: relativeUrl(
      context.output,
      route === 'generator'
        ? 'index.html'
        : configuredGuidePath(
            context.config,
            route === 'guides' ? 'index' : route,
            context.locale,
          ),
    ),
    label: context.guideCopy[route],
  }));
}

export function normalizeGuideFooter(source, context) {
  const links = footerActions(context)
    .map(({ action, href, label }) => {
      return (
        `<a data-footer-action="${action}" href="${escapeHtml(href)}">` +
        `${escapeHtml(label)}</a>`
      );
    })
    .join('');
  return source.replace(
    /(<footer\b[^>]*class="[^"]*(?:info-page-footer|spec-footer)[^"]*"[^>]*>)[\s\S]*?<\/footer>/,
    '$1' +
      `<nav aria-label="${escapeHtml(context.guideCopy.navigationLabel)}">` +
      `${links}</nav></footer>`,
  );
}
import path from 'node:path';

import { configuredGuidePath } from '../html-config.mjs';
