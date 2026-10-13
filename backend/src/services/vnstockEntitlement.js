'use strict';

function classifyVnstockEntitlement(payload = {}) {
  const packages = Array.isArray(payload.availablePackages) ? payload.availablePackages : [];
  const subscription = payload.subscription && typeof payload.subscription === 'object' ? payload.subscription : null;
  const userType = String(payload.userType || '').toLowerCase() || 'unknown';
  const tier = String(subscription?.tier || payload.tier || (userType === 'free' ? 'community' : userType)).toLowerCase();
  const sponsor = packages.length > 0 || !['free', 'community', 'unknown'].includes(tier);
  return {
    status: sponsor ? 'eligible' : 'ineligible', tier, user_type: userType,
    active_subscription: Boolean(payload.hasActiveSubscription), device_registered: Boolean(payload.deviceRegistered),
    available_package_count: packages.length,
    reason: sponsor ? null : 'sponsor_package_not_available'
  };
}
module.exports = { classifyVnstockEntitlement };
