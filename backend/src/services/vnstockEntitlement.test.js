'use strict';
const { classifyVnstockEntitlement } = require('./vnstockEntitlement');
test('classifies an active free subscription without packages as ineligible', () => {
  expect(classifyVnstockEntitlement({ userType: 'free', hasActiveSubscription: true, deviceRegistered: false, availablePackages: [], subscription: null })).toEqual({ status: 'ineligible', tier: 'community', user_type: 'free', active_subscription: true, device_registered: false, available_package_count: 0, reason: 'sponsor_package_not_available' });
});
test('recognizes a sponsor tier or available package without exposing payload details', () => {
  expect(classifyVnstockEntitlement({ userType: 'sponsor', subscription: { tier: 'golden' }, availablePackages: [] })).toMatchObject({ status: 'eligible', tier: 'golden' });
  expect(classifyVnstockEntitlement({ userType: 'free', availablePackages: [{ id: 'vnstock_data' }] })).toMatchObject({ status: 'eligible', available_package_count: 1 });
});
