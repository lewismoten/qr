const PALETTE = [
  ['Black', '#000000'], ['Blue', '#0000aa'], ['Green', '#00aa00'], ['Cyan', '#00aaaa'],
  ['Red', '#aa0000'], ['Magenta', '#aa00aa'], ['Brown', '#aa5500'], ['Light gray', '#aaaaaa'],
  ['Dark gray', '#555555'], ['Bright blue', '#5555ff'], ['Bright green', '#55ff55'],
  ['Bright cyan', '#55ffff'], ['Bright red', '#ff5555'], ['Bright magenta', '#ff55ff'],
  ['Yellow', '#ffff55'], ['White', '#ffffff'],
];

export function createPixelArtEditor({
  paletteElement,
  customColorInput,
  clearButton,
  grid,
  sizeInput,
  sizeValue,
  onChange,
}) {
  let size = 16;
  let pixels = Array(size * size).fill(null);
  let activeColor = '#000000';
  let paintValue = null;
  let painting = false;
  let renderFrame = 0;

  const syncSizeLabel = () => {
    sizeValue.textContent = `${size} x ${size}`;
  };
  const syncCell = (cell) => {
    const color = pixels[Number.parseInt(cell.dataset.pixelIndex, 10)];
    cell.classList.toggle('is-painted', Boolean(color));
    if (color) cell.style.setProperty('--pixel-color', color);
    else cell.style.removeProperty('--pixel-color');
    cell.setAttribute('aria-pressed', String(Boolean(color)));
  };
  const syncGrid = () => grid.querySelectorAll('.pixel-art-cell').forEach(syncCell);
  const syncPalette = () => {
    paletteElement.querySelectorAll('.pixel-palette-button').forEach((button) => {
      const selected = (button.dataset.pixelColor || null) === activeColor;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    customColorInput.classList.toggle(
      'is-active',
      Boolean(activeColor) && !PALETTE.some(([, color]) => color === activeColor),
    );
  };
  const ensurePalette = () => {
    if (paletteElement.childElementCount) return;
    const fragment = document.createDocumentFragment();
    [['Transparent / eraser', null], ...PALETTE].forEach(([label, color]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `pixel-palette-button${color ? '' : ' is-eraser'}`;
      button.dataset.pixelColor = color || '';
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', 'false');
      if (color) button.style.setProperty('--palette-color', color);
      fragment.append(button);
    });
    paletteElement.append(fragment);
    syncPalette();
  };
  const ensureGrid = () => {
    if (grid.childElementCount) return;
    grid.style.setProperty('--pixel-grid-size', String(size));
    grid.setAttribute('aria-label', `${size} by ${size} pixel art editor`);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < size * size; index += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pixel-art-cell';
      cell.dataset.pixelIndex = String(index);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Pixel ${index + 1}`);
      cell.setAttribute('aria-pressed', 'false');
      fragment.append(cell);
    }
    grid.append(fragment);
  };
  const scheduleRender = () => {
    if (renderFrame) return;
    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = 0;
      onChange();
    });
  };
  const paintCell = (cell) => {
    if (!cell?.classList.contains('pixel-art-cell')) return;
    const index = Number.parseInt(cell.dataset.pixelIndex, 10);
    if (!Number.isInteger(index) || pixels[index] === paintValue) return;
    pixels[index] = paintValue;
    syncCell(cell);
    scheduleRender();
  };
  const resize = (nextSize) => {
    const normalized = Math.min(32, Math.max(8, nextSize - (nextSize % 2)));
    if (normalized === size) return;
    const previousSize = size;
    const previousPixels = pixels;
    pixels = Array(normalized * normalized).fill(null);
    for (let row = 0; row < normalized; row += 1) {
      for (let column = 0; column < normalized; column += 1) {
        const sourceRow = Math.min(previousSize - 1, Math.floor((row * previousSize) / normalized));
        const sourceColumn = Math.min(previousSize - 1, Math.floor((column * previousSize) / normalized));
        pixels[row * normalized + column] = previousPixels[sourceRow * previousSize + sourceColumn];
      }
    }
    size = normalized;
    grid.replaceChildren();
    ensureGrid();
    syncGrid();
    syncSizeLabel();
  };

  paletteElement.addEventListener('click', (event) => {
    const button = event.target.closest('.pixel-palette-button');
    if (!button) return;
    activeColor = button.dataset.pixelColor || null;
    syncPalette();
  });
  customColorInput.addEventListener('input', () => {
    activeColor = customColorInput.value;
    syncPalette();
  });
  sizeInput.addEventListener('input', () => resize(Number.parseInt(sizeInput.value, 10) || 16));
  grid.addEventListener('pointerdown', (event) => {
    const cell = event.target.closest('.pixel-art-cell');
    if (!cell) return;
    event.preventDefault();
    painting = true;
    paintValue = activeColor;
    paintCell(cell);
  });
  grid.addEventListener('pointermove', (event) => {
    if (!painting) return;
    event.preventDefault();
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.pixel-art-cell');
    if (cell && grid.contains(cell)) paintCell(cell);
  });
  grid.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    paintValue = activeColor;
    paintCell(event.target.closest('.pixel-art-cell'));
  });
  window.addEventListener('pointerup', () => { painting = false; });
  window.addEventListener('pointercancel', () => { painting = false; });
  clearButton.addEventListener('click', () => {
    pixels = Array(size * size).fill(null);
    syncGrid();
    onChange();
  });

  const initialize = () => {
    ensurePalette();
    ensureGrid();
    syncGrid();
    syncSizeLabel();
  };
  return { initialize, syncPalette, syncSizeLabel, getState: () => ({ size, pixels }) };
}
