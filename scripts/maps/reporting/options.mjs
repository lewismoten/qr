import path from 'node:path';
import { availableParallelism } from 'node:os';

function option(values, name, fallback) {
  const exact = values.find((value) => value.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = values.indexOf(`--${name}`);
  return index >= 0 ? values[index + 1] : fallback;
}

export function readVectorBuildOptions(values = process.argv.slice(2)) {
  const maximumArchiveMiB = Number.parseInt(
    option(values, 'max-archive-mib', '500'),
    10,
  );
  const maximumWorkingMiB = Number.parseInt(
    option(values, 'max-working-mib', String(maximumArchiveMiB * 2)),
    10,
  );
  const shardTargetMiB = Number.parseFloat(
    option(values, 'shard-target-mib', '10'),
  );
  const shardVariancePercent = Number.parseFloat(
    option(values, 'shard-variance-percent', '20'),
  );
  const jobs = Number.parseInt(option(values, 'jobs', '1'), 10);
  const defaultThreads = Math.max(1, Math.floor(availableParallelism() / jobs));
  const tippecanoeThreads = Number.parseInt(
    option(
      values,
      'tippecanoe-threads',
      process.env.TIPPECANOE_MAX_THREADS || String(defaultThreads),
    ),
    10,
  );
  const archiveVariancePercent = Number.parseFloat(
    option(values, 'archive-variance-percent', '1'),
  );
  if (!Number.isFinite(shardTargetMiB) || shardTargetMiB <= 0) {
    throw new RangeError('Shard target must be greater than zero.');
  }
  if (!Number.isFinite(shardVariancePercent) || shardVariancePercent < 0) {
    throw new RangeError('Shard variance cannot be negative.');
  }
  if (!Number.isInteger(jobs) || jobs < 1) {
    throw new RangeError('Map build jobs must be a positive integer.');
  }
  if (!Number.isInteger(tippecanoeThreads) || tippecanoeThreads < 1) {
    throw new RangeError('Tippecanoe threads must be a positive integer.');
  }
  if (!Number.isFinite(archiveVariancePercent) || archiveVariancePercent < 0) {
    throw new RangeError('Archive variance cannot be negative.');
  }
  return {
    values,
    cache: path.resolve(option(values, 'cache', '.cache/maps/natural-earth')),
    input: path.resolve(option(values, 'input', '.cache/maps/vector-input')),
    output: path.resolve(option(values, 'output', 'build/maps/local.pmtiles')),
    logFile: option(values, 'log-file', ''),
    minimumZoom: Number.parseInt(option(values, 'minimum-zoom', '1'), 10),
    maximumZoom: Number.parseInt(option(values, 'maximum-zoom', '19'), 10),
    baseZoom: Number.parseInt(option(values, 'base-zoom', '16'), 10),
    maximumTileBytes:
      Number.parseInt(option(values, 'max-tile-kib', '64'), 10) * 1024,
    maximumArchiveMiB,
    maximumWorkingMiB,
    maximumArchiveBytes: maximumArchiveMiB * 1024 * 1024,
    maximumWorkingBytes: maximumWorkingMiB * 1024 * 1024,
    detail: Number.parseInt(option(values, 'detail', '11'), 10),
    budgetGrowth: Number.parseFloat(option(values, 'budget-growth', '1.3')),
    minimumLevelBytes:
      Number.parseInt(option(values, 'minimum-level-kib', '128'), 10) * 1024,
    shardZoom: Number.parseInt(option(values, 'shard-zoom', '9'), 10),
    shardTargetMiB,
    shardTargetBytes: shardTargetMiB * 1024 * 1024,
    shardVariancePercent,
    jobs,
    tippecanoeThreads,
    archiveVariancePercent,
    maximumDebtBytes:
      maximumArchiveMiB * 1024 * 1024 * archiveVariancePercent * 0.01,
    executable: process.env.TIPPECANOE || 'tippecanoe',
  };
}

export const VECTOR_BUILD_HELP = `Usage: npm run maps:build -- [options]

Builds budgeted MVT-in-PMTiles archives with Tippecanoe.

Options:
  --cache path          Downloaded GeoJSON source directory
  --input path          Temporary normalized GeoJSON sequence directory
  --output file         Filename stem for the PMTiles archive set
  --log-file file       JSON Lines generation log path
  --minimum-zoom 1      First generated zoom level
  --maximum-zoom 19     Last generated zoom level
  --base-zoom 16        Zoom where all point features may appear
  --max-tile-kib 64     Maximum compressed MVT tile size
  --max-archive-mib 500 Reject archives larger than this total
  --max-working-mib 1000 Maximum temporary size for any one level
  --detail 11           Maximum geometry precision (2^detail extent)
  --budget-growth 1.3   Relative budget growth within each zoom tier
  --minimum-level-kib 128 Minimum budget reserved for every archive
  --shard-zoom 9        First zoom eligible for adaptive subdivision
  --shard-target-mib 10 Target maximum before a region subdivides
  --shard-variance-percent 20 Soft variance before subdivision
  --archive-variance-percent 1 Allowed cumulative budget variance
  --jobs 1              Parallel archives built within each zoom
  --tippecanoe-threads N Threads used by each Tippecanoe process`;
