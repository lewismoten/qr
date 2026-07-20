import { getFallbackTile } from '../app/ui/content/geo/tile-fallback.js';
import { createPmtilesSource } from '../app/ui/content/geo/pmtiles/source.js';
import { createPmtilesTile } from '../app/ui/content/geo/pmtiles/tile.js';
import { getCenteredTileLayout } from './geo-layer-layout.js';

const initializedSamples = new WeakSet();
let archiveRequest = null;

function updateCaption(caption, requested, sourceZoom) {
  if (!caption) return;
  if (sourceZoom === requested.zoom) {
    caption.textContent = `L${requested.zoom} · ${requested.x}/${requested.y}`;
    return;
  }
  const source = getFallbackTile(requested, sourceZoom);
  caption.textContent = `L${requested.zoom} → L${source.zoom} · ${source.x}/${source.y}`;
}

function createMarker() {
  const marker = document.createElement('span');
  marker.className = 'geo-layer-sample-marker';
  marker.setAttribute('aria-hidden', 'true');
  return marker;
}

function renderSample(sample, zoom, source, header) {
  const { centerTile, tiles } = getCenteredTileLayout(zoom);
  const caption = sample.querySelector('figcaption');
  const mosaic = document.createElement('span');
  mosaic.className = 'geo-layer-sample-mosaic';

  for (const item of tiles) {
    const tile = createPmtilesTile({
      source,
      tile: item.tile,
      minimumSourceZoom: header.minimumZoom,
      maximumSourceZoom: header.maximumZoom,
      onLoad() {
        sample.classList.add('has-centered-map');
      },
      onSourceChange(sourceZoom) {
        if (item.isCenter && Number.isInteger(sourceZoom)) {
          updateCaption(caption, centerTile, sourceZoom);
        }
      },
    });
    tile.style.left = `${item.left}%`;
    tile.style.top = `${item.top}%`;
    mosaic.append(tile);
  }

  mosaic.append(createMarker());
  sample.prepend(mosaic);
}

function loadArchive() {
  if (!archiveRequest) {
    const source = createPmtilesSource('/maps/local.pmtiles');
    archiveRequest = source.getHeader().then((header) => ({ header, source }));
  }
  return archiveRequest;
}

export async function initializeGeoLayerSamples(root = document) {
  const tables = [
    ...(root.querySelectorAll?.('[data-centered-map-samples]') ?? []),
  ];
  const samples = tables
    .flatMap((table) => [...table.querySelectorAll('.geo-layer-sample')])
    .filter((sample) => !initializedSamples.has(sample));
  if (!samples.length) return;

  samples.forEach((sample) => initializedSamples.add(sample));
  let archive;
  try {
    archive = await loadArchive();
  } catch (error) {
    samples.forEach((sample) => initializedSamples.delete(sample));
    throw error;
  }
  const { header, source } = archive;
  const load = (sample) => {
    const zoom = Number(sample.closest('tr')?.cells[0]?.textContent);
    if (Number.isInteger(zoom)) renderSample(sample, zoom, source, header);
  };

  if (!('IntersectionObserver' in globalThis)) {
    samples.forEach(load);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        load(entry.target);
      }
    },
    { rootMargin: '200px' },
  );
  samples.forEach((sample) => observer.observe(sample));
}

if (typeof document !== 'undefined') {
  initializeGeoLayerSamples().catch(() => {
    // Existing guide images remain visible without the PMTiles archive.
  });
}
