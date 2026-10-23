'use strict';
const { sequelize } = require('../src/models');
const { acquirePositionExitWorkerLease, renewPositionExitWorkerLease, releasePositionExitWorkerLease } = require('../src/services/positionExitWorkerLease');

const ownerId = process.env.EXIT_GUIDANCE_EOD_OWNER_ID;
const leaseKey = process.env.EXIT_GUIDANCE_EOD_LEASE_KEY || 'position-exit-eod:vnstock:position_exit_rule_v1';

async function main() {
  if (!ownerId) throw new Error('EXIT_GUIDANCE_EOD_OWNER_ID is required');
  const acquired = await acquirePositionExitWorkerLease({ sequelize, leaseKey, ownerId });
  if (acquired.status !== 'acquired') {
    console.log(JSON.stringify({ status: acquired.status, lease_key: leaseKey, owner_id: acquired.owner_id, fencing_token: acquired.fencing_token }));
    process.exitCode = 2;
    return;
  }
  const renewed = await renewPositionExitWorkerLease({ sequelize, leaseKey, ownerId, fencingToken: Number(acquired.fencing_token) });
  const released = renewed.status === 'renewed'
    ? await releasePositionExitWorkerLease({ sequelize, leaseKey, ownerId, fencingToken: Number(acquired.fencing_token) })
    : { status: 'not_attempted' };
  console.log(JSON.stringify({ status: 'verified', lease_key: leaseKey, fencing_token: acquired.fencing_token, renew: renewed.status, release: released.status }));
  if (renewed.status !== 'renewed' || released.status !== 'released') process.exitCode = 1;
}

main().catch(error => { console.error(`Exit-guidance worker lease verification failed: ${error.message}`); process.exitCode = 1; }).finally(async () => { await sequelize.close(); });
