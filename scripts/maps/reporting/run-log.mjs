import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

function errorDetails(error) {
  return {
    name: error?.name,
    message: error?.message || String(error),
    stack: error?.stack,
    exitCode: error?.exitCode,
    noData: error?.noData,
    workingLimitExceeded: error?.workingLimitExceeded,
    temporaryFileBytes: error?.temporaryFileBytes,
    stderrTail: error?.stderrTail,
  };
}

export function createGenerationLog({
  output,
  logFile,
  parameters,
  startEvent = 'run-start',
}) {
  const startedAt = Date.now();
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const file = path.resolve(
    logFile ||
      path.join(path.dirname(output), 'logs', `map-generation-${stamp}.jsonl`),
  );
  mkdirSync(path.dirname(file), { recursive: true });
  const record = (event, details = {}) => {
    appendFileSync(
      file,
      `${JSON.stringify({ time: new Date().toISOString(), event, ...details })}\n`,
    );
  };
  record(startEvent, { parameters });
  let fatalRecorded = false;
  const onFatal = (error) => {
    if (fatalRecorded) return;
    fatalRecorded = true;
    record('run-error', { error: errorDetails(error) });
  };
  process.once('uncaughtExceptionMonitor', onFatal);
  return {
    file,
    startedAt,
    record,
    recordError(event, error, details = {}) {
      record(event, { ...details, error: errorDetails(error) });
    },
    close() {
      process.off('uncaughtExceptionMonitor', onFatal);
    },
  };
}

export function createBuildLog(options) {
  const log = createGenerationLog({
    output: options.output,
    logFile: options.logFile,
    parameters: options,
    startEvent: process.env.MAP_LOG_PARENT ? 'build-start' : 'run-start',
  });
  console.log(`Generation log: ${log.file}`);
  return log;
}

export function createTippecanoeOutput(writeLine) {
  let pending = '';
  const stderrTail = [];
  const summary = {
    fitAttempts: 0,
    minimumKeepPercent: null,
    oversizedTileReports: 0,
    largestTile: null,
    featureGapLimitReached: false,
  };

  const consume = (value) => {
    const line = value.trim();
    if (!line) return;
    stderrTail.push(line);
    if (stderrTail.length > 100) stderrTail.shift();
    const keep = /keeping the sparsest ([\d.]+)%/.exec(line);
    if (keep) {
      const percent = Number(keep[1]);
      summary.fitAttempts += 1;
      summary.minimumKeepPercent = Math.min(
        summary.minimumKeepPercent ?? percent,
        percent,
      );
      return;
    }
    const tile =
      /tile (\d+\/\d+\/\d+) size is (\d+).*detail (\d+), >(\d+)/.exec(line);
    if (tile) {
      const report = {
        tile: tile[1],
        bytes: Number(tile[2]),
        reportedTippecanoeDetail: Number(tile[3]),
        limitBytes: Number(tile[4]),
      };
      summary.oversizedTileReports += 1;
      if (!summary.largestTile || report.bytes > summary.largestTile.bytes) {
        summary.largestTile = report;
      }
      return;
    }
    if (line.includes("Can't increase feature gap threshold further")) {
      summary.featureGapLimitReached = true;
      return;
    }
    writeLine(line);
  };

  return {
    write(chunk) {
      const parts = `${pending}${chunk}`.split(/[\r\n]/);
      pending = parts.pop() || '';
      parts.forEach(consume);
    },
    finish() {
      consume(pending);
      pending = '';
      return summary;
    },
    tail() {
      return [...stderrTail];
    },
  };
}

export function formatTippecanoeSummary(summary) {
  if (!summary.fitAttempts && !summary.oversizedTileReports) return null;
  const largest = summary.largestTile
    ? `largest ${summary.largestTile.bytes} B at ${summary.largestTile.tile}`
    : 'no oversized tile details';
  const retained =
    summary.minimumKeepPercent == null
      ? ''
      : `, minimum retained ${summary.minimumKeepPercent}%`;
  const limit = summary.featureGapLimitReached ? ', compaction limit hit' : '';
  return (
    `Tippecanoe fit: ${summary.fitAttempts} retries, ` +
    `${summary.oversizedTileReports} tile checks, ${largest}${retained}${limit}.`
  );
}

export function recordArchiveAttempt(
  log,
  event,
  { level, attempt, allocatedBudgetBytes, settings, ...details },
) {
  log.record(event, {
    zoom: level.minimumZoom,
    shard: level.shard,
    attempt,
    allocatedBudgetBytes,
    maximumTileBytes: settings.maximumTileBytes,
    configuredDetail: settings.detail,
    ...details,
  });
}

export function recordCompletedArchive(log, result, durationMs) {
  log.record(result.empty ? 'archive-empty' : 'archive-complete', {
    zoom: result.minimumZoom,
    shard: result.shard,
    file: path.basename(result.file),
    durationMs,
    bytes: result.bytes,
    naturalBytes: result.naturalBytes,
    retainedRatio: result.retainedRatio,
    plannedBudgetBytes: result.budgetBytes,
    allocatedBudgetBytes: result.allocatedBudgetBytes,
    carryBytes: result.carryBytes,
    maximumTileBytes: result.maximumTileBytes,
    configuredDetail: result.detail,
    archiveStats: result.archiveStats,
    naturalArchiveStats: result.naturalArchiveStats,
    empty: result.empty || undefined,
    resumed: result.resumed || undefined,
  });
}

export function recordZoomPlan(log, levels, shardTargetBytes) {
  log.record('zoom-plan', {
    zoom: levels[0]?.minimumZoom,
    archives: levels.length,
    shardTargetBytes,
    forecastMultiplier: levels[0]?.multiplier,
    observedGrowth: levels[0]?.observedGrowth,
    activeFeatureRatio: levels[0]?.activeRatio,
    visibleFeatures: levels[0]?.visibleFeatures,
    revealedFeatures: levels[0]?.revealedFeatures,
    expiredFeatures: levels[0]?.expiredFeatures,
    revealedFeaturesByLayer: levels[0]?.revealedFeaturesByLayer,
    regions: levels.map((level) => ({
      shard: level.shard,
      grid: level.shardGrid,
      column: level.shardColumn,
      row: level.shardRow,
      budgetBytes: level.budgetBytes,
      forecastBytes: level.forecastBytes,
      forecastMultiplier: level.forecastMultiplier,
    })),
  });
}
