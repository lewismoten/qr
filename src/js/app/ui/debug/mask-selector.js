import { isMaskActive } from '@lewismoten/qr';
import { isFunctionModule } from '../../qr-regions.js';
import { lookup } from '../../../i18n/index.js';

const MASK_BLUE = '#2563eb';
const MASK_PREVIEW_TEXT = 'MASK PREVIEW';

function drawQrThumbnail(targetCanvas, qrDefinition, options, moduleIsDark) {
  const context = targetCanvas.getContext('2d');
  const margin = options.margin ?? 1;
  const totalModules = qrDefinition.modules.size + margin * 2;
  const moduleSize = Math.max(
    1,
    Math.floor(
      Math.min(targetCanvas.width, targetCanvas.height) / totalModules,
    ),
  );
  const drawSize = totalModules * moduleSize;
  const offsetX = Math.floor((targetCanvas.width - drawSize) / 2);
  const offsetY = Math.floor((targetCanvas.height - drawSize) / 2);
  context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  context.fillStyle = options.color?.light || '#ffffff';
  context.fillRect(offsetX, offsetY, drawSize, drawSize);
  context.fillStyle = options.color?.dark || '#111827';
  for (let row = 0; row < qrDefinition.modules.size; row += 1) {
    for (let column = 0; column < qrDefinition.modules.size; column += 1) {
      if (
        !isFunctionModule(qrDefinition, row, column) ||
        !moduleIsDark(qrDefinition, row, column)
      )
        continue;
      context.fillRect(
        offsetX + (column + margin) * moduleSize,
        offsetY + (row + margin) * moduleSize,
        moduleSize,
        moduleSize,
      );
    }
  }
  for (let row = 0; row < qrDefinition.modules.size; row += 1) {
    for (let column = 0; column < qrDefinition.modules.size; column += 1) {
      if (
        isFunctionModule(qrDefinition, row, column) ||
        !isMaskActive(qrDefinition.maskPattern, row, column)
      )
        continue;
      context.fillStyle = MASK_BLUE;
      context.fillRect(
        offsetX + (column + margin) * moduleSize,
        offsetY + (row + margin) * moduleSize,
        moduleSize,
        moduleSize,
      );
    }
  }
}

export function createMaskSelector({
  grid,
  input,
  values,
  encoder,
  moduleIsDark,
  buildOptions,
  onChange,
}) {
  const sync = () => {
    const activeValue = input.value;
    grid.querySelectorAll('.mask-option').forEach((button) => {
      const isActive = button.dataset.maskValue === activeValue;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-checked', String(isActive));
    });
  };

  const createButton = (maskValue) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mask-option';
    button.dataset.maskValue = maskValue;
    button.setAttribute('role', 'radio');

    const preview = document.createElement('div');
    preview.className = 'mask-preview';
    if (maskValue === '') {
      preview.classList.add('mask-preview-auto');
      const autoTitle = document.createElement('span');
      autoTitle.textContent = lookup('common.auto', 'Auto');
      const autoValue = document.createElement('span');
      autoValue.className = 'mask-auto-value';
      autoValue.textContent = lookup('mask.value', 'Mask {value}', {
        value: '-',
      });
      preview.append(autoTitle, autoValue);
    } else {
      const thumbnail = document.createElement('canvas');
      thumbnail.width = 96;
      thumbnail.height = 96;
      thumbnail.className = 'mask-canvas';
      preview.appendChild(thumbnail);
    }

    const label = document.createElement('span');
    label.className = 'mask-label';
    label.textContent =
      maskValue === ''
        ? lookup('mask.bestFit', 'Best fit')
        : lookup('mask.value', 'Mask {value}', { value: maskValue });
    button.append(preview, label);
    button.addEventListener('click', () => {
      input.value = maskValue;
      sync();
      onChange();
    });
    return button;
  };

  const ensure = () => {
    if (grid.childElementCount > 0) return;
    values.forEach((maskValue) => grid.appendChild(createButton(maskValue)));
  };

  const updateAutoMask = (definition) => {
    const value = grid.querySelector('.mask-auto-value');
    if (value && Number.isInteger(definition?.maskPattern)) {
      value.textContent = lookup('mask.value', 'Mask {value}', {
        value: definition.maskPattern,
      });
    }
  };

  const renderPreviews = (_encodedText, appliedDefinition) => {
    ensure();
    if (appliedDefinition) {
      if (input.value === '') updateAutoMask(appliedDefinition);
      return;
    }
    const previewValue = MASK_PREVIEW_TEXT;
    try {
      updateAutoMask(encoder.create(previewValue, buildOptions('')));
    } catch (error) {
      console.error(error);
    }
    grid.querySelectorAll('.mask-option').forEach((button) => {
      const previewCanvas = button.querySelector('canvas');
      if (!previewCanvas) return;
      try {
        const previewOptions = buildOptions(button.dataset.maskValue);
        const definition = encoder.create(previewValue, previewOptions);
        drawQrThumbnail(
          previewCanvas,
          definition,
          previewOptions,
          moduleIsDark,
        );
      } catch (error) {
        console.error(error);
      }
    });
  };

  return { ensure, sync, renderPreviews };
}
