const MAX_LATITUDE = 85.05112878;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

function longitudeTile(longitude, zoom) {
  const count = 2 ** zoom;
  return clamp(Math.floor(((longitude + 180) / 360) * count), 0, count - 1);
}

function latitudeTile(latitude, zoom) {
  const count = 2 ** zoom;
  const radians =
    (clamp(latitude, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180;
  const value = (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2;
  return clamp(Math.floor(value * count), 0, count - 1);
}

export function parseZoomRange(value = '1-7') {
  const match = /^(\d+)(?:-(\d+))?$/.exec(value);
  if (!match) throw new Error(`Invalid zoom range: ${value}`);
  const minimum = Number(match[1]);
  const maximum = Number(match[2] ?? match[1]);
  if (minimum > maximum || minimum < 0 || maximum > 19) {
    throw new Error(`Zoom must be between 0 and 19: ${value}`);
  }
  return { minimum, maximum };
}

export function parseBounds(value = 'world') {
  if (value === 'world') {
    return { west: -180, south: -MAX_LATITUDE, east: 180, north: MAX_LATITUDE };
  }
  const values = value.split(',').map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) {
    throw new Error('Bounds must be world or west,south,east,north.');
  }
  const [west, south, east, north] = values;
  if (west < -180 || east > 180 || south < -90 || north > 90) {
    throw new Error('Bounds contain coordinates outside valid ranges.');
  }
  if (west >= east || south >= north) {
    throw new Error('Bounds must increase from west/south to east/north.');
  }
  return { west, south, east, north };
}

export function createTilePlan({ zoom, bounds }) {
  const tiles = [];
  const levels = [];
  for (let current = zoom.minimum; current <= zoom.maximum; current += 1) {
    const firstX = longitudeTile(bounds.west, current);
    const lastX = longitudeTile(bounds.east, current);
    const firstY = latitudeTile(bounds.north, current);
    const lastY = latitudeTile(bounds.south, current);
    const start = tiles.length;
    for (let y = firstY; y <= lastY; y += 1) {
      for (let x = firstX; x <= lastX; x += 1) {
        tiles.push({ zoom: current, x, y });
      }
    }
    levels.push({ zoom: current, tiles: tiles.length - start });
  }
  return { tiles, levels };
}

export function formatBytes(value) {
  const units = ['B', 'KiB', 'MiB', 'GiB'];
  let amount = value;
  let unit = units.shift();
  while (amount >= 1024 && units.length) {
    amount /= 1024;
    unit = units.shift();
  }
  return `${amount.toFixed(amount < 10 && unit !== 'B' ? 1 : 0)} ${unit}`;
}
