export function createElement(tag, className, attributes = {}) {
  const element = document.createElement(tag);
  element.className = className;
  Object.entries(attributes).forEach(([name, value]) =>
    element.setAttribute(name, value),
  );
  return element;
}

export function createAttribution(text, url) {
  const attribution = createElement('div', 'slippy-map-attribution');
  const link = document.createElement('a');
  link.href = url;
  link.textContent = text;
  attribution.appendChild(link);
  return attribution;
}
