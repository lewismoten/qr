import { decodeMvt } from './decode.js';

const STYLES = {
  boundary: { stroke: '#7d916f', width: 0.75 },
  land: { fill: '#d9e9c3', stroke: '#5d8069', width: 0.5 },
  park: { fill: '#acd493', stroke: '#4f8657', width: 0.55 },
  road: { stroke: '#c56f43', width: 0.75 },
  water: { fill: '#bfe3ed', stroke: '#75adbd', width: 0.45 },
  waterway: { stroke: '#75adbd', width: 0.45 },
};
const ORDER = ['land', 'park', 'water', 'waterway', 'road', 'boundary'];

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

function traceFeature(context, feature, scale) {
  context.beginPath();
  for (const path of feature.geometry) {
    path.points.forEach((point, index) => {
      const x = point.x * scale;
      const y = point.y * scale;
      if (index) context.lineTo(x, y);
      else context.moveTo(x, y);
    });
    if (path.closed) context.closePath();
  }
}

function drawLayer(context, layer) {
  if (!layer) return;
  const style = STYLES[layer.name];
  if (!style) return;
  const scale = context.canvas.width / layer.extent;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  for (const feature of layer.features) {
    const featureStyle = { ...style };
    if (layer.name === 'road' && feature.properties.class === 'secondary') {
      featureStyle.stroke = '#d39772';
      featureStyle.width = 0.45;
    }
    if (layer.name === 'boundary' && feature.properties.class === 'county') {
      featureStyle.stroke = '#aab59a';
      featureStyle.width = 0.45;
    }
    traceFeature(context, feature, scale);
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

function drawPlaces(context, layer) {
  if (!layer) return;
  const scale = context.canvas.width / layer.extent;
  const language = document.documentElement.lang.split('-')[0];
  context.font = '600 9px sans-serif';
  context.textBaseline = 'middle';
  const occupied = [];
  for (const feature of layer.features) {
    const point = feature.geometry[0]?.points[0];
    if (!point) continue;
    const x = point.x * scale;
    const y = point.y * scale;
    if (
      x < 0 ||
      x >= context.canvas.width ||
      y < 0 ||
      y >= context.canvas.height
    )
      continue;
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fillStyle = '#e11d48';
    context.fill();
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
    context.textAlign = placement.textAlign;
    context.lineWidth = 2.5;
    context.strokeStyle = 'rgba(255,255,255,.92)';
    context.strokeText(name, placement.textX, y);
    context.fillStyle = '#243547';
    context.fillText(name, placement.textX, y);
  }
}

export function renderMvt(bytes, canvas) {
  const context = canvas.getContext('2d');
  const layers = decodeMvt(bytes);
  const byName = new Map(layers.map((layer) => [layer.name, layer]));
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const name of ORDER) drawLayer(context, byName.get(name));
  drawPlaces(context, byName.get('place'));
  return layers;
}
