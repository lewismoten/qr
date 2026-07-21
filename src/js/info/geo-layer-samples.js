import { getFallbackTile } from '../app/ui/content/geo/tile-fallback.js';
import { createPmtilesArchiveSet } from '../app/ui/content/geo/pmtiles/archive-set.js';
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

export function renderGeoLayerSample(
  sample,
  zoom,
  source,
  header,
  { createTile = createPmtilesTile, getLayout = getCenteredTileLayout } = {},
) {
  const { centerTile, tiles } = getLayout(zoom);
  const caption = sample.querySelector('figcaption');
  const mosaic = document.createElement('span');
  const requests = [];
  mosaic.className = 'geo-layer-sample-mosaic';

  for (const item of tiles) {
    const tile = createTile({
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
    requests.push(tile.slippyReady);
  }

  mosaic.append(createMarker());
  sample.prepend(mosaic);
  return Promise.all(requests);
}

export function loadGeoArchive({
  archiveFactory = createPmtilesArchiveSet,
  sourceFactory = createPmtilesSource,
} = {}) {
  if (!archiveRequest) {
    archiveRequest = archiveFactory('/maps/local.json')
      .catch(() => sourceFactory('/maps/local.pmtiles'))
      .then(async (source) => ({ header: await source.getHeader(), source }));
  }
  return archiveRequest;
}

export function revealFallbackSamples(root = document) {
  root.querySelectorAll?.('img[data-fallback-src]').forEach((image) => {
    image.src = image.dataset.fallbackSrc;
    image.removeAttribute('data-fallback-src');
  });
}

export async function initializeGeoLayerSamples(
  root = document,
  {
    getArchive = loadGeoArchive,
    render = renderGeoLayerSample,
    Observer = globalThis.IntersectionObserver,
    search = globalThis.location?.search ?? '',
  } = {},
) {
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
    archive = await getArchive();
  } catch (error) {
    samples.forEach((sample) => initializedSamples.delete(sample));
    revealFallbackSamples(root);
    throw error;
  }
  const { header, source } = archive;
  const load = (sample) => {
    const zoom = Number(sample.closest('tr')?.cells[0]?.textContent);
    if (Number.isInteger(zoom)) return render(sample, zoom, source, header);
    return Promise.resolve();
  };

  if (new URLSearchParams(search).has('handbook-source')) {
    await Promise.all(samples.map(load));
    return;
  }

  if (!Observer) {
    samples.forEach(load);
    return;
  }

  const observer = new Observer(
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

export function startGeoLayerSamples(
  root = globalThis.document,
  search = globalThis.location?.search ?? '',
  initialize = initializeGeoLayerSamples,
) {
  if (!root) return null;
  const request = initialize(root, { search }).catch(() => {
    // Deferred SVG samples remain available without the PMTiles archive.
  });
  if (new URLSearchParams(search).has('handbook-source')) {
    globalThis.handbookPageReady = request;
  }
  return request;
}

if (typeof document !== 'undefined') {
  startGeoLayerSamples();
}
