import { writeFile } from 'node:fs/promises';

const COLORS = {
  teal: [15, 118, 110, 255],
  cream: [248, 239, 225, 255],
  ink: [19, 34, 53, 255],
  gold: [245, 158, 11, 255],
};
const sizes = [16, 32, 48];

function insideRoundedRect(x, y, left, top, width, height, radius) {
  const right = left + width;
  const bottom = top + height;
  if (x < left || x >= right || y < top || y >= bottom) return false;
  const centerX = Math.min(Math.max(x, left + radius), right - radius);
  const centerY = Math.min(Math.max(y, top + radius), bottom - radius);
  return (x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2;
}

function insideRect(x, y, [left, top, width, height]) {
  return x >= left && x < left + width && y >= top && y < top + height;
}

function getColor(x, y) {
  if (!insideRoundedRect(x, y, 0, 0, 64, 64, 13)) return [0, 0, 0, 0];
  let color = COLORS.teal;
  if (insideRoundedRect(x, y, 5, 5, 54, 54, 9)) color = COLORS.cream;

  const eyes = [[10, 10], [37, 10], [10, 37]];
  eyes.forEach(([left, top]) => {
    if (insideRect(x, y, [left, top, 17, 17])) color = COLORS.ink;
    if (insideRect(x, y, [left + 4, top + 4, 9, 9])) color = COLORS.cream;
    if (insideRect(x, y, [left + 7, top + 7, 4, 4])) color = COLORS.ink;
  });

  const modules = [
    [31, 10, 4, 8], [30, 22, 7, 5], [30, 31, 5, 5], [39, 31, 6, 5],
    [49, 30, 5, 8], [30, 40, 8, 5], [42, 40, 5, 5], [50, 42, 4, 12],
    [30, 49, 5, 5], [39, 48, 7, 6],
  ];
  if (modules.some((rect) => insideRect(x, y, rect))) color = COLORS.ink;
  if (insideRect(x, y, [30, 30, 4, 4])) color = COLORS.gold;
  return color;
}

function createDib(size) {
  const pixelBytes = size * size * 4;
  const maskRowBytes = Math.ceil(size / 32) * 4;
  const bitmap = Buffer.alloc(40 + pixelBytes + maskRowBytes * size);
  bitmap.writeUInt32LE(40, 0);
  bitmap.writeInt32LE(size, 4);
  bitmap.writeInt32LE(size * 2, 8);
  bitmap.writeUInt16LE(1, 12);
  bitmap.writeUInt16LE(32, 14);
  bitmap.writeUInt32LE(pixelBytes, 20);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = (column + 0.5) * 64 / size;
      const y = (row + 0.5) * 64 / size;
      const [red, green, blue, alpha] = getColor(x, y);
      const outputRow = size - row - 1;
      const offset = 40 + (outputRow * size + column) * 4;
      bitmap.set([blue, green, red, alpha], offset);
      if (alpha === 0) {
        const maskOffset = 40 + pixelBytes + outputRow * maskRowBytes + Math.floor(column / 8);
        bitmap[maskOffset] |= 0x80 >> (column % 8);
      }
    }
  }
  return bitmap;
}

const images = sizes.map((size) => ({ size, data: createDib(size) }));
const headerSize = 6 + images.length * 16;
const header = Buffer.alloc(headerSize);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let imageOffset = headerSize;
images.forEach(({ size, data }, index) => {
  const offset = 6 + index * 16;
  header[offset] = size;
  header[offset + 1] = size;
  header.writeUInt16LE(1, offset + 4);
  header.writeUInt16LE(32, offset + 6);
  header.writeUInt32LE(data.length, offset + 8);
  header.writeUInt32LE(imageOffset, offset + 12);
  imageOffset += data.length;
});

await writeFile('favicon.ico', Buffer.concat([header, ...images.map(({ data }) => data)]));
console.log(`Generated favicon.ico with ${sizes.join(', ')} px images.`);
