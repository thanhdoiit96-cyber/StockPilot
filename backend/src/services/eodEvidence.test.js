'use strict';

const { readLatestEodEvidence, selectLatestEodEvidence } = require('./eodEvidence');

describe('EOD evidence selection', () => {
  test('selects the newest checked_at across scheduled and gap retry artifacts', () => {
    expect(selectLatestEodEvidence([
      { file: 'eod-scheduled.json', mode: 'scheduled_ingest', evidence: { checked_at: '2026-10-02T08:30:00.000Z' } },
      { file: 'eod-retry.json', mode: 'gap_retry', evidence: { checked_at: '2026-10-02T12:45:00.000Z' } }
    ])).toMatchObject({ file: 'eod-retry.json', mode: 'gap_retry' });
  });

  test('reads both artifact types and ignores corrupt evidence', () => {
    const files = {
      'eod-scheduled-2026-10-02-old.json': JSON.stringify({ checked_at: '2026-10-02T08:30:00.000Z' }),
      'eod-retry-2026-10-02-new.json': JSON.stringify({ checked_at: '2026-10-02T12:45:00.000Z', after: { missing_symbols: ['SSI'] } }),
      'eod-retry-2026-10-02-corrupt.json': '{',
      'eod-retry-2026-10-01-other.json': JSON.stringify({ checked_at: '2026-10-02T13:00:00.000Z' })
    };
    const fileSystem = {
      existsSync: jest.fn(() => true),
      readdirSync: jest.fn(() => Object.keys(files)),
      readFileSync: jest.fn(file => files[file.split(/[\\/]/).at(-1)])
    };
    expect(readLatestEodEvidence('evidence', '2026-10-02', fileSystem)).toMatchObject({
      file: 'eod-retry-2026-10-02-new.json', mode: 'gap_retry', evidence: { after: { missing_symbols: ['SSI'] } }
    });
  });
});
