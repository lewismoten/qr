import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodeMvt } from '../../../../src/js/app/ui/content/geo/mvt/decode.js';
import { decodeGeometry } from '../../../../src/js/app/ui/content/geo/mvt/geometry.js';
import {
  isMvtFeatureVisible,
  renderMvt,
} from '../../../../src/js/app/ui/content/geo/mvt/mvt-renderer.js';
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

function feature(properties, type, geometry) {
  const entries = Object.entries(properties);
  const tags = entries.flatMap((_, index) => [index, index]);
  return {
    bytes: [
      ...bytesField(2, tags),
      ...field(3, 0, [type]),
      ...bytesField(4, geometry),
    ],
    entries,
  };
}

function layer(name, features) {
  const entries = features.flatMap((item) => item.entries);
  const keys = entries.map(([key]) => stringField(3, key));
  const values = entries.map(([, value]) =>
    bytesField(4, stringField(1, value)),
  );
  let entryOffset = 0;
  const encodedFeatures = features.map((item) => {
    const tags = item.entries.flatMap((_, index) => [
      entryOffset + index,
      entryOffset + index,
    ]);
    entryOffset += item.entries.length;
    return bytesField(2, [
      ...bytesField(2, tags),
      ...item.bytes.slice(item.bytes.indexOf(24)),
    ]);
  });
  return bytesField(3, [
    ...stringField(1, name),
    ...encodedFeatures.flat(),
    ...keys.flat(),
    ...values.flat(),
  ]);
}

function renderedTile() {
  const polygon = [9, 20, 20, 18, 20, 0, 0, 20, 15];
  const line = [9, 20, 20, 10, 20, 0];
  const point = [9, ...varint(400), ...varint(400)];
  return new Uint8Array([
    ...layer('land', [feature({}, 3, polygon)]),
    ...layer('road', [
      feature({ class: 'secondary' }, 2, line),
      feature({ class: 'local' }, 2, line),
    ]),
    ...layer('boundary', [feature({ class: 'county' }, 2, line)]),
    ...layer('waterway', [
      feature({ class: 'major' }, 2, line),
      feature({ class: 'local' }, 2, line),
      feature({ class: 'reference' }, 2, line),
    ]),
    ...layer('place', [
      feature({ name: 'Town', name_es: 'Pueblo' }, 1, point),
      feature({ name: 'Overlap' }, 1, point),
      feature({}, 1, point),
      feature({ name: 'Missing point' }, 1, []),
    ]),
  ]);
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
  assert.deepEqual(decodeGeometry([]), []);
  assert.throws(() => decodeGeometry([3]), /Unknown/);
  assert.throws(() => decodeGeometry([9, 2]), /Truncated/);
  assert.deepEqual(decodeGeometry([15]), []);
  assert.deepEqual(decodeGeometry([10, 2, 2]), [
    { points: [{ x: 1, y: 1 }], closed: false },
  ]);
});

test('renders styled geometry and localized non-overlapping labels', () => {
  const originalDocument = globalThis.document;
  const calls = [];
  const context = {
    canvas: { width: 256, height: 256 },
    beginPath: () => calls.push('beginPath'),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    closePath: () => calls.push('closePath'),
    clearRect: () => calls.push('clearRect'),
    fill: (...args) => calls.push(['fill', ...args]),
    stroke: () => calls.push('stroke'),
    arc: (...args) => calls.push(['arc', ...args]),
    measureText: (text) => ({ width: text.length * 4 }),
    strokeText: (...args) => calls.push(['strokeText', ...args]),
    fillText: (...args) => calls.push(['fillText', ...args]),
  };
  const canvas = { width: 256, height: 256, getContext: () => context };
  globalThis.document = { documentElement: { lang: 'es-MX' } };
  try {
    const layers = renderMvt(renderedTile(), canvas, {
      zoom: 10,
      viewport: { zoom: 10, x: 300, y: 400 },
    });
    assert.equal(layers.length, 5);
    assert.equal(calls.includes('closePath'), true);
    assert.equal(
      calls.some((call) => call[0] === 'fill'),
      true,
    );
    assert.equal(calls.includes('stroke'), true);
    assert.equal(
      calls.some((call) => call[0] === 'fillText' && call[1] === 'Pueblo'),
      true,
    );
    assert.equal(calls.filter((call) => call[0] === 'fillText').length, 1);
    assert.equal(
      isMvtFeatureVisible(
        'waterway',
        { class: 'reference' },
        { zoom: 10, x: 289, y: 391 },
      ),
      false,
    );
  } finally {
    globalThis.document = originalDocument;
  }
});
