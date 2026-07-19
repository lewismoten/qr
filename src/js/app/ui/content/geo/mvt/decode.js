import { decodeGeometry } from './geometry.js';
import { packedVarints, ProtobufReader } from './protobuf.js';

function decodeValue(bytes) {
  const reader = new ProtobufReader(bytes);
  let value = null;
  while (!reader.done) {
    const { field, wire } = reader.tag();
    if (field === 1) value = reader.string();
    else if (field === 2) value = reader.fixed32();
    else if (field === 3) value = reader.fixed64();
    else if ([4, 5].includes(field)) value = reader.varint();
    else if (field === 6) {
      const encoded = reader.varint();
      value = encoded & 1 ? -(encoded + 1) / 2 : encoded / 2;
    } else if (field === 7) value = Boolean(reader.varint());
    else reader.skip(wire);
  }
  return value;
}

function decodeFeature(bytes) {
  const reader = new ProtobufReader(bytes);
  const feature = { id: null, tags: [], type: 0, geometry: [] };
  while (!reader.done) {
    const { field, wire } = reader.tag();
    if (field === 1) feature.id = reader.varint();
    else if (field === 2) feature.tags = packedVarints(reader.bytesValue());
    else if (field === 3) feature.type = reader.varint();
    else if (field === 4) {
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
    if (field === 1) layer.name = reader.string();
    else if (field === 2)
      layer.rawFeatures.push(decodeFeature(reader.bytesValue()));
    else if (field === 3) layer.keys.push(reader.string());
    else if (field === 4) layer.values.push(decodeValue(reader.bytesValue()));
    else if (field === 5) layer.extent = reader.varint();
    else if (field === 15) layer.version = reader.varint();
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
    if (field === 3) layers.push(decodeLayer(reader.bytesValue()));
    else reader.skip(wire);
  }
  return layers;
}
