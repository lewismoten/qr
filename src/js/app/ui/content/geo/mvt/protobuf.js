export class ProtobufReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.offset = 0;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get done() {
    return this.offset >= this.bytes.length;
  }

  varint() {
    let value = 0;
    let multiplier = 1;
    while (!this.done) {
      const byte = this.bytes[this.offset++];
      value += (byte & 0x7f) * multiplier;
      if (!(byte & 0x80)) return value;
      multiplier *= 128;
      if (multiplier > Number.MAX_SAFE_INTEGER) break;
    }
    throw new Error('Invalid MVT protobuf varint.');
  }

  tag() {
    const value = this.varint();
    return { field: Math.floor(value / 8), wire: value & 7 };
  }

  bytesValue() {
    const length = this.varint();
    const end = this.offset + length;
    if (end > this.bytes.length) throw new Error('Truncated MVT protobuf.');
    const value = this.bytes.subarray(this.offset, end);
    this.offset = end;
    return value;
  }

  string() {
    return new TextDecoder().decode(this.bytesValue());
  }

  fixed32() {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  fixed64() {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  skip(wire) {
    if (wire === 0) this.varint();
    else if (wire === 1) this.offset += 8;
    else if (wire === 2) this.offset += this.varint();
    else if (wire === 5) this.offset += 4;
    else throw new Error(`Unsupported MVT protobuf wire type: ${wire}.`);
    if (this.offset > this.bytes.length) {
      throw new Error('Truncated MVT protobuf field.');
    }
  }
}

export function packedVarints(bytes) {
  const reader = new ProtobufReader(bytes);
  const values = [];
  while (!reader.done) values.push(reader.varint());
  return values;
}
