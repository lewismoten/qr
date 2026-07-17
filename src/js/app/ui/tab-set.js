export function createTabSet({
  buttons,
  panels,
  buttonData,
  panelData,
  defaultValue,
  setAriaPressed = true,
  onActivate,
}) {
  const activate = (value = defaultValue) => {
    buttons.forEach((button) => {
      const active = button.dataset[buttonData] === value;
      button.classList.toggle('is-active', active);
      if (setAriaPressed) button.setAttribute('aria-pressed', String(active));
    });

    panels.forEach((panel) => {
      const active = panel.dataset[panelData] === value;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });

    onActivate?.(value);
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => activate(button.dataset[buttonData] || defaultValue));
  });

  return activate;
}
