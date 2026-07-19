const zigzag = (value) => (value & 1 ? -(value + 1) / 2 : value / 2);

export function decodeGeometry(values) {
  const paths = [];
  let point = { x: 0, y: 0 };
  let path = null;
  let offset = 0;
  while (offset < values.length) {
    const command = values[offset++];
    const id = command & 7;
    const count = Math.floor(command / 8);
    if (id === 7) {
      if (path) path.closed = true;
      continue;
    }
    if (![1, 2].includes(id)) throw new Error(`Unknown MVT command: ${id}.`);
    for (let index = 0; index < count; index += 1) {
      if (offset + 1 >= values.length) {
        throw new Error('Truncated MVT geometry command.');
      }
      point = {
        x: point.x + zigzag(values[offset++]),
        y: point.y + zigzag(values[offset++]),
      };
      if (id === 1 || !path) {
        path = { points: [], closed: false };
        paths.push(path);
      }
      path.points.push(point);
    }
  }
  return paths;
}
