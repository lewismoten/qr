import { decodeMvt } from './decode.js';
import { hasUsgsTile } from '../data/attribution.js';

const STYLES = {
  boundary: { stroke: '#7d916f', width: 0.75 },
  land: { fill: '#d9e9c3', stroke: '#5d8069', width: 0.5 },
  park: { fill: '#acd493', stroke: '#4f8657', width: 0.55 },
  railway: { stroke: '#59636f', width: 0.55 },
  road: { stroke: '#c56f43', width: 0.75 },
  water: { fill: '#bfe3ed', stroke: '#75adbd', width: 0.45 },
  waterway: { stroke: '#75adbd', width: 0.45 },
};
const ORDER = [
  'land',
  'park',
  'water',
  'waterway',
  'road',
  'railway',
  'boundary',
];
const PLACE_LIMITS = [
  [8, 6],
  [9, 8],
  [10, 14],
  [11, 24],
];

export function getPlaceLimit(zoom) {
  return PLACE_LIMITS.find(([maximum]) => zoom <= maximum)?.[1] ?? 32;
}

export function sortPlaces(features) {
  const number = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return [...features].sort((left, right) => {
    const population =
      number(right.properties.population, -1) -
      number(left.properties.population, -1);
    if (population) return population;
    return (
      number(left.properties.rank, Number.MAX_SAFE_INTEGER) -
      number(right.properties.rank, Number.MAX_SAFE_INTEGER)
    );
  });
}

export function getLabelPlacement(x, y, textWidth, size) {
  const width = textWidth + 6;
  if (x < 0 || x >= size || y < 6 || y > size - 6) return null;
  if (x + width <= size) {
    return {
      box: { left: x + 2, right: x + width, top: y - 6, bottom: y + 6 },
      textAlign: 'left',
      textX: x + 4,
    };
  }
  if (x - width >= 0) {
    return {
      box: { left: x - width, right: x - 2, top: y - 6, bottom: y + 6 },
      textAlign: 'right',
      textX: x - 4,
    };
  }
  return null;
}

export function getMvtTransform(size, extent, viewport = {}) {
  const viewportScale = viewport.scale ?? 1;
  return {
    scale: (size / extent) * viewportScale,
    offsetX: (viewport.offsetX ?? 0) * size,
    offsetY: (viewport.offsetY ?? 0) * size,
  };
}

function traceFeature(context, feature, transform) {
  context.beginPath();
  for (const path of feature.geometry) {
    path.points.forEach((point, index) => {
      const x = point.x * transform.scale - transform.offsetX;
      const y = point.y * transform.scale - transform.offsetY;
      if (index) context.lineTo(x, y);
      else context.moveTo(x, y);
    });
    if (path.closed) context.closePath();
  }
}

export function isMvtFeatureVisible(layer, properties, viewport) {
  return !(
    layer === 'waterway' &&
    properties.class === 'reference' &&
    hasUsgsTile(viewport)
  );
}

function drawLayer(context, layer, viewport) {
  if (!layer) return;
  const style = STYLES[layer.name];
  if (!style) return;
  const transform = getMvtTransform(
    context.canvas.width,
    layer.extent,
    viewport,
  );
  context.lineJoin = 'round';
  context.lineCap = 'round';
  for (const feature of layer.features) {
    if (!isMvtFeatureVisible(layer.name, feature.properties, viewport))
      continue;
    const featureStyle = { ...style };
    if (layer.name === 'road' && feature.properties.class === 'secondary') {
      featureStyle.stroke = '#d39772';
      featureStyle.width = 0.45;
    }
    if (layer.name === 'boundary' && feature.properties.class === 'county') {
      featureStyle.stroke = '#aab59a';
      featureStyle.width = 0.45;
    }
    if (layer.name === 'waterway' && feature.properties.class === 'major') {
      featureStyle.width = 0.65;
    }
    if (layer.name === 'waterway' && feature.properties.class === 'local') {
      featureStyle.width = 0.35;
    }
    traceFeature(context, feature, transform);
    context.lineWidth = featureStyle.width;
    if (featureStyle.fill && feature.type === 3) {
      context.fillStyle = featureStyle.fill;
      context.fill('evenodd');
    }
    if (featureStyle.stroke) {
      context.strokeStyle = featureStyle.stroke;
      context.stroke();
    }
  }
}

function drawPlaces(context, layer, zoom, viewport) {
  if (!layer) return;
  const transform = getMvtTransform(
    context.canvas.width,
    layer.extent,
    viewport,
  );
  const language = document.documentElement.lang.split('-')[0];
  context.font = '600 9px sans-serif';
  context.textBaseline = 'middle';
  const occupied = [];
  for (const feature of sortPlaces(layer.features)) {
    if (occupied.length >= getPlaceLimit(zoom)) break;
    const point = feature.geometry[0]?.points[0];
    if (!point) continue;
    const x = point.x * transform.scale - transform.offsetX;
    const y = point.y * transform.scale - transform.offsetY;
    if (
      x < 0 ||
      x >= context.canvas.width ||
      y < 0 ||
      y >= context.canvas.height
    )
      continue;
    const name =
      feature.properties[`name_${language}`] ?? feature.properties.name;
    if (!name) continue;
    const placement = getLabelPlacement(
      x,
      y,
      context.measureText(name).width,
      context.canvas.width,
    );
    if (!placement) continue;
    const { box } = placement;
    const overlaps = occupied.some(
      (item) =>
        box.left < item.right &&
        box.right > item.left &&
        box.top < item.bottom &&
        box.bottom > item.top,
    );
    if (overlaps) continue;
    occupied.push(box);
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fillStyle = '#e11d48';
    context.fill();
    context.textAlign = placement.textAlign;
    context.lineWidth = 2.5;
    context.strokeStyle = 'rgba(255,255,255,.92)';
    context.strokeText(name, placement.textX, y);
    context.fillStyle = '#243547';
    context.fillText(name, placement.textX, y);
  }
}

export function renderMvt(bytes, canvas, { zoom = 0, viewport } = {}) {
  const context = canvas.getContext('2d');
  const layers = decodeMvt(bytes);
  const byName = new Map(layers.map((layer) => [layer.name, layer]));
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const name of ORDER) drawLayer(context, byName.get(name), viewport);
  drawPlaces(context, byName.get('place'), zoom, viewport);
  return layers;
}
