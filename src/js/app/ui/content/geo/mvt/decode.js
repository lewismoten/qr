import { decodeGeometry } from './geometry.js';
import { packedVarints, ProtobufReader } from './protobuf.js';

const VALUE_FIELDS = {
  string: 1,
  float: 2,
  double: 3,
  signedInteger: 4,
  unsignedInteger: 5,
  zigzagInteger: 6,
  boolean: 7,
};
const FEATURE_FIELDS = { id: 1, tags: 2, type: 3, geometry: 4 };
const LAYER_FIELDS = {
  name: 1,
  feature: 2,
  key: 3,
  value: 4,
  extent: 5,
  version: 15,
};
const TILE_LAYER_FIELD = 3;
const ZIGZAG_SIGN_BIT = 1;
const ZIGZAG_DIVISOR = 2;

function decodeValue(bytes) {
  const reader = new ProtobufReader(bytes);
  let value = null;
  while (!reader.done) {
    const { field, wire } = reader.tag();
    if (field === VALUE_FIELDS.string) value = reader.string();
    else if (field === VALUE_FIELDS.float) value = reader.fixed32();
    else if (field === VALUE_FIELDS.double) value = reader.fixed64();
    else if (
      [VALUE_FIELDS.signedInteger, VALUE_FIELDS.unsignedInteger].includes(field)
    ) {
      value = reader.varint();
    } else if (field === VALUE_FIELDS.zigzagInteger) {
      const encoded = reader.varint();
      value =
        encoded & ZIGZAG_SIGN_BIT
          ? -(encoded + ZIGZAG_SIGN_BIT) / ZIGZAG_DIVISOR
          : encoded / ZIGZAG_DIVISOR;
    } else if (field === VALUE_FIELDS.boolean) {
      value = Boolean(reader.varint());
    } else reader.skip(wire);
  }
  return value;
}

function decodeFeature(bytes) {
  const reader = new ProtobufReader(bytes);
  const feature = { id: null, tags: [], type: 0, geometry: [] };
  while (!reader.done) {
    const { field, wire } = reader.tag();
    if (field === FEATURE_FIELDS.id) feature.id = reader.varint();
    else if (field === FEATURE_FIELDS.tags) {
      feature.tags = packedVarints(reader.bytesValue());
    } else if (field === FEATURE_FIELDS.type) feature.type = reader.varint();
    else if (field === FEATURE_FIELDS.geometry) {
      feature.geometry = packedVarints(reader.bytesValue());
    } else reader.skip(wire);
  }
  return feature;
}

function featureProperties(tags, keys, values) {
  const properties = {};
  for (let index = 0; index + 1 < tags.length; index += 2) {
    const key = keys[tags[index]];
    if (key !== undefined) properties[key] = values[tags[index + 1]];
  }
  return properties;
}

function decodeLayer(bytes) {
  const reader = new ProtobufReader(bytes);
  const layer = {
    name: '',
    extent: 4096,
    version: 1,
    keys: [],
    values: [],
    rawFeatures: [],
  };
  while (!reader.done) {
    const { field, wire } = reader.tag();
    if (field === LAYER_FIELDS.name) layer.name = reader.string();
    else if (field === LAYER_FIELDS.feature)
      layer.rawFeatures.push(decodeFeature(reader.bytesValue()));
    else if (field === LAYER_FIELDS.key) layer.keys.push(reader.string());
    else if (field === LAYER_FIELDS.value) {
      layer.values.push(decodeValue(reader.bytesValue()));
    } else if (field === LAYER_FIELDS.extent) layer.extent = reader.varint();
    else if (field === LAYER_FIELDS.version) layer.version = reader.varint();
    else reader.skip(wire);
  }
  return {
    name: layer.name,
    extent: layer.extent,
    version: layer.version,
    features: layer.rawFeatures.map((feature) => ({
      id: feature.id,
      type: feature.type,
      properties: featureProperties(feature.tags, layer.keys, layer.values),
      geometry: decodeGeometry(feature.geometry),
    })),
  };
}

export function decodeMvt(bytes) {
  const reader = new ProtobufReader(bytes);
  const layers = [];
  while (!reader.done) {
    const { field, wire } = reader.tag();
    if (field === TILE_LAYER_FIELD) {
      layers.push(decodeLayer(reader.bytesValue()));
    } else reader.skip(wire);
  }
  return layers;
}
