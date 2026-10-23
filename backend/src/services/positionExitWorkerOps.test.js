'use strict';
const { readPositionExitWorkerOps } = require('./positionExitWorkerOps');

test('returns bounded aggregate worker evidence without portfolio data', async () => {
  const sequelize = { query: jest.fn().mockResolvedValue([[{ lease_key: 'exit', owner_id: 'worker-a', fencing_token: '3', heartbeat_at: '2026-10-23T00:00:00Z', lease_expires_at: '2026-10-23T01:00:00Z' }]]) };
  const PositionExitWorkerLeaseEvent = { findAll: jest.fn().mockResolvedValue([{ toJSON: () => ({ event_type: 'renewed', fencing_token: '3', details: { heartbeats: 1 } }) }]) };
  const result = await readPositionExitWorkerOps({ sequelize, PositionExitWorkerLeaseEvent, leaseKey: 'exit', limit: 500, now: new Date('2026-10-23T00:30:00Z') });
  expect(result).toMatchObject({ active: true, lease: { owner_id: 'worker-a' }, events: [{ event_type: 'renewed' }] });
  expect(PositionExitWorkerLeaseEvent.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
});
