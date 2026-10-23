'use strict';

const { acquirePositionExitWorkerLease, renewPositionExitWorkerLease, releasePositionExitWorkerLease } = require('./positionExitWorkerLease');

function database(rows) {
  const transaction = { id: 'tx' };
  return { transaction: jest.fn(callback => callback(transaction)), query: jest.fn().mockResolvedValue([rows]) };
}

test('acquires a fenced lease atomically and scopes it to a transaction', async () => {
  const sequelize = database([{ lease_key: 'exit-guidance', owner_id: 'worker-a', fencing_token: '3', acquired: true }]);
  await expect(acquirePositionExitWorkerLease({ sequelize, leaseKey: 'exit-guidance', ownerId: 'worker-a' })).resolves.toMatchObject({ status: 'acquired', fencing_token: '3' });
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (lease_key)'), expect.objectContaining({ bind: ['exit-guidance', 'worker-a', 60000], transaction: { id: 'tx' } }));
});

test('reports an existing holder without stealing an unexpired lease', async () => {
  const sequelize = database([{ lease_key: 'exit-guidance', owner_id: 'worker-b', fencing_token: '3', acquired: false }]);
  await expect(acquirePositionExitWorkerLease({ sequelize, leaseKey: 'exit-guidance', ownerId: 'worker-a' })).resolves.toMatchObject({ status: 'held', owner_id: 'worker-b' });
});

test('renews and releases only with the current owner and fencing token', async () => {
  const sequelize = database([{ lease_key: 'exit-guidance', owner_id: 'worker-a', fencing_token: '3' }]);
  await expect(renewPositionExitWorkerLease({ sequelize, leaseKey: 'exit-guidance', ownerId: 'worker-a', fencingToken: 3 })).resolves.toMatchObject({ status: 'renewed' });
  sequelize.query.mockResolvedValueOnce([[]]);
  await expect(releasePositionExitWorkerLease({ sequelize, leaseKey: 'exit-guidance', ownerId: 'worker-a', fencingToken: 2 })).resolves.toEqual({ status: 'lost' });
});

test('expires rather than deletes a released lease so the next owner receives a newer token', async () => {
  const sequelize = database([{ lease_key: 'exit-guidance', owner_id: 'worker-a', fencing_token: '3' }]);
  await releasePositionExitWorkerLease({ sequelize, leaseKey: 'exit-guidance', ownerId: 'worker-a', fencingToken: 3 });
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('SET lease_expires_at = NOW()'), expect.any(Object));
  expect(sequelize.query.mock.calls[0][0]).not.toContain('DELETE FROM');
});

test('rejects unsafe lease configuration', async () => {
  const sequelize = database([]);
  await expect(acquirePositionExitWorkerLease({ sequelize, leaseKey: 'x', ownerId: 'a', leaseMs: 1 })).rejects.toThrow('leaseMs');
  await expect(renewPositionExitWorkerLease({ sequelize, leaseKey: 'x', ownerId: 'a', fencingToken: 0 })).rejects.toThrow('fencingToken');
});
