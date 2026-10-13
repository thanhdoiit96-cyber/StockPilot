'use strict';
jest.mock('node-cron', () => ({ schedule: jest.fn((_schedule, callback) => ({ callback })) }));
const cron = require('node-cron');
const { startForeignFlowJob } = require('./foreignFlowJob');

test('foreign-flow schedule is development-only and explicitly enabled', async () => {
  const previous = { node: process.env.NODE_ENV, enabled: process.env.VNSTOCK_FOREIGN_FLOW_ENABLED };
  process.env.NODE_ENV = 'development'; delete process.env.VNSTOCK_FOREIGN_FLOW_ENABLED;
  expect(startForeignFlowJob()).toBeNull();
  process.env.VNSTOCK_FOREIGN_FLOW_ENABLED = 'true';
  const logger = { info: jest.fn(), error: jest.fn() }; const run = jest.fn().mockResolvedValue('ok');
  const task = startForeignFlowJob({ logger, run }); await task.callback();
  expect(cron.schedule).toHaveBeenCalledWith('0 17 * * 1-5', expect.any(Function), { timezone: 'Asia/Ho_Chi_Minh' });
  expect(logger.info).toHaveBeenCalledWith('[Foreign flow] ok');
  process.env.NODE_ENV = previous.node; if (previous.enabled == null) delete process.env.VNSTOCK_FOREIGN_FLOW_ENABLED; else process.env.VNSTOCK_FOREIGN_FLOW_ENABLED = previous.enabled;
});
