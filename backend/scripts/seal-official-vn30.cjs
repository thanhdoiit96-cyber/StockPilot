'use strict';
// Owner-local equivalent of the admin manifest endpoint. No provider requests.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const { buildOfficialVn30MembershipManifest } = require('../src/services/officialIndexMembershipIngest');
async function main() {
  const file = process.argv[2];
  if (!file || !process.argv.includes('--reviewed-internal-research')) throw new Error('Usage: node scripts/seal-official-vn30.cjs manifest.json --reviewed-internal-research');
  if (process.env.NODE_ENV !== 'development') throw new Error('Owner-local ingest is development-only');
  const manifest = buildOfficialVn30MembershipManifest(JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')));
  const result = await models.sequelize.transaction(async transaction => {
    await models.sequelize.query("SELECT pg_advisory_xact_lock(hashtext('official-vn30-owner-ingest'))", { transaction });
    const previous = await models.IndexMembershipSnapshot.findOne({ where: { membership_sha256: manifest.membership_sha256, source_sha256: manifest.source_sha256, rights_evidence_ref: manifest.rights_evidence_ref }, transaction });
    if (previous) return { id: previous.id, created: false };
    const snapshot = await models.IndexMembershipSnapshot.create({ ...manifest, symbols: undefined, ingested_at: new Date() }, { transaction });
    await models.IndexMembershipConstituent.bulkCreate(manifest.symbols.map(symbol => ({ snapshot_id: snapshot.id, symbol, source_identifier: manifest.source_identifier })), { transaction });
    return { id: snapshot.id, created: true };
  });
  console.log(JSON.stringify({ ...result, member_count: 30, distribution: 'internal_research_only', publication_permitted: false }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => models.sequelize.close());
