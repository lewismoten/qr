import { rm } from 'node:fs/promises';

import { tippecanoeArguments } from '../command.mjs';
import { temporaryArchivePath } from '../output.mjs';
import { runTippecanoe } from '../runner.mjs';
import { levelShardLabel } from '../shards.mjs';

export function createLevelRunner({
  inputs,
  baseZoom,
  executable,
  maximumWorkingBytes,
  log,
  threads,
}) {
  return async (level, settings) => {
    const temporary = temporaryArchivePath(level.file);
    await rm(temporary, { force: true });
    const args = tippecanoeArguments({
      inputs,
      output: temporary,
      minimumZoom: level.minimumZoom,
      maximumZoom: level.maximumZoom,
      baseZoom,
      clipBoundingBox: level.bounds,
      ...settings,
    });
    const run = await runTippecanoe({
      executable,
      args,
      temporary,
      workingLimit: maximumWorkingBytes,
      zoom: levelShardLabel(level),
      log,
      context: {
        zoom: level.minimumZoom,
        shard: level.shard,
        maximumTileBytes: settings.maximumTileBytes,
        configuredDetail: settings.detail,
      },
      threads,
    });
    return { temporary, ...run };
  };
}
