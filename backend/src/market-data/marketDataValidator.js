'use strict';

const { validateMarketRecord } = require('./contracts/marketDataContract');

function validateBatch(records) {
  if (!Array.isArray(records)) return { valid: [], rejected: [{ record: records, errors: ['records must be an array'] }] };
  const valid = [];
  const rejected = [];
  records.forEach((record, index) => {
    const errors = validateMarketRecord(record);
    if (errors.length) rejected.push({ index, record, errors });
    else valid.push(record);
  });
  return { valid, rejected };
}

module.exports = { validateBatch };
