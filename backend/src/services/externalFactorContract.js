'use strict';
const TYPES = new Set(['news', 'macro', 'corporate_event']);
const STATUSES = new Set(['verified', 'unverified', 'rejected']);
function validateExternalFactor(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['record must be an object'];
  if (!TYPES.has(record.type)) errors.push('type must be news, macro or corporate_event');
  if (!record.source || typeof record.source !== 'string') errors.push('source is required');
  if (typeof record.published_at !== 'string' || Number.isNaN(Date.parse(record.published_at))) errors.push('published_at must be an ISO timestamp');
  if (typeof record.fetched_at !== 'string' || Number.isNaN(Date.parse(record.fetched_at))) errors.push('fetched_at must be an ISO timestamp');
  if (!STATUSES.has(record.status)) errors.push('status is invalid');
  if (!record.title && !record.summary) errors.push('title or summary is required');
  return errors;
}
module.exports = { TYPES, STATUSES, validateExternalFactor };
