'use strict';

jest.mock('./positionExitWorkerLease', () => ({
  DEFAULT_LEASE_MS: 60000,
  acquirePositionExitWorkerLease: jest.fn(),
  renewPositionExitWorkerLease: jest.fn(),
  releasePositionExitWorkerLease: jest.fn()
}));
const lease = require('./positionExitWorkerLease');
const { runPositionExitLeaseOnlyWorker } = require('./positionExitWorkerRunner');

afterEach(() => jest.clearAllMocks());

test('renews the lease then releases it without generating any guidance', async () => {
  lease.acquirePositionExitWorkerLease.mockResolvedValue({ status: 'acquired', fencing_token: '4' });
  lease.renewPositionExitWorkerLease.mockResolvedValue({ status: 'renewed' });
  lease.releasePositionExitWorkerLease.mockResolvedValue({ status: 'released' });
  const result = await runPositionExitLeaseOnlyWorker({ sequelize: {}, leaseKey: 'exit', ownerId: 'worker-a', leaseMs: 15000, maxHeartbeats: 1, wait: jest.fn().mockResolvedValue(), logger: { info: jest.fn() } });
  expect(result).toEqual({ status: 'completed', heartbeats: 1, fencing_token: 4 });
  expect(lease.renewPositionExitWorkerLease).toHaveBeenCalledWith(expect.objectContaining({ fencingToken: 4 }));
  expect(lease.releasePositionExitWorkerLease).toHaveBeenCalledWith(expect.objectContaining({ fencingToken: 4 }));
});

test('does not run when a different owner holds the lease', async () => {
  lease.acquirePositionExitWorkerLease.mockResolvedValue({ status: 'held', owner_id: 'worker-b', fencing_token: '4' });
  await expect(runPositionExitLeaseOnlyWorker({ sequelize: {}, leaseKey: 'exit', ownerId: 'worker-a', logger: { info: jest.fn() } })).resolves.toMatchObject({ status: 'held' });
  expect(lease.renewPositionExitWorkerLease).not.toHaveBeenCalled();
  expect(lease.releasePositionExitWorkerLease).not.toHaveBeenCalled();
});
