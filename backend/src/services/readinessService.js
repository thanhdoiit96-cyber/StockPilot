const DEFAULT_TIMEOUT_MS = 1500;
const MAX_TIMEOUT_MS = 2000;

function readinessTimeout(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.floor(parsed), MAX_TIMEOUT_MS);
}

function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('dependency_timeout')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function dependencyResult(required, available, latencyMs) {
  return { required, available, latency_ms: latencyMs };
}

function createReadinessProbe({
  sequelize,
  fetchImpl = global.fetch,
  workerUrl = process.env.VNSTOCK_WORKER_URL || null,
  requireWorker = process.env.READINESS_REQUIRE_WORKER === 'true',
  timeoutMs = readinessTimeout(process.env.READINESS_TIMEOUT_MS),
  now = () => Date.now()
} = {}) {
  if (!sequelize || typeof sequelize.authenticate !== 'function') throw new TypeError('A Sequelize connection is required');
  const boundedTimeout = readinessTimeout(timeoutMs);

  return async function probeReadiness() {
    const checkedAt = new Date(now()).toISOString();
    const databaseStarted = now();
    let databaseAvailable = false;
    try {
      await withTimeout(Promise.resolve().then(() => sequelize.authenticate()), boundedTimeout);
      databaseAvailable = true;
    } catch (_) {
      databaseAvailable = false;
    }
    const database = dependencyResult(true, databaseAvailable, Math.max(0, now() - databaseStarted));

    let worker = dependencyResult(Boolean(requireWorker), false, null);
    if (workerUrl && typeof fetchImpl === 'function') {
      const workerStarted = now();
      try {
        const response = await fetchImpl(`${String(workerUrl).replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(boundedTimeout) });
        worker = dependencyResult(Boolean(requireWorker), Boolean(response.ok), Math.max(0, now() - workerStarted));
      } catch (_) {
        worker = dependencyResult(Boolean(requireWorker), false, Math.max(0, now() - workerStarted));
      }
    }

    const ready = database.available && (!worker.required || worker.available);
    return { ready, status: ready ? 'ready' : 'not_ready', checked_at: checkedAt, dependencies: { database, worker } };
  };
}

module.exports = { createReadinessProbe, readinessTimeout };
