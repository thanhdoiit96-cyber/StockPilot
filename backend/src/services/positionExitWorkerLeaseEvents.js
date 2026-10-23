'use strict';

const ALLOWED_EVENTS = new Set(['acquired', 'renewed', 'released', 'lease_lost']);

async function recordPositionExitWorkerLeaseEvent({ PositionExitWorkerLeaseEvent, leaseKey, ownerId, fencingToken, eventType, details = {}, now = new Date() } = {}) {
  if (!PositionExitWorkerLeaseEvent?.create) throw new Error('PositionExitWorkerLeaseEvent is required');
  if (!String(leaseKey || '').trim() || !String(ownerId || '').trim()) throw new Error('leaseKey and ownerId are required');
  if (!Number.isInteger(Number(fencingToken)) || Number(fencingToken) < 1) throw new Error('fencingToken must be a positive integer');
  if (!ALLOWED_EVENTS.has(eventType)) throw new Error('eventType is invalid');
  return PositionExitWorkerLeaseEvent.create({ lease_key: leaseKey, owner_id: ownerId, fencing_token: fencingToken, event_type: eventType, details, recorded_at: now });
}

module.exports = { ALLOWED_EVENTS, recordPositionExitWorkerLeaseEvent };
