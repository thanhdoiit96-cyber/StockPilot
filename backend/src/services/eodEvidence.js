'use strict';

const fs = require('node:fs');
const path = require('node:path');

function evidenceMode(file) {
  return file.startsWith('eod-retry-') ? 'gap_retry' : 'scheduled_ingest';
}

function selectLatestEodEvidence(candidates = []) {
  return candidates
    .filter(candidate => candidate?.evidence && Number.isFinite(Date.parse(candidate.evidence.checked_at)))
    .sort((left, right) => Date.parse(right.evidence.checked_at) - Date.parse(left.evidence.checked_at))[0] || null;
}

function readLatestEodEvidence(directory, sessionDate, fileSystem = fs) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(sessionDate || '')) || !fileSystem.existsSync(directory)) return null;
  const prefixes = [`eod-scheduled-${sessionDate}-`, `eod-retry-${sessionDate}-`];
  const candidates = [];
  for (const file of fileSystem.readdirSync(directory)) {
    if (!file.endsWith('.json') || !prefixes.some(prefix => file.startsWith(prefix))) continue;
    try {
      candidates.push({ file, mode: evidenceMode(file), evidence: JSON.parse(fileSystem.readFileSync(path.join(directory, file), 'utf8')) });
    } catch (_) { /* Ignore an incomplete/corrupt artifact and keep the endpoint available. */ }
  }
  return selectLatestEodEvidence(candidates);
}

module.exports = { readLatestEodEvidence, selectLatestEodEvidence };
