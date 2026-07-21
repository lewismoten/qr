import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readVectorBuildOptions } from '../../scripts/maps/reporting/options.mjs';
import {
  createGenerationLog,
  createTippecanoeOutput,
  formatTippecanoeSummary,
} from '../../scripts/maps/reporting/run-log.mjs';

test('summarizes repetitive Tippecanoe fitting diagnostics', () => {
  const forwarded = [];
  const output = createTippecanoeOutput((line) => forwarded.push(line));
  output.write('Going to try keeping the sparsest 75.64% of the features');
  output.write(' to make it fit\n');
  output.write('tile 11/1078/731 size is 1142 with detail 19, >1024\n');
  output.write('tile 11/1078/731 size is 1071 with detail 8, >1024\n');
  output.write("Can't increase feature gap threshold further\n");
  output.write('A useful diagnostic\n');
  const summary = output.finish();
  assert.deepEqual(forwarded, ['A useful diagnostic']);
  assert.equal(summary.fitAttempts, 1);
  assert.equal(summary.minimumKeepPercent, 75.64);
  assert.equal(summary.oversizedTileReports, 2);
  assert.equal(summary.largestTile.bytes, 1142);
  assert.equal(summary.largestTile.reportedTippecanoeDetail, 19);
  assert.equal(summary.featureGapLimitReached, true);
  assert.deepEqual(output.tail().slice(-1), ['A useful diagnostic']);
  assert.match(formatTippecanoeSummary(summary), /2 tile checks/);
});

test('writes parameters first and preserves explicit log paths', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qr-map-log-'));
  const file = path.join(root, 'generation.jsonl');
  try {
    const log = createGenerationLog({
      output: path.join(root, 'local.pmtiles'),
      logFile: file,
      parameters: { maximumZoom: 19 },
    });
    log.record('archive-complete', { bytes: 42 });
    log.recordError('run-error', new Error('failed safely'));
    log.close();
    const records = (await readFile(file, 'utf8'))
      .trim()
      .split('\n')
      .map(JSON.parse);
    assert.equal(records[0].event, 'run-start');
    assert.equal(records[0].parameters.maximumZoom, 19);
    assert.deepEqual(records[1].bytes, 42);
    assert.equal(records[2].error.message, 'failed safely');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('parses logging and generation command options', () => {
  const options = readVectorBuildOptions([
    '--maximum-zoom',
    '12',
    '--log-file=build/custom.jsonl',
  ]);
  assert.equal(options.maximumZoom, 12);
  assert.equal(options.logFile, 'build/custom.jsonl');
  assert.equal(options.maximumArchiveMiB, 500);
  assert.equal(options.maximumTileBytes, 64 * 1024);
  assert.equal(options.shardZoom, 9);
  assert.equal(options.shardTargetMiB, 100);
  assert.equal(options.shardTargetBytes, 100 * 1024 * 1024);
  assert.equal(options.shardVariancePercent, 20);
  assert.equal(options.jobs, 1);
  assert.ok(options.tippecanoeThreads >= 1);
  assert.equal(options.dynamicTippecanoeThreads, true);
  assert.equal(options.archiveVariancePercent, 1);
  assert.equal(options.maximumDebtBytes, 5 * 1024 * 1024);
  assert.throws(
    () => readVectorBuildOptions(['--jobs', '0']),
    /positive integer/,
  );
  const fixedThreads = readVectorBuildOptions([
    '--jobs',
    '4',
    '--tippecanoe-threads',
    '3',
  ]);
  assert.equal(fixedThreads.tippecanoeThreads, 3);
  assert.equal(fixedThreads.dynamicTippecanoeThreads, false);
  assert.throws(
    () => readVectorBuildOptions(['--tippecanoe-threads', '0']),
    /positive integer/,
  );
  assert.throws(
    () => readVectorBuildOptions(['--shard-target-mib', '0']),
    /greater than zero/,
  );
  assert.throws(
    () => readVectorBuildOptions(['--archive-variance-percent', '-1']),
    /cannot be negative/,
  );
  assert.throws(
    () => readVectorBuildOptions(['--shard-variance-percent', '-1']),
    /cannot be negative/,
  );
});
