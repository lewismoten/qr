import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodeMvt } from '../../../../src/js/app/ui/content/geo/mvt/decode.js';
import { decodeGeometry } from '../../../../src/js/app/ui/content/geo/mvt/geometry.js';
import {
  packedVarints,
  ProtobufReader,
} from '../../../../src/js/app/ui/content/geo/mvt/protobuf.js';

const encoder = new TextEncoder();

function varint(value) {
  const bytes = [];
  let remaining = value;
  do {
    let byte = remaining % 128;
    remaining = Math.floor(remaining / 128);
    if (remaining) byte |= 0x80;
    bytes.push(byte);
  } while (remaining);
  return bytes;
}

const field = (number, wire, value) => [...varint(number * 8 + wire), ...value];
const bytesField = (number, value) =>
  field(number, 2, [...varint(value.length), ...value]);
const stringField = (number, value) =>
  bytesField(number, [...encoder.encode(value)]);

function floatingBytes(method, size, value) {
  const bytes = new Uint8Array(size);
  new DataView(bytes.buffer)[method](0, value, true);
  return [...bytes];
}

function valueTile() {
  const values = [
    stringField(1, 'text'),
    field(2, 5, floatingBytes('setFloat32', 4, 1.5)),
    field(3, 1, floatingBytes('setFloat64', 8, 2.5)),
    field(4, 0, varint(42)),
    field(5, 0, varint(43)),
    field(6, 0, varint(3)),
    field(6, 0, varint(4)),
    field(7, 0, varint(1)),
    field(8, 0, varint(9)),
  ];
  const keys = values.map((_, index) => stringField(3, `value${index}`));
  const tags = values.flatMap((_, index) => [index, index]);
  tags.push(99, 0, 0);
  const feature = [
    ...field(1, 0, varint(7)),
    ...bytesField(2, tags),
    ...field(3, 0, [1]),
    ...bytesField(4, [9, 2, 2]),
    ...field(9, 0, [1]),
  ];
  const layer = [
    ...stringField(1, 'values'),
    ...bytesField(2, feature),
    ...keys.flat(),
    ...values.flatMap((value) => bytesField(4, value)),
  ];
  return new Uint8Array([...field(1, 0, [1]), ...bytesField(3, layer)]);
}

test('reads every supported protobuf wire representation', () => {
  const floats = new Uint8Array([
    ...floatingBytes('setFloat32', 4, 1.25),
    ...floatingBytes('setFloat64', 8, 2.75),
  ]);
  const reader = new ProtobufReader(floats);
  assert.equal(reader.fixed32(), 1.25);
  assert.equal(reader.fixed64(), 2.75);
  assert.equal(reader.done, true);
  assert.deepEqual(packedVarints(new Uint8Array([1, 0x82, 1])), [1, 130]);

  const skipped = new ProtobufReader(
    new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 9, 8, 0, 0, 0, 0]),
  );
  skipped.skip(0);
  skipped.skip(1);
  skipped.skip(2);
  skipped.skip(5);
  assert.equal(skipped.done, true);
});

test('rejects malformed protobuf fields and unsupported wire types', () => {
  assert.throws(
    () => new ProtobufReader(new Uint8Array([0x80])).varint(),
    /varint/,
  );
  assert.throws(
    () => new ProtobufReader(new Uint8Array([2, 1])).bytesValue(),
    /Truncated/,
  );
  assert.throws(
    () => new ProtobufReader(new Uint8Array()).skip(3),
    /wire type/,
  );
  assert.throws(
    () => new ProtobufReader(new Uint8Array([5, 1])).skip(2),
    /Truncated/,
  );
});

test('decodes all MVT property value types and ignores unknown fields', () => {
  const [layer] = decodeMvt(valueTile());
  const feature = layer.features[0];
  assert.equal(feature.id, 7);
  assert.deepEqual(feature.properties, {
    value0: 'text',
    value1: 1.5,
    value2: 2.5,
    value3: 42,
    value4: 43,
    value5: -2,
    value6: 2,
    value7: true,
    value8: null,
  });
  assert.deepEqual(feature.geometry[0].points, [{ x: 1, y: 1 }]);
});

test('rejects unknown and truncated MVT geometry commands', () => {
  assert.throws(() => decodeGeometry([3]), /Unknown/);
  assert.throws(() => decodeGeometry([9, 2]), /Truncated/);
  assert.deepEqual(decodeGeometry([15]), []);
  assert.deepEqual(decodeGeometry([10, 2, 2]), [
    { points: [{ x: 1, y: 1 }], closed: false },
  ]);
});
