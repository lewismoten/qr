export function createOutlineSelector({ buttons, defaultValue = 'codewords', onChange }) {
  let value = defaultValue;

  const sync = () => {
    buttons.forEach((button) => {
      const active = button.dataset.outlineMode === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      value = button.dataset.outlineMode || defaultValue;
      sync();
      onChange?.(value);
    });
  });

  return {
    get value() {
      return value;
    },
    sync,
  };
}
