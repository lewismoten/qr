const VARINT_VALUE_MASK = 0x7f;
const VARINT_CONTINUATION_BIT = 0x80;
const VARINT_RADIX = 128;
const PROTOBUF_FIELD_DIVISOR = 8;
const PROTOBUF_WIRE_MASK = 7;
const FIXED_32_BYTES = 4;
const FIXED_64_BYTES = 8;
const WIRE_VARINT = 0;
const WIRE_FIXED_64 = 1;
const WIRE_LENGTH_DELIMITED = 2;
const WIRE_FIXED_32 = 5;

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
      value += (byte & VARINT_VALUE_MASK) * multiplier;
      if (!(byte & VARINT_CONTINUATION_BIT)) return value;
      multiplier *= VARINT_RADIX;
      if (multiplier > Number.MAX_SAFE_INTEGER) break;
    }
    throw new Error('Invalid MVT protobuf varint.');
  }

  tag() {
    const value = this.varint();
    return {
      field: Math.floor(value / PROTOBUF_FIELD_DIVISOR),
      wire: value & PROTOBUF_WIRE_MASK,
    };
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
    this.offset += FIXED_32_BYTES;
    return value;
  }

  fixed64() {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += FIXED_64_BYTES;
    return value;
  }

  skip(wire) {
    if (wire === WIRE_VARINT) this.varint();
    else if (wire === WIRE_FIXED_64) this.offset += FIXED_64_BYTES;
    else if (wire === WIRE_LENGTH_DELIMITED) this.offset += this.varint();
    else if (wire === WIRE_FIXED_32) this.offset += FIXED_32_BYTES;
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
