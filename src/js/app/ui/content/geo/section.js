import { serializeGeo } from '../../../content-formats.js';
import { loadFeatureStylesheet } from '../../../../stylesheets.js';
import { createLoadingIndicator } from '../../loading-indicator.js';
import { parseCoordinate } from './coordinates.js';

const DEFAULT_CENTER = { latitude: 38.9182, longitude: -78.1944 };

function formatCoordinate(value) {
  return value.toFixed(5);
}

export function createGeoSection({
  latitudeInput,
  longitudeInput,
  labelInput,
  mapElement,
  isActive,
  onChange,
}) {
  let map = null;
  let mapRequest = null;
  const loading = createLoadingIndicator({ region: mapElement });

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
      latitude: latitudeInput.value.trim() || '[latitude]',
      longitude: longitudeInput.value.trim() || '[longitude]',
      label: labelInput.value,
    });

  const ensureMap = () => {
    if (map) return Promise.resolve(map);
    if (!mapRequest) {
      mapRequest = loading
        .track(
          Promise.all([
            loadFeatureStylesheet('geo-map'),
            import('./slippy-map.js'),
          ]),
        )
        .then(([, { createSlippyMap }]) => {
          map = createSlippyMap(mapElement, {
            center: DEFAULT_CENTER,
            zoom: 13,
            onSelect({ latitude, longitude }) {
              latitudeInput.value = formatCoordinate(latitude);
              longitudeInput.value = formatCoordinate(longitude);
              onChange();
            },
          });
          return map;
        });
    }
    return mapRequest;
  };

  const update = () => {
    if (!isActive()) return;
    if (!map) {
      ensureMap()
        .then(update)
        .catch((error) => {
          mapElement.classList.add('has-load-error');
          mapElement.textContent = lookup(
            'map.loadError',
            'Unable to initialize the map preview.',
          );
          console.error(error);
        });
      return;
    }
    const coordinates = getCoordinates();
    const label = labelInput.value.trim();
    if (!coordinates) {
      map.setMarker(null);
      map.setView(DEFAULT_CENTER, 13);
      return;
    }

    map.setMarker(coordinates, label);
    map.setView(coordinates, Math.max(15, map.getZoom()));
  };

  return { buildPayload, buildPreview, getCoordinates, update };
}
import { lookup } from '../../../../i18n/index.js';
