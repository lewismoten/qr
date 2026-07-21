import { serializeGeo } from '../../../data/content-formats.js';
import { loadFeatureStylesheet } from '../../../../stylesheets.js';
import { createLoadingIndicator } from '../../loading-indicator.js';
import { lookup } from '../../../../i18n/index.js';
import { parseCoordinate } from './coordinates.js';
import {
  hasOpenStreetMapConsent,
  rememberOpenStreetMapConsent,
} from './map-consent.js';
import { createWorldMap } from './world-map.js';
import { loadLocalTileRange } from './tile-fallback.js';
import {
  LOCATION_FAILURE,
  requestBrowserLocation,
} from './location/browser-location.js';

const DEFAULT_CENTER = { latitude: 38.9182, longitude: -78.1944 };
const COORDINATE_DECIMAL_PLACES = 5;
const DEFAULT_DETAIL_ZOOM = 13;

function formatCoordinate(value) {
  return value.toFixed(COORDINATE_DECIMAL_PLACES);
}

export function createGeoSection({
  latitudeInput,
  longitudeInput,
  labelInput,
  locationButton,
  locationStatus,
  worldElement,
  mapElement,
  worldTab,
  osmTab,
  consentDialog,
  neverAskInput,
  cancelButton,
  proceedButton,
  isActive,
  onChange,
  storage,
  geolocation = globalThis.navigator?.geolocation,
}) {
  let map = null;
  let mapRequest = null;
  let view = 'world';
  const loading = createLoadingIndicator({ region: worldElement });
  const selectCoordinates = ({ latitude, longitude }) => {
    latitudeInput.value = formatCoordinate(latitude);
    longitudeInput.value = formatCoordinate(longitude);
    onChange();
  };
  const world = createWorldMap(worldElement, {
    onSelect: selectCoordinates,
    loadSlippyMap: () => loading.track(import('./slippy-map.js')),
    loadTileRange: loadLocalTileRange,
    loadPmtiles: () =>
      loading.track(
        Promise.all([
          import('./pmtiles/archive-set.js'),
          import('./pmtiles/source.js'),
          import('./pmtiles/tile.js'),
        ]).then(([archiveSet, source, tile]) => ({
          ...archiveSet,
          ...source,
          ...tile,
        })),
      ),
    onLoadError: (error) => {
      console.error(error);
    },
  });

  loading.track(loadFeatureStylesheet('geo-map')).catch(console.error);

  const getCoordinates = () => {
    const latitude = parseCoordinate(latitudeInput.value);
    const longitude = parseCoordinate(longitudeInput.value);
    return latitude === null || longitude === null
      ? null
      : { latitude, longitude };
  };

  const buildPayload = () =>
    serializeGeo({
      latitude: latitudeInput.value,
      longitude: longitudeInput.value,
      label: labelInput.value,
    });
  const buildPreview = () =>
    serializeGeo({
      latitude:
        latitudeInput.value.trim() ||
        lookup('content.preview.latitude', '[Latitude]'),
      longitude:
        longitudeInput.value.trim() ||
        lookup('content.preview.longitude', '[Longitude]'),
      label: labelInput.value,
    });

  const ensureMap = () => {
    if (map) return Promise.resolve(map);
    if (!mapRequest) {
      mapRequest = loading
        .track(import('./slippy-map.js'))
        .then(({ createSlippyMap }) => {
          map = createSlippyMap(mapElement, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_DETAIL_ZOOM,
            onSelect: selectCoordinates,
          });
          return map;
        });
    }
    return mapRequest;
  };

  const updateMap = (viewState = null) => {
    const coordinates = getCoordinates();
    const label = labelInput.value.trim();
    if (!coordinates) {
      map.setMarker(null);
      map.setView(
        viewState?.center || DEFAULT_CENTER,
        viewState?.zoom ?? DEFAULT_DETAIL_ZOOM,
      );
      return;
    }

    map.setMarker(coordinates, label);
    map.setView(
      viewState?.center || coordinates,
      viewState?.zoom ?? map.getZoom(),
    );
  };

  const selectView = (nextView) => {
    view = nextView;
    const showWorld = view === 'world';
    worldElement.hidden = false;
    mapElement.hidden = false;
    worldElement.classList.toggle('is-map-visible', showWorld);
    mapElement.classList.toggle('is-map-visible', !showWorld);
    worldElement.inert = !showWorld;
    mapElement.inert = showWorld;
    worldElement.setAttribute('aria-hidden', String(!showWorld));
    mapElement.setAttribute('aria-hidden', String(showWorld));
    worldTab.classList.toggle('is-active', showWorld);
    osmTab.classList.toggle('is-active', !showWorld);
    worldTab.setAttribute('aria-selected', String(showWorld));
    osmTab.setAttribute('aria-selected', String(!showWorld));
  };

  const activateOpenStreetMap = () => {
    const worldView = world.getView();
    ensureMap()
      .then(() => {
        updateMap(worldView);
        selectView('osm');
      })
      .catch((error) => {
        mapElement.classList.add('has-load-error');
        mapElement.textContent = lookup(
          'map.loadError',
          'Unable to initialize the map preview.',
        );
        console.error(error);
      });
  };

  const requestOpenStreetMap = () => {
    if (map || hasOpenStreetMapConsent(storage)) {
      activateOpenStreetMap();
      return;
    }
    neverAskInput.checked = false;
    consentDialog.showModal();
  };

  worldTab.addEventListener('click', () => {
    const osmView = view === 'osm' ? map?.getView() : null;
    selectView('world');
    if (osmView) world.showDetail(osmView);
  });
  osmTab.addEventListener('click', requestOpenStreetMap);
  cancelButton.addEventListener('click', () => selectView('world'));
  proceedButton.addEventListener('click', () => {
    if (neverAskInput.checked) rememberOpenStreetMapConsent(storage);
    activateOpenStreetMap();
  });
  consentDialog.addEventListener('cancel', () => selectView('world'));

  selectView('world');
  const update = () => {
    if (!isActive()) return;
    const coordinates = getCoordinates();
    world.setMarker(coordinates, labelInput.value.trim());
    if (view === 'osm' && map) updateMap();
  };

  const setLocationStatus = (message) => {
    locationStatus.textContent = message;
    locationStatus.hidden = !message;
  };
  const centerLocation = (coordinates) => {
    const label = labelInput.value.trim();
    world.setMarker(coordinates, label);
    const worldView = world.getView();
    if (view === 'osm' && map) {
      map.setMarker(coordinates, label);
      map.setView(coordinates, map.getZoom());
    } else if (worldView) {
      world.showDetail({ center: coordinates, zoom: worldView.zoom });
    }
  };
  const locationErrorText = (reason) => {
    const messages = {
      [LOCATION_FAILURE.denied]: lookup(
        'map.locationDenied',
        'Location permission was denied. You can still enter coordinates.',
      ),
      [LOCATION_FAILURE.timeout]: lookup(
        'map.locationTimeout',
        'Finding your location took too long. Please try again.',
      ),
      [LOCATION_FAILURE.unavailable]: lookup(
        'map.locationUnavailable',
        'Your location is currently unavailable.',
      ),
      [LOCATION_FAILURE.unsupported]: lookup(
        'map.locationUnsupported',
        'Location detection is not supported by this browser.',
      ),
    };
    return messages[reason] || messages[LOCATION_FAILURE.unavailable];
  };
  locationButton.addEventListener('click', async () => {
    locationButton.disabled = true;
    setLocationStatus(lookup('map.locating', 'Finding your location...'));
    try {
      const coordinates = await requestBrowserLocation(geolocation);
      selectCoordinates(coordinates);
      centerLocation(coordinates);
      setLocationStatus(lookup('map.locationFound', 'Location updated.'));
    } catch (error) {
      setLocationStatus(locationErrorText(error.reason));
    } finally {
      locationButton.disabled = false;
    }
  });
  if (!geolocation?.getCurrentPosition) {
    locationButton.disabled = true;
    setLocationStatus(locationErrorText(LOCATION_FAILURE.unsupported));
  }

  update();

  return { buildPayload, buildPreview, getCoordinates, update };
}

export function createGeoSectionFromDocument(document, options) {
  return createGeoSection({
    latitudeInput: document.getElementById('geo-latitude'),
    longitudeInput: document.getElementById('geo-longitude'),
    labelInput: document.getElementById('geo-query'),
    locationButton: document.getElementById('geo-use-location'),
    locationStatus: document.getElementById('geo-location-status'),
    worldElement: document.getElementById('geo-world-map'),
    mapElement: document.getElementById('geo-map'),
    worldTab: document.getElementById('geo-world-tab'),
    osmTab: document.getElementById('geo-osm-tab'),
    consentDialog: document.getElementById('geo-map-consent'),
    neverAskInput: document.getElementById('geo-map-never-ask'),
    cancelButton: document.getElementById('geo-map-cancel'),
    proceedButton: document.getElementById('geo-map-proceed'),
    ...options,
  });
}
