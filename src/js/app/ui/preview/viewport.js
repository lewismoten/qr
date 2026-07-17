export function createPreviewViewport({
  viewport,
  canvas,
  controls,
  fitButton,
  actualButton,
  getRenderMetrics,
}) {
  let viewMode = 'fit';
  let panX = 0;
  let panY = 0;
  let panPointer = null;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let syncRequest = 0;

  const getPanBounds = () => ({
    x: Math.max(0, (canvas.width - viewport.clientWidth) / 2),
    y: Math.max(0, (canvas.height - viewport.clientHeight) / 2),
  });

  const applyPan = () => {
    const bounds = getPanBounds();
    panX = Math.max(-bounds.x, Math.min(bounds.x, panX));
    panY = Math.max(-bounds.y, Math.min(bounds.y, panY));
    const centeredLeft = (viewport.clientWidth - canvas.width) / 2;
    const centeredTop = (viewport.clientHeight - canvas.height) / 2;
    viewport.style.setProperty(
      '--qr-preview-left',
      `${Math.round(centeredLeft + panX)}px`,
    );
    viewport.style.setProperty(
      '--qr-preview-top',
      `${Math.round(centeredTop + panY)}px`,
    );
  };

  const setMode = (mode, resetPan = false) => {
    viewMode = mode === 'actual' ? 'actual' : 'fit';
    if (resetPan) {
      panX = 0;
      panY = 0;
    }
    const actualSize = viewMode === 'actual';
    viewport.classList.toggle('is-actual', actualSize);
    viewport.classList.toggle('is-fit', !actualSize);
    fitButton.classList.toggle('is-active', !actualSize);
    actualButton.classList.toggle('is-active', actualSize);
    fitButton.setAttribute('aria-pressed', String(!actualSize));
    actualButton.setAttribute('aria-pressed', String(actualSize));
    applyPan();
  };

  const syncFitSize = () => {
    const fitRatio = Math.min(
      1,
      viewport.clientWidth / canvas.width,
      viewport.clientHeight / canvas.height,
    );
    let fitWidth = canvas.width;
    let fitHeight = canvas.height;
    const { renderedWidth, moduleScale } = getRenderMetrics();
    if (fitRatio < 1 && renderedWidth && moduleScale) {
      const totalModules = Math.round(renderedWidth / moduleScale);
      const fittedModuleScale = Math.floor(moduleScale * fitRatio);
      fitWidth =
        fittedModuleScale >= 1
          ? totalModules * fittedModuleScale
          : Math.max(1, Math.floor(canvas.width * fitRatio));
      fitHeight = Math.max(
        1,
        Math.round(canvas.height * (fitWidth / canvas.width)),
      );
    }
    viewport.style.setProperty('--qr-fit-width', `${fitWidth}px`);
    viewport.style.setProperty('--qr-fit-height', `${fitHeight}px`);
  };

  const scheduleSync = () => {
    cancelAnimationFrame(syncRequest);
    syncRequest = requestAnimationFrame(() => {
      syncFitSize();
      const oversized =
        canvas.width > viewport.clientWidth ||
        canvas.height > viewport.clientHeight;
      controls.classList.toggle('is-hidden', !oversized);
      controls.setAttribute('aria-hidden', String(!oversized));
      applyPan();
    });
  };

  const stopPan = (event) => {
    if (panPointer !== event.pointerId) return;
    panPointer = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(event.pointerId))
      viewport.releasePointerCapture(event.pointerId);
  };

  fitButton.addEventListener('click', () => setMode('fit'));
  actualButton.addEventListener('click', () => setMode('actual', true));
  viewport.addEventListener('pointerdown', (event) => {
    if (
      viewMode !== 'actual' ||
      (event.button !== undefined && event.button !== 0)
    )
      return;
    const bounds = getPanBounds();
    if (bounds.x === 0 && bounds.y === 0) return;
    panPointer = event.pointerId;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panOriginX = panX;
    panOriginY = panY;
    viewport.classList.add('is-dragging');
    viewport.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  viewport.addEventListener('pointermove', (event) => {
    if (panPointer !== event.pointerId) return;
    panX = panOriginX + event.clientX - panStartX;
    panY = panOriginY + event.clientY - panStartY;
    applyPan();
  });
  viewport.addEventListener('pointerup', stopPan);
  viewport.addEventListener('pointercancel', stopPan);

  if ('ResizeObserver' in window)
    new ResizeObserver(scheduleSync).observe(viewport);
  else window.addEventListener('resize', scheduleSync);

  return { setMode, scheduleSync };
}
