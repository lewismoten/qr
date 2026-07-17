import { serializeGeo } from '../../../content-formats.js';

const DEFAULT_CENTER = { latitude: 38.9182, longitude: -78.1944 };

export function parseCoordinate(value) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCoordinate(value) {
  return value.toFixed(5);
}

export function createGeoSection({ latitudeInput, longitudeInput, labelInput, mapElement, isActive, onChange }) {
  let map = null;
  let mapRequest = null;

  const getCoordinates = () => {
    const latitude = parseCoordinate(latitudeInput.value);
    const longitude = parseCoordinate(longitudeInput.value);
    return latitude === null || longitude === null ? null : { latitude, longitude };
  };

  const buildPayload = () => serializeGeo({
    latitude: latitudeInput.value, longitude: longitudeInput.value, label: labelInput.value,
  });

  const ensureMap = () => {
    if (map) return Promise.resolve(map);
    if (!mapRequest) {
      mapRequest = import('./slippy-map.js').then(({ createSlippyMap }) => {
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
      ensureMap().then(update).catch((error) => {
        mapElement.classList.add('has-load-error');
        mapElement.textContent = lookup('map.loadError', 'Unable to initialize the map preview.');
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

  return { buildPayload, getCoordinates, update };
}
import { lookup } from '../../../../i18n/index.js';
