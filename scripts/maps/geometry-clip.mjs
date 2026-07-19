const DEFAULT_BOUNDS = {
  minimumX: -1,
  minimumY: -1,
  maximumX: 257,
  maximumY: 257,
};

function intersectVertical(start, end, x) {
  const amount = (x - start[0]) / (end[0] - start[0]);
  return [x, start[1] + (end[1] - start[1]) * amount];
}

function intersectHorizontal(start, end, y) {
  const amount = (y - start[1]) / (end[1] - start[1]);
  return [start[0] + (end[0] - start[0]) * amount, y];
}

function clipPolygonEdge(points, inside, intersect) {
  if (!points.length) return [];
  const output = [];
  let start = points.at(-1);
  for (const end of points) {
    const startInside = inside(start);
    const endInside = inside(end);
    if (endInside) {
      if (!startInside) output.push(intersect(start, end));
      output.push(end);
    } else if (startInside) {
      output.push(intersect(start, end));
    }
    start = end;
  }
  return output;
}

export function clipPolygon(points, bounds = DEFAULT_BOUNDS) {
  const source =
    points.length > 1 &&
    points[0][0] === points.at(-1)[0] &&
    points[0][1] === points.at(-1)[1]
      ? points.slice(0, -1)
      : points;
  const edges = [
    [
      ([x]) => x >= bounds.minimumX,
      (start, end) => intersectVertical(start, end, bounds.minimumX),
    ],
    [
      ([x]) => x <= bounds.maximumX,
      (start, end) => intersectVertical(start, end, bounds.maximumX),
    ],
    [
      ([, y]) => y >= bounds.minimumY,
      (start, end) => intersectHorizontal(start, end, bounds.minimumY),
    ],
    [
      ([, y]) => y <= bounds.maximumY,
      (start, end) => intersectHorizontal(start, end, bounds.maximumY),
    ],
  ];
  return edges.reduce(
    (clipped, [inside, intersect]) =>
      clipPolygonEdge(clipped, inside, intersect),
    source,
  );
}

function clipSegment(start, end, bounds) {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const values = [
    [-deltaX, start[0] - bounds.minimumX],
    [deltaX, bounds.maximumX - start[0]],
    [-deltaY, start[1] - bounds.minimumY],
    [deltaY, bounds.maximumY - start[1]],
  ];
  let first = 0;
  let last = 1;
  for (const [direction, distance] of values) {
    if (!direction && distance < 0) return null;
    if (!direction) continue;
    const amount = distance / direction;
    if (direction < 0) first = Math.max(first, amount);
    else last = Math.min(last, amount);
    if (first > last) return null;
  }
  return [
    [start[0] + first * deltaX, start[1] + first * deltaY],
    [start[0] + last * deltaX, start[1] + last * deltaY],
  ];
}

const samePoint = (left, right) => left[0] === right[0] && left[1] === right[1];

export function clipPolyline(points, bounds = DEFAULT_BOUNDS) {
  const lines = [];
  let line = [];
  for (let index = 1; index < points.length; index += 1) {
    const segment = clipSegment(points[index - 1], points[index], bounds);
    if (!segment) {
      if (line.length > 1) lines.push(line);
      line = [];
      continue;
    }
    if (!line.length || !samePoint(line.at(-1), segment[0])) {
      if (line.length > 1) lines.push(line);
      line = [segment[0]];
    }
    line.push(segment[1]);
  }
  if (line.length > 1) lines.push(line);
  return lines;
}
