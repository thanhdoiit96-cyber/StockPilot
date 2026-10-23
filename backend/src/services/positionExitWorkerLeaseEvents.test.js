'use strict';
const { recordPositionExitWorkerLeaseEvent } = require('./positionExitWorkerLeaseEvents');

test('records only aggregate allowed lease lifecycle events', async () => {
  const PositionExitWorkerLeaseEvent = { create: jest.fn().mockResolvedValue({ id: 'event' }) };
  await recordPositionExitWorkerLeaseEvent({ PositionExitWorkerLeaseEvent, leaseKey: 'exit', ownerId: 'worker-a', fencingToken: 2, eventType: 'renewed', details: { heartbeats: 1 } });
  expect(PositionExitWorkerLeaseEvent.create).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'renewed', details: { heartbeats: 1 } }));
  await expect(recordPositionExitWorkerLeaseEvent({ PositionExitWorkerLeaseEvent, leaseKey: 'exit', ownerId: 'worker-a', fencingToken: 2, eventType: 'unknown' })).rejects.toThrow('eventType');
});
