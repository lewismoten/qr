import { Session } from 'node:inspector';

function createPoster(session) {
  return (method, parameters = {}) =>
    new Promise((resolve, reject) => {
      session.post(method, parameters, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
}

function summarizeProfile(profile, operationCount) {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const functions = new Map();
  const totalMicroseconds = profile.timeDeltas.reduce(
    (total, delta) => total + delta,
    0,
  );
  profile.samples.forEach((nodeId, index) => {
    const frame = nodes.get(nodeId)?.callFrame;
    if (!frame?.url.includes('/src/js/qr/')) return;
    const file = frame.url.split('/').at(-1);
    const line = frame.lineNumber + 1;
    const name = frame.functionName || '(anonymous)';
    const key = `${file}:${line}:${name}`;
    const entry = functions.get(key) || {
      name,
      file,
      line,
      selfMicroseconds: 0,
    };
    entry.selfMicroseconds += profile.timeDeltas[index] || 0;
    functions.set(key, entry);
  });
  return [...functions.values()]
    .sort((left, right) => right.selfMicroseconds - left.selfMicroseconds)
    .slice(0, 10)
    .map(({ selfMicroseconds, ...entry }) => ({
      ...entry,
      selfMicrosecondsPerOperation: Number(
        (selfMicroseconds / operationCount).toFixed(1),
      ),
      sampleSharePercent: Number(
        ((selfMicroseconds / totalMicroseconds) * 100).toFixed(1),
      ),
    }));
}

export async function profileQrFunctions(scenarios, cycleCount) {
  const session = new Session();
  const post = createPoster(session);
  session.connect();
  try {
    await post('Profiler.enable');
    await post('Profiler.setSamplingInterval', { interval: 500 });
    await post('Profiler.start');
    const startedAt = performance.now();
    for (let cycle = 0; cycle < cycleCount; cycle += 1) {
      scenarios.forEach((scenario) => scenario.run());
    }
    const elapsedMs = performance.now() - startedAt;
    const { profile } = await post('Profiler.stop');
    const operationCount = scenarios.length * cycleCount;
    return {
      elapsedMs: Number(elapsedMs.toFixed(2)),
      operationCount,
      hotspots: summarizeProfile(profile, operationCount),
    };
  } finally {
    session.disconnect();
  }
}
