const WIDTH = 1000;
const HEIGHT = 500;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const normalizeLongitude = (value) =>
  ((((value + 180) % 360) + 360) % 360) - 180;

export function coordinatesToWorldPoint({ latitude, longitude }) {
  return {
    x: ((normalizeLongitude(longitude) + 180) / 360) * WIDTH,
    y: ((90 - clamp(latitude, -90, 90)) / 180) * HEIGHT,
  };
}

export function worldPointToCoordinates({ x, y }) {
  return {
    latitude: 90 - (clamp(y, 0, HEIGHT) / HEIGHT) * 180,
    longitude: normalizeLongitude((clamp(x, 0, WIDTH) / WIDTH) * 360 - 180),
  };
}

export function createWorldMap(
  container,
  { onSelect, onLoadError, loadSlippyMap },
) {
  const surface = container.querySelector('.geo-world-surface');
  const overlay = container.querySelector('.geo-world-overlay');
  const marker = container.querySelector('#geo-world-marker');
  const label = container.querySelector('#geo-world-label');
  const zoomControls = container.querySelector('#geo-world-zoom-controls');
  const zoomIn = container.querySelector('#geo-world-zoom-in');
  const detail = container.querySelector('#geo-local-map');
  let detailMap = null;
  let detailRequest = null;
  let markerCoordinates = null;
  let markerText = '';

  const setOverviewMarker = () => {
    marker.hidden = !markerCoordinates;
    label.hidden = !markerCoordinates || !markerText;
    label.textContent = markerText;
    if (!markerCoordinates) return;
    const point = coordinatesToWorldPoint(markerCoordinates);
    marker.setAttribute('transform', `translate(${point.x} ${point.y})`);
  };

  const showOverview = () => {
    surface.hidden = false;
    overlay.hidden = false;
    zoomControls.hidden = false;
    detail.hidden = true;
    setOverviewMarker();
  };

  const ensureDetailMap = () => {
    if (detailMap) return Promise.resolve(detailMap);
    if (!detailRequest) {
      detailRequest = loadSlippyMap().then(({ createSlippyMap }) => {
        detailMap = createSlippyMap(detail, {
          center: markerCoordinates || { latitude: 0, longitude: 0 },
          zoom: 1,
          minimumZoom: 1,
          maximumZoom: 19,
          tileUrl: '/maps/tiles/{z}/{x}/{y}.svg',
          attributionText: 'Natural Earth',
          attributionUrl: 'https://www.naturalearthdata.com/',
          onMinimumZoomOut: showOverview,
          onSelect,
        });
        return detailMap;
      });
    }
    return detailRequest;
  };

  const showDetail = () => {
    surface.hidden = true;
    overlay.hidden = true;
    zoomControls.hidden = true;
    label.hidden = true;
    detail.hidden = false;
    ensureDetailMap()
      .then((map) => {
        if (markerCoordinates) map.setView(markerCoordinates);
        map.setMarker(markerCoordinates, markerText);
      })
      .catch((error) => {
        detailRequest = null;
        showOverview();
        onLoadError(error);
      });
  };

  container.addEventListener('click', (event) => {
    if (event.target?.closest?.('button, .geo-local-map')) return;
    const bounds = container.getBoundingClientRect();
    onSelect?.(
      worldPointToCoordinates({
        x: ((event.clientX - bounds.left) / bounds.width) * WIDTH,
        y: ((event.clientY - bounds.top) / bounds.height) * HEIGHT,
      }),
    );
  });
  zoomIn.addEventListener('click', showDetail);

  return {
    setMarker(coordinates, text = '') {
      markerCoordinates = coordinates ? { ...coordinates } : null;
      markerText = text;
      if (!detail.hidden && detailMap) {
        detailMap.setMarker(markerCoordinates, markerText);
      }
      setOverviewMarker();
    },
  };
}
