'use strict';

const DEFAULT_LEASE_MS = 60_000;
const MIN_LEASE_MS = 15_000;
const MAX_LEASE_MS = 15 * 60_000;

function validate({ sequelize, leaseKey, ownerId, leaseMs = DEFAULT_LEASE_MS }) {
  if (!sequelize?.query || !sequelize?.transaction) throw new Error('sequelize transaction support is required');
  if (!String(leaseKey || '').trim() || !String(ownerId || '').trim()) throw new Error('leaseKey and ownerId are required');
  if (!Number.isInteger(leaseMs) || leaseMs < MIN_LEASE_MS || leaseMs > MAX_LEASE_MS) throw new Error(`leaseMs must be an integer between ${MIN_LEASE_MS} and ${MAX_LEASE_MS}`);
}

async function acquirePositionExitWorkerLease({ sequelize, leaseKey, ownerId, leaseMs = DEFAULT_LEASE_MS } = {}) {
  validate({ sequelize, leaseKey, ownerId, leaseMs });
  return sequelize.transaction(async transaction => {
    const [rows] = await sequelize.query(`
      WITH claimed AS (
        INSERT INTO position_exit_worker_leases (lease_key, owner_id, fencing_token, acquired_at, heartbeat_at, lease_expires_at, updated_at)
        VALUES ($1, $2, 1, NOW(), NOW(), NOW() + ($3 * INTERVAL '1 millisecond'), NOW())
        ON CONFLICT (lease_key) DO UPDATE
          SET owner_id = EXCLUDED.owner_id,
              fencing_token = position_exit_worker_leases.fencing_token + 1,
              acquired_at = NOW(),
              heartbeat_at = NOW(),
              lease_expires_at = NOW() + ($3 * INTERVAL '1 millisecond'),
              updated_at = NOW()
          WHERE position_exit_worker_leases.lease_expires_at <= NOW()
        RETURNING lease_key, owner_id, fencing_token, lease_expires_at, true AS acquired
      )
      SELECT * FROM claimed
      UNION ALL
      SELECT lease_key, owner_id, fencing_token, lease_expires_at, false AS acquired
      FROM position_exit_worker_leases
      WHERE lease_key = $1 AND NOT EXISTS (SELECT 1 FROM claimed)
    `, { bind: [leaseKey, ownerId, leaseMs], transaction });
    const lease = rows?.[0];
    if (!lease) throw new Error('lease state was not returned');
    if (lease.acquired === true || lease.acquired === 't' || lease.acquired === 1) return { status: 'acquired', ...lease };
    return { status: lease.owner_id === ownerId ? 'already_owned' : 'held', ...lease };
  });
}

async function renewPositionExitWorkerLease({ sequelize, leaseKey, ownerId, fencingToken, leaseMs = DEFAULT_LEASE_MS } = {}) {
  validate({ sequelize, leaseKey, ownerId, leaseMs });
  if (!Number.isInteger(Number(fencingToken)) || Number(fencingToken) < 1) throw new Error('fencingToken must be a positive integer');
  const [rows] = await sequelize.query(`
    UPDATE position_exit_worker_leases
    SET heartbeat_at = NOW(), lease_expires_at = NOW() + ($4 * INTERVAL '1 millisecond'), updated_at = NOW()
    WHERE lease_key = $1 AND owner_id = $2 AND fencing_token = $3 AND lease_expires_at > NOW()
    RETURNING lease_key, owner_id, fencing_token, heartbeat_at, lease_expires_at
  `, { bind: [leaseKey, ownerId, fencingToken, leaseMs] });
  return rows?.[0] ? { status: 'renewed', ...rows[0] } : { status: 'lost' };
}

async function releasePositionExitWorkerLease({ sequelize, leaseKey, ownerId, fencingToken } = {}) {
  validate({ sequelize, leaseKey, ownerId });
  if (!Number.isInteger(Number(fencingToken)) || Number(fencingToken) < 1) throw new Error('fencingToken must be a positive integer');
  const [rows] = await sequelize.query(`
    DELETE FROM position_exit_worker_leases
    WHERE lease_key = $1 AND owner_id = $2 AND fencing_token = $3
    RETURNING lease_key, owner_id, fencing_token
  `, { bind: [leaseKey, ownerId, fencingToken] });
  return rows?.[0] ? { status: 'released', ...rows[0] } : { status: 'lost' };
}

module.exports = { DEFAULT_LEASE_MS, MIN_LEASE_MS, MAX_LEASE_MS, acquirePositionExitWorkerLease, renewPositionExitWorkerLease, releasePositionExitWorkerLease };
