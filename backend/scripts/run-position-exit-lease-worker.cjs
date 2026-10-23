'use strict';
const { sequelize } = require('../src/models');
const { runPositionExitLeaseOnlyWorker } = require('../src/services/positionExitWorkerRunner');
const { recordPositionExitWorkerLeaseEvent } = require('../src/services/positionExitWorkerLeaseEvents');
const { PositionExitWorkerLeaseEvent } = require('../src/models');

const ownerId = process.env.EXIT_GUIDANCE_EOD_OWNER_ID;
const leaseKey = process.env.EXIT_GUIDANCE_EOD_LEASE_KEY || 'position-exit-eod:vnstock:position_exit_rule_v1';
const leaseMs = Number(process.env.EXIT_GUIDANCE_EOD_LEASE_MS || 60000);
const option = process.argv.find(value => value.startsWith('--max-heartbeats='));
const maxHeartbeats = option ? Number(option.split('=')[1]) : Infinity;

async function main() {
  if (process.env.EXIT_GUIDANCE_EOD_WORKER_ENABLED !== 'true') throw new Error('EXIT_GUIDANCE_EOD_WORKER_ENABLED=true is required');
  if (!ownerId) throw new Error('EXIT_GUIDANCE_EOD_OWNER_ID is required');
  if (!(maxHeartbeats === Infinity || (Number.isInteger(maxHeartbeats) && maxHeartbeats >= 1))) throw new Error('--max-heartbeats must be a positive integer');
  const recordEvent = ({ eventType, fencingToken, details }) => recordPositionExitWorkerLeaseEvent({ PositionExitWorkerLeaseEvent, leaseKey, ownerId, fencingToken, eventType, details });
  const result = await runPositionExitLeaseOnlyWorker({ sequelize, leaseKey, ownerId, leaseMs, maxHeartbeats, recordEvent });
  console.log(JSON.stringify({ worker: 'position_exit_lease_only', ...result }));
  if (result.status !== 'completed') process.exitCode = 2;
}

main().catch(error => { console.error(`Exit-guidance lease worker failed: ${error.message}`); process.exitCode = 1; }).finally(async () => { await sequelize.close(); });
