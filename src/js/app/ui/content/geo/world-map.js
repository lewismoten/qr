import {
  hasVisibleCensusData,
  hasVisibleUsgsData,
} from './data/attribution.js';
import { createWheelZoomHandler } from './interaction/wheel-zoom.js';
import {
  clamp,
  FULL_TURN_DEGREES,
  HALF_TURN_DEGREES,
  normalizeLongitude,
} from './projection.js';

const WIDTH = 1000;
const HEIGHT = 500;
const MAXIMUM_LATITUDE = HALF_TURN_DEGREES / 2;
const PERCENT_SCALE = 100;

export function coordinatesToWorldPoint({ latitude, longitude }) {
  return {
    x:
      ((normalizeLongitude(longitude) + HALF_TURN_DEGREES) /
        FULL_TURN_DEGREES) *
      WIDTH,
    y:
      ((MAXIMUM_LATITUDE -
        clamp(latitude, -MAXIMUM_LATITUDE, MAXIMUM_LATITUDE)) /
        HALF_TURN_DEGREES) *
      HEIGHT,
  };
}

export function worldPointToCoordinates({ x, y }) {
  return {
    latitude:
      MAXIMUM_LATITUDE - (clamp(y, 0, HEIGHT) / HEIGHT) * HALF_TURN_DEGREES,
    longitude: normalizeLongitude(
      (clamp(x, 0, WIDTH) / WIDTH) * FULL_TURN_DEGREES - HALF_TURN_DEGREES,
    ),
  };
}

export function createWorldMap(
  container,
  {
    onSelect,
    onLoadError,
    loadPmtiles = () => Promise.resolve(null),
    loadSlippyMap,
    loadTileRange,
  },
) {
  const surface = container.querySelector('.geo-world-surface');
  const overlay = container.querySelector('.geo-world-overlay');
  const marker = container.querySelector('#geo-world-marker');
  const label = container.querySelector('#geo-world-label');
  const zoomControls = container.querySelector('#geo-world-zoom-controls');
  const zoomIn = container.querySelector('#geo-world-zoom-in');
  const attribution = container.querySelector('#geo-world-attribution');
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
    label.style.left = `${(point.x / WIDTH) * PERCENT_SCALE}%`;
    label.style.top = `${(point.y / HEIGHT) * PERCENT_SCALE}%`;
  };

  const showOverview = () => {
    surface.hidden = false;
    overlay.hidden = false;
    zoomControls.hidden = false;
    attribution.hidden = false;
    detail.hidden = true;
    setOverviewMarker();
  };

  const ensureDetailMap = () => {
    if (detailMap) return Promise.resolve(detailMap);
    if (!detailRequest) {
      detailRequest = Promise.all([loadSlippyMap(), loadPmtiles()]).then(
        async ([{ createSlippyMap }, pmtiles]) => {
          let vector = null;
          if (pmtiles) {
            try {
              let source;
              try {
                source =
                  await pmtiles.createPmtilesArchiveSet('/maps/local.json');
              } catch {
                source = pmtiles.createPmtilesSource('/maps/local.pmtiles');
              }
              const header = await source.getHeader();
              vector = { source, header };
            } catch {
              // Deployments can retain the SVG tiles during the transition.
            }
          }
          const tileRange = vector ? null : await loadTileRange();
          detailMap = createSlippyMap(detail, {
            center: markerCoordinates || { latitude: 0, longitude: 0 },
            zoom: 1,
            minimumZoom: 1,
            maximumZoom: 19,
            minSourceZoom: vector?.header.minimumZoom ?? tileRange.minimum,
            maxSourceZoom: vector?.header.maximumZoom ?? tileRange.maximum,
            hasSourceTile: vector ? undefined : tileRange.hasTile,
            getTileBundle: vector ? undefined : tileRange.getTileBundle,
            tileFactory: vector
              ? (options) =>
                  pmtiles.createPmtilesTile({
                    ...options,
                    source: vector.source,
                    coverageMaxZoom: vector.header.maximumZoom,
                  })
              : undefined,
            tileUrl: '/maps/tiles/{z}/{x}/{y}.svg',
            attributionText: 'Natural Earth',
            attributionUrl: 'https://www.naturalearthdata.com/',
            extraCredits: [
              {
                text: 'GeoNames',
                url: 'https://www.geonames.org/',
              },
              {
                text: 'U.S. Geological Survey',
                url: 'https://www.usgs.gov/national-hydrography/',
                visible: hasVisibleUsgsData,
              },
            ],
            secondaryCredit: {
              text: 'U.S. Census Bureau',
              url: 'https://www.census.gov/geographies/mapping-files.html',
            },
            showSecondaryAttribution: hasVisibleCensusData,
            onMinimumZoomOut: showOverview,
            onSelect,
          });
          return detailMap;
        },
      );
    }
    return detailRequest;
  };

  const showDetail = (viewState = null) => {
    surface.hidden = true;
    overlay.hidden = true;
    zoomControls.hidden = true;
    attribution.hidden = true;
    label.hidden = true;
    detail.hidden = false;
    return ensureDetailMap()
      .then((map) => {
        const center = viewState?.center || markerCoordinates;
        if (center) map.setView(center, viewState?.zoom);
        map.setMarker(markerCoordinates, markerText);
        return map;
      })
      .catch((error) => {
        detailRequest = null;
        showOverview();
        onLoadError(error);
      });
  };

  container.addEventListener('click', (event) => {
    if (
      event.target?.closest?.('button, .geo-local-map, .slippy-map-attribution')
    )
      return;
    const bounds = container.getBoundingClientRect();
    onSelect?.(
      worldPointToCoordinates({
        x: ((event.clientX - bounds.left) / bounds.width) * WIDTH,
        y: ((event.clientY - bounds.top) / bounds.height) * HEIGHT,
      }),
    );
  });
  container.addEventListener(
    'wheel',
    createWheelZoomHandler(
      (step) => {
        if (step > 0 && detail.hidden) {
          showDetail({
            center: markerCoordinates || { latitude: 0, longitude: 0 },
            zoom: 2,
          });
        }
      },
      { threshold: 40 },
    ),
    { passive: false },
  );
  zoomIn.addEventListener('click', () => showDetail());
  showOverview();

  return {
    getView: () => (!detail.hidden && detailMap ? detailMap.getView() : null),
    showDetail,
    setMarker(coordinates, text = '') {
      markerCoordinates = coordinates ? { ...coordinates } : null;
      markerText = text;
      if (!detail.hidden) {
        marker.hidden = true;
        label.hidden = true;
        detailMap?.setMarker(markerCoordinates, markerText);
        return;
      }
      setOverviewMarker();
    },
  };
}
