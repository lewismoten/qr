import { serializeGeo } from '../../../content-formats.js';

const DEFAULT_CENTER = [38.9182, -78.1944];

export function parseCoordinate(value) {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCoordinate(value) {
  return value.toFixed(5);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function createGeoSection({ latitudeInput, longitudeInput, labelInput, mapElement, isActive, onChange }) {
  let map = null;
  let marker = null;
  let labelMarker = null;

  const getCoordinates = () => {
    const latitude = parseCoordinate(latitudeInput.value);
    const longitude = parseCoordinate(longitudeInput.value);
    return latitude === null || longitude === null ? null : { latitude, longitude };
  };

  const buildPayload = () => serializeGeo({
    latitude: latitudeInput.value, longitude: longitudeInput.value, label: labelInput.value,
  });

  const ensureMap = () => {
    const leaflet = globalThis.L;
    if (map || !leaflet) return;

    map = leaflet.map(mapElement, { zoomControl: true, attributionControl: true }).setView(DEFAULT_CENTER, 13);
    leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
    marker = leaflet.marker([20, 0]).addTo(map);
    labelMarker = leaflet.marker([20, 0], {
      interactive: false,
      keyboard: false,
      opacity: 0,
      icon: leaflet.divIcon({ className: 'geo-label-marker', html: '', iconSize: null }),
    }).addTo(map);

    map.on('click', ({ latlng }) => {
      latitudeInput.value = formatCoordinate(latlng.lat);
      longitudeInput.value = formatCoordinate(latlng.lng);
      onChange();
    });
  };

  const update = () => {
    if (!isActive() || !globalThis.L) return;
    ensureMap();
    const coordinates = getCoordinates();
    const label = labelInput.value.trim();
    if (!coordinates) {
      marker?.setOpacity(0);
      labelMarker?.setOpacity(0);
      map.setView(DEFAULT_CENTER, 13);
      return;
    }

    const { latitude, longitude } = coordinates;
    marker.setLatLng([latitude, longitude]).setOpacity(1);
    marker.bindPopup(label || `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`);
    labelMarker.setLatLng([latitude, longitude]);
    labelMarker.setOpacity(label ? 1 : 0);
    labelMarker.setIcon(globalThis.L.divIcon({
      className: 'geo-label-marker',
      html: label ? `<span>${escapeHtml(label)}</span>` : '',
      iconSize: null,
    }));
    map.setView([latitude, longitude], Math.max(15, map.getZoom()), { animate: false });
    map.invalidateSize();
  };

  return { buildPayload, getCoordinates, update };
}
