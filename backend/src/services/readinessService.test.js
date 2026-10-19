const { createReadinessProbe, readinessTimeout } = require('./readinessService');

test('bounds readiness timeouts', () => {
  expect(readinessTimeout()).toBe(1500);
  expect(readinessTimeout('250')).toBe(250);
  expect(readinessTimeout('9000')).toBe(2000);
});

test('reports ready when the database and required worker are available', async () => {
  const probe = createReadinessProbe({
    sequelize: { authenticate: jest.fn().mockResolvedValue() },
    fetchImpl: jest.fn().mockResolvedValue({ ok: true }), workerUrl: 'http://worker.test/', requireWorker: true,
    now: (() => { let value = Date.parse('2026-10-19T00:00:00Z'); return () => value++; })()
  });
  await expect(probe()).resolves.toMatchObject({ ready: true, status: 'ready', dependencies: {
    database: { required: true, available: true }, worker: { required: true, available: true }
  } });
});

test('fails closed without exposing dependency errors', async () => {
  const probe = createReadinessProbe({
    sequelize: { authenticate: jest.fn().mockRejectedValue(new Error('postgresql://secret')) },
    fetchImpl: jest.fn().mockRejectedValue(new Error('worker secret')), workerUrl: 'http://worker.test', requireWorker: true
  });
  const result = await probe();
  expect(result).toMatchObject({ ready: false, status: 'not_ready' });
  expect(JSON.stringify(result)).not.toMatch(/secret|postgresql/i);
});

test('keeps an unavailable optional worker visible without failing database readiness', async () => {
  const probe = createReadinessProbe({
    sequelize: { authenticate: jest.fn().mockResolvedValue() },
    fetchImpl: jest.fn().mockRejectedValue(new Error('offline')), workerUrl: 'http://worker.test', requireWorker: false
  });
  await expect(probe()).resolves.toMatchObject({ ready: true, dependencies: { worker: { required: false, available: false } } });
});
