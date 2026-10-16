const { buildSequelizeOptions, resolveDatabaseConnectionConfig } = require('./config');

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

  test('throws a clear error when the database password is missing', () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousPostgresUrl = process.env.POSTGRES_URL;
    const previousPrismaUrl = process.env.POSTGRES_PRISMA_URL;
    const previousDbPassword = process.env.DB_PASSWORD;
    const previousPgPassword = process.env.PGPASSWORD;

    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.POSTGRES_PRISMA_URL;
    process.env.DB_PASSWORD = '';
    delete process.env.PGPASSWORD;

    try {
      expect(() => resolveDatabaseConnectionConfig({
        host: 'localhost',
        dbName: 'stockpilot',
        dbUser: 'postgres'
      })).toThrow(/Missing database password/);
    } finally {
      if (previousDatabaseUrl) process.env.DATABASE_URL = previousDatabaseUrl;
      if (previousPostgresUrl) process.env.POSTGRES_URL = previousPostgresUrl;
      if (previousPrismaUrl) process.env.POSTGRES_PRISMA_URL = previousPrismaUrl;
      if (previousDbPassword) process.env.DB_PASSWORD = previousDbPassword;
      if (previousPgPassword) process.env.PGPASSWORD = previousPgPassword;
    }
  });
});
