const COMMAND_ID_MASK = 7;
const COMMAND_COUNT_DIVISOR = 8;
const MOVE_TO_COMMAND = 1;
const LINE_TO_COMMAND = 2;
const CLOSE_PATH_COMMAND = 7;
const ZIGZAG_SIGN_BIT = 1;
const ZIGZAG_DIVISOR = 2;

const zigzag = (value) =>
  value & ZIGZAG_SIGN_BIT
    ? -(value + ZIGZAG_SIGN_BIT) / ZIGZAG_DIVISOR
    : value / ZIGZAG_DIVISOR;

export function decodeGeometry(values) {
  const paths = [];
  let point = { x: 0, y: 0 };
  let path = null;
  let offset = 0;
  while (offset < values.length) {
    const command = values[offset++];
    const id = command & COMMAND_ID_MASK;
    const count = Math.floor(command / COMMAND_COUNT_DIVISOR);
    if (id === CLOSE_PATH_COMMAND) {
      if (path) path.closed = true;
      continue;
    }
    if (![MOVE_TO_COMMAND, LINE_TO_COMMAND].includes(id)) {
      throw new Error(`Unknown MVT command: ${id}.`);
    }
    for (let index = 0; index < count; index += 1) {
      if (offset + 1 >= values.length) {
        throw new Error('Truncated MVT geometry command.');
      }
      point = {
        x: point.x + zigzag(values[offset++]),
        y: point.y + zigzag(values[offset++]),
      };
      if (id === MOVE_TO_COMMAND || !path) {
        path = { points: [], closed: false };
        paths.push(path);
      }
      path.points.push(point);
    }
  }
  return paths;
}
