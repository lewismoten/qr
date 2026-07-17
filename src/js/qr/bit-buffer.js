export class BitBuffer {
  constructor() {
    this.bits = [];
  }

  append(value, length) {
    if (length < 0 || length > 31 || value >>> length !== 0) {
      throw new RangeError('Value does not fit in the requested bit length.');
    }
    for (let index = length - 1; index >= 0; index -= 1) {
      this.bits.push((value >>> index) & 1);
    }
  }
}
