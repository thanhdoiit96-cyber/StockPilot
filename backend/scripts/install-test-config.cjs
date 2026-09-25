const config = require('../src/config/config');
const schema = process.env.VERIFY_INSTALL_SCHEMA;
if (!/^verify_install_[a-f0-9]{32}$/.test(schema || '')) {
  throw new Error('An isolated verification schema is required');
}
module.exports = {
  development: {
    ...config.development,
    dialectOptions: { options: `-c search_path=${schema}` },
    migrationStorageTableSchema: schema
  }
};
