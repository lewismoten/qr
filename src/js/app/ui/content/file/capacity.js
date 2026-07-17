export function findMaximumEncodableBytes(canEncode, { initialProbe = 256, maximumProbe = 1024 * 1024 } = {}) {
  if (!canEncode(0)) return 0;

  let low = 0;
  let high = initialProbe;
  while (high <= maximumProbe && canEncode(high)) {
    low = high;
    high *= 2;
  }

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (canEncode(middle)) low = middle;
    else high = middle;
  }
  return low;
}
