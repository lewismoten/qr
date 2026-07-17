const COLOR_IDS = {
  data: 'debug-data-color',
  mode: 'debug-mode-color',
  charCount: 'debug-char-count-color',
  ecLevel: 'debug-ecl-color',
  mask: 'debug-mask-color',
  errorCorrection: 'debug-ecc-color',
  remainder: 'debug-remainder-color',
  padding: 'debug-padding-color',
  terminator: 'debug-terminator-color',
  finder: 'debug-finder-color',
  alignment: 'debug-alignment-color',
  timing: 'debug-timing-color',
  format: 'debug-format-color',
  darkModule: 'debug-dark-module-color',
  version: 'debug-version-color',
};

export function getDebugColorElements(document) {
  return Object.fromEntries(Object.entries(COLOR_IDS)
    .map(([name, id]) => [name, document.getElementById(id)]));
}
