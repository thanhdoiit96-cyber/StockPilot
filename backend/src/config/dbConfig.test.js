const { buildSequelizeOptions } = require('./config');

describe('buildSequelizeOptions', () => {
  test('enables SSL for Neon Postgres URLs', () => {
    const opts = buildSequelizeOptions({
      databaseUrl: 'postgresql://neondb_owner:secret@ep-demo.c-14.us-east-1.aws.neon.tech/neondb?sslmode=require'
    });

    expect(opts.dialectOptions).toMatchObject({
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    });
  });

  test('keeps non-SSL config for local Postgres without a secure URL', () => {
    const opts = buildSequelizeOptions({
      dbHost: 'localhost',
      dbPort: 5432,
      dbUser: 'postgres',
      dbPassword: 'secret',
      dbName: 'stockpilot'
    });

    expect(opts.dialectOptions).toBeUndefined();
  });
});
