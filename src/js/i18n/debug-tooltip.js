import { getTranslationEntries, preloadTranslationEntries } from './index.js';

const KEY_SELECTOR = [
  '[data-i18n]',
  '[data-i18n-aria-label]',
  '[data-i18n-placeholder]',
  '[data-i18n-title]',
  '[data-i18n-value]',
].join(',');

function getKey(element) {
  return (
    element?.dataset.i18n ||
    element?.dataset.i18nAriaLabel ||
    element?.dataset.i18nPlaceholder ||
    element?.dataset.i18nTitle ||
    element?.dataset.i18nValue
  );
}

function getLanguageName(locale) {
  try {
    return (
      new Intl.DisplayNames([locale], { type: 'language' }).of(locale) || locale
    );
  } catch {
    return locale;
  }
}

export function setupTranslationDebugTooltip({
  document = globalThis.document,
  window = globalThis.window,
} = {}) {
  if (!document?.body || !window) return;

  const tooltip = document.createElement('aside');
  tooltip.className = 'i18n-debug-tooltip';
  tooltip.id = 'i18n-debug-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  document.body.appendChild(tooltip);

  let activeElement;
  let activeKey = '';
  let request = 0;

  const position = () => {
    if (!activeElement || tooltip.hidden) return;
    const anchor = activeElement.getBoundingClientRect();
    const bounds = tooltip.getBoundingClientRect();
    const gap = 8;
    const left = Math.min(
      Math.max(gap, anchor.left),
      Math.max(gap, window.innerWidth - bounds.width - gap),
    );
    const above = anchor.top - bounds.height - gap;
    const top =
      above >= gap
        ? above
        : Math.min(
            window.innerHeight - bounds.height - gap,
            anchor.bottom + gap,
          );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(gap, top)}px`;
  };

  const renderHeading = (key) => {
    tooltip.replaceChildren();
    const heading = document.createElement('header');
    const kicker = document.createElement('span');
    kicker.textContent = 'Translation key';
    const code = document.createElement('code');
    code.textContent = key;
    heading.append(kicker, code);
    tooltip.appendChild(heading);
  };

  const renderEntries = (entries) => {
    const list = document.createElement('div');
    list.className = 'i18n-debug-translations';
    entries.forEach(({ code, flag, nativeName, value }) => {
      const row = document.createElement('section');
      const label = document.createElement('strong');
      label.lang = code;
      label.textContent = `${flag} ${nativeName || getLanguageName(code)}`;
      const translation = document.createElement('span');
      translation.lang = code;
      translation.dir = /^(ar|fa|he|ur)(-|$)/i.test(code) ? 'rtl' : 'ltr';
      translation.textContent = value ?? 'Missing translation';
      translation.classList.toggle('is-missing', value === undefined);
      row.append(label, translation);
      list.appendChild(row);
    });
    tooltip.appendChild(list);
  };

  const show = async (element) => {
    if (!document.documentElement.classList.contains('i18n-debug')) return;
    const key = getKey(element);
    if (!key) return;
    activeElement = element;
    activeKey = key;
    const currentRequest = ++request;
    renderHeading(key);
    const loading = document.createElement('p');
    loading.className = 'i18n-debug-loading';
    loading.textContent = 'Loading translations...';
    tooltip.appendChild(loading);
    tooltip.hidden = false;
    position();

    const entries = await getTranslationEntries(key);
    if (currentRequest !== request || activeKey !== key) return;
    loading.remove();
    renderEntries(entries);
    position();
  };

  const hide = () => {
    request += 1;
    activeElement = undefined;
    activeKey = '';
    tooltip.hidden = true;
  };

  document.addEventListener('pointerover', (event) => {
    const element = event.target.closest?.(KEY_SELECTOR);
    if (element && element !== activeElement) show(element);
  });
  document.addEventListener('pointerout', (event) => {
    if (!activeElement || activeElement.contains(event.relatedTarget)) return;
    hide();
  });
  document.addEventListener('focusin', (event) => {
    const element = event.target.closest?.(KEY_SELECTOR);
    if (element) show(element);
  });
  document.addEventListener('focusout', (event) => {
    if (activeElement && !activeElement.contains(event.relatedTarget)) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
  window.addEventListener('resize', position);
  window.addEventListener('scroll', position, true);
  document.addEventListener('languagechange', hide);
  preloadTranslationEntries();
}
