const IGNORED_TARGETS = '.slippy-map-controls, .slippy-map-attribution';

export function attachMapPointerDrag(
  container,
  { getCenterPoint, onPan, onSelect, onZoom, toMapClient },
) {
  const pointers = new Map();
  let drag = null;
  let pinchDistance = 0;

  container.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest(IGNORED_TARGETS)) return;
    container.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      const point = toMapClient(event.clientX, event.clientY);
      drag = {
        center: getCenterPoint(),
        id: event.pointerId,
        moved: false,
        x: point.clientX,
        y: point.clientY,
      };
      container.classList.add('is-dragging');
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
    }
  });

  container.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1 && drag?.id === event.pointerId) {
      const point = toMapClient(event.clientX, event.clientY);
      const deltaX = point.clientX - drag.x;
      const deltaY = point.clientY - drag.y;
      if (Math.hypot(deltaX, deltaY) > 4) drag.moved = true;
      onPan(drag.center, deltaX, deltaY);
    } else if (pointers.size === 2) {
      const [first, second] = [...pointers.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      if (distance > pinchDistance * 1.35) {
        onZoom(1);
        pinchDistance = distance;
      } else if (distance < pinchDistance * 0.74) {
        onZoom(-1);
        pinchDistance = distance;
      }
    }
  });

  const finish = (event, cancelled = false) => {
    if (!pointers.has(event.pointerId)) return;
    const select =
      !cancelled &&
      pointers.size === 1 &&
      drag?.id === event.pointerId &&
      !drag.moved;
    pointers.delete(event.pointerId);
    if (select) onSelect(event.clientX, event.clientY);
    const remaining = [...pointers.entries()][0];
    drag = remaining
      ? {
          center: getCenterPoint(),
          id: remaining[0],
          moved: true,
          x: remaining[1].x,
          y: remaining[1].y,
        }
      : null;
    if (!remaining) container.classList.remove('is-dragging');
  };
  container.addEventListener('pointerup', (event) => finish(event));
  container.addEventListener('pointercancel', (event) => finish(event, true));
}
