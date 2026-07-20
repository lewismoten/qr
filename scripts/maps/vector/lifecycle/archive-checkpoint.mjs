import { createHash } from 'node:crypto';
import { readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { validatePmtilesArchive } from '../output.mjs';

const CHECKPOINT_VERSION = 1;

function archiveKey(level) {
  return `${level.minimumZoom}:${level.shard || 'world'}`;
}

function checkpointFile(output) {
  const parsed = path.parse(output);
  return path.join(parsed.dir, `${parsed.name}.checkpoints.json`);
}

export function createBuildFingerprint({ inputs, options, tippecanoeVersion }) {
  const settings = {
    minimumZoom: options.minimumZoom,
    baseZoom: options.baseZoom,
    maximumTileBytes: options.maximumTileBytes,
    maximumArchiveBytes: options.maximumArchiveBytes,
    detail: options.detail,
    budgetGrowth: options.budgetGrowth,
    minimumLevelBytes: options.minimumLevelBytes,
    shardZoom: options.shardZoom,
    shardTargetBytes: options.shardTargetBytes,
    shardVariancePercent: options.shardVariancePercent,
  };
  return createHash('sha256')
    .update(
      JSON.stringify({
        version: CHECKPOINT_VERSION,
        tippecanoeVersion,
        inputs: inputs.map(({ layer, hash }) => ({ layer, hash })),
        settings,
      }),
    )
    .digest('hex');
}

function serializableResult(result) {
  const {
    temporary: _temporary,
    carryBytes: _carryBytes,
    resumed: _resumed,
    ...stored
  } = result;
  return { ...stored, file: path.basename(result.file) };
}

export async function createArchiveCheckpoint({
  output,
  fingerprint,
  validate = validatePmtilesArchive,
}) {
  const file = checkpointFile(output);
  let archives = {};
  try {
    const saved = JSON.parse(await readFile(file, 'utf8'));
    if (
      saved.version === CHECKPOINT_VERSION &&
      saved.fingerprint === fingerprint
    ) {
      archives = saved.archives || {};
    }
  } catch {
    // A missing or incomplete checkpoint starts a clean build.
  }

  async function save() {
    const temporary = `${file}.partial`;
    const value = { version: CHECKPOINT_VERSION, fingerprint, archives };
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
    await rename(temporary, file);
  }

  return {
    file,
    async restore(level, allocatedBudgetBytes) {
      const stored = archives[archiveKey(level)];
      if (!stored) return null;
      if (!stored.empty) {
        const size = (await stat(level.file).catch(() => null))?.size;
        if (size !== stored.bytes) return null;
        const valid = await validate(level.file, Number.MAX_SAFE_INTEGER)
          .then(() => true)
          .catch(() => false);
        if (!valid) return null;
      }
      return {
        ...stored,
        ...level,
        allocatedBudgetBytes,
        temporary: level.file,
        resumed: true,
      };
    },
    async complete(result) {
      if (!result.empty && result.temporary !== result.file) {
        await rename(result.temporary, result.file);
      }
      result.temporary = result.file;
      archives[archiveKey(result)] = serializableResult(result);
      await save();
    },
  };
}

export function initializeArchiveCheckpoint(
  inputs,
  options,
  tippecanoeVersion,
) {
  return createArchiveCheckpoint({
    output: options.output,
    fingerprint: createBuildFingerprint({ inputs, options, tippecanoeVersion }),
  });
}
