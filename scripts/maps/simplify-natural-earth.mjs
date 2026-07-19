import { readFile, writeFile } from 'node:fs/promises';

// Reference: Natural Earth 1:110m physical land polygons (public domain).
// https://www.naturalearthdata.com/downloads/110m-physical-vectors/

const [, , input, output, toleranceValue = '2', areaValue = '6'] = process.argv;
if (!input || !output) {
  throw new Error(
    'Usage: node simplify-natural-earth.mjs input.geojson output.txt ' +
      '[tolerance] [minimum-area]',
  );
}

const tolerance = Number(toleranceValue);
const minimumArea = Number(areaValue);
const project = ([longitude, latitude]) => ({
  x: ((longitude + 180) / 360) * 1000,
  y: ((90 - latitude) / 180) * 500,
});
const squareDistance = (point, start, end) => {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (!deltaX && !deltaY) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2;
  }
  const amount = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        (deltaX ** 2 + deltaY ** 2),
    ),
  );
  const x = start.x + amount * deltaX;
  const y = start.y + amount * deltaY;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
};

function simplify(points, first, last, threshold, retained) {
  let index = -1;
  let maximum = threshold;
  for (let current = first + 1; current < last; current += 1) {
    const distance = squareDistance(
      points[current],
      points[first],
      points[last],
    );
    if (distance <= maximum) continue;
    index = current;
    maximum = distance;
  }
  if (index < 0) return;
  if (index - first > 1) simplify(points, first, index, threshold, retained);
  retained.push(points[index]);
  if (last - index > 1) simplify(points, index, last, threshold, retained);
}

function simplifyRing(coordinates) {
  const points = coordinates.slice(0, -1).map(project);
  if (points.length < 4) return points;
  const retained = [points[0]];
  simplify(points, 0, points.length - 1, tolerance ** 2, retained);
  retained.push(points.at(-1));
  return retained;
}

function polygonArea(points) {
  return Math.abs(
    points.reduce((total, point, index) => {
      const next = points[(index + 1) % points.length];
      return total + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );
}

function pathFor(points) {
  const values = points.map(({ x, y }) => `${Math.round(x)} ${Math.round(y)}`);
  return ['M', ...values, 'Z'];
}

const collection = JSON.parse(await readFile(input, 'utf8'));
const rings = collection.features.flatMap(({ geometry }) => {
  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flat();
});
const paths = rings
  .map(simplifyRing)
  .filter((points) => points.length >= 3 && polygonArea(points) >= minimumArea)
  .map(pathFor);
const lines = [];
let line = '';
for (const value of paths.flat()) {
  if (line && line.length + value.length + 1 > 52) {
    lines.push(line);
    line = '';
  }
  line += (line ? ' ' : '') + value;
}
if (line) lines.push(line);
await writeFile(output, lines.join('\n') + '\n');
console.log(`Emitted ${paths.length} simplified land rings.`);
