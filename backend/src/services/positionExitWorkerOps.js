'use strict';

async function readPositionExitWorkerOps({ sequelize, PositionExitWorkerLeaseEvent, leaseKey, limit = 20, now = new Date() } = {}) {
  if (!sequelize?.query || !PositionExitWorkerLeaseEvent?.findAll) throw new Error('worker lease dependencies are required');
  if (!String(leaseKey || '').trim()) throw new Error('leaseKey is required');
  const [leases] = await sequelize.query('SELECT lease_key, owner_id, fencing_token, heartbeat_at, lease_expires_at FROM position_exit_worker_leases WHERE lease_key = $1', { bind: [leaseKey] });
  const lease = leases?.[0] || null;
  const events = await PositionExitWorkerLeaseEvent.findAll({ where: { lease_key: leaseKey }, attributes: ['event_type', 'fencing_token', 'details', 'recorded_at'], order: [['recorded_at', 'DESC']], limit: Math.min(Math.max(Number(limit) || 20, 1), 50) });
  return {
    lease_key: leaseKey,
    active: Boolean(lease && new Date(lease.lease_expires_at).getTime() > now.getTime()),
    lease: lease && { owner_id: lease.owner_id, fencing_token: lease.fencing_token, heartbeat_at: lease.heartbeat_at, lease_expires_at: lease.lease_expires_at },
    events: events.map(event => event.toJSON ? event.toJSON() : event)
  };
}

module.exports = { readPositionExitWorkerOps };
