'use strict';

const { DEFAULT_LEASE_MS, acquirePositionExitWorkerLease, renewPositionExitWorkerLease, releasePositionExitWorkerLease } = require('./positionExitWorkerLease');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runPositionExitLeaseOnlyWorker({ sequelize, leaseKey, ownerId, leaseMs = DEFAULT_LEASE_MS, maxHeartbeats = Infinity, wait = delay, logger = console } = {}) {
  const acquired = await acquirePositionExitWorkerLease({ sequelize, leaseKey, ownerId, leaseMs });
  if (acquired.status !== 'acquired') return { status: acquired.status, owner_id: acquired.owner_id, fencing_token: acquired.fencing_token };
  const fencingToken = Number(acquired.fencing_token);
  let heartbeats = 0;
  try {
    logger.info(JSON.stringify({ event: 'position_exit_worker_lease_acquired', lease_key: leaseKey, owner_id: ownerId, fencing_token: fencingToken }));
    while (heartbeats < maxHeartbeats) {
      await wait(Math.floor(leaseMs / 2));
      const renewed = await renewPositionExitWorkerLease({ sequelize, leaseKey, ownerId, fencingToken, leaseMs });
      if (renewed.status !== 'renewed') return { status: 'lease_lost', heartbeats };
      heartbeats += 1;
      logger.info(JSON.stringify({ event: 'position_exit_worker_lease_renewed', lease_key: leaseKey, owner_id: ownerId, fencing_token: fencingToken, heartbeats }));
    }
    return { status: 'completed', heartbeats, fencing_token: fencingToken };
  } finally {
    const released = await releasePositionExitWorkerLease({ sequelize, leaseKey, ownerId, fencingToken });
    logger.info(JSON.stringify({ event: 'position_exit_worker_lease_released', lease_key: leaseKey, owner_id: ownerId, fencing_token: fencingToken, release: released.status }));
  }
}

module.exports = { runPositionExitLeaseOnlyWorker };
