require('dotenv').config();

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function firstNonEmptyString(...values) {
  for (const value of values) {
    const text = normalizeString(value);
    if (text) return text;
  }
  return '';
}

function buildSequelizeOptions({ databaseUrl, host, dbHost } = {}) {
  const explicitTarget = firstNonEmptyString(databaseUrl, host, dbHost);
  const target = firstNonEmptyString(explicitTarget, process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL);
  const mustUseSsl = /(sslmode=require|neon\.tech|supabase\.co)/i.test(target);

  if (!mustUseSsl) return {};

  return {
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  };
}

function resolveDatabaseConnectionConfig({ databaseUrl, host, dbHost, dbName, dbUser, dbPassword } = {}) {
  const effectiveDatabaseUrl = firstNonEmptyString(databaseUrl, process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL);

  if (effectiveDatabaseUrl) {
    try {
      const parsedUrl = new URL(effectiveDatabaseUrl);
      const password = firstNonEmptyString(parsedUrl.password, process.env.DB_PASSWORD, process.env.PGPASSWORD);
      if (!password) throw new Error('Missing database password in DATABASE_URL or DB_PASSWORD.');
      return {
        databaseUrl: effectiveDatabaseUrl,
        host: parsedUrl.hostname || normalizeString(host || dbHost || process.env.DB_HOST),
        port: Number(parsedUrl.port || process.env.DB_PORT || 5432),
        username: normalizeString(parsedUrl.username || dbUser || process.env.DB_USER),
        password,
        database: normalizeString(parsedUrl.pathname.replace(/^\/+/, '') || dbName || process.env.DB_NAME)
      };
    } catch (error) {
      if (error instanceof TypeError && !effectiveDatabaseUrl.startsWith('postgres')) {
        throw new Error(`Invalid database URL format: ${effectiveDatabaseUrl}`);
      }
      throw error;
    }
  }

  const fallbackPassword = firstNonEmptyString(dbPassword, process.env.DB_PASSWORD, process.env.PGPASSWORD);
  if (!fallbackPassword) {
    throw new Error('Missing database password. Set DATABASE_URL or DB_PASSWORD to a non-empty string in the backend Vercel environment.');
  }

  return {
    databaseUrl: '',
    host: normalizeString(host || dbHost || process.env.DB_HOST),
    port: Number(process.env.DB_PORT || 5432),
    username: normalizeString(dbUser || process.env.DB_USER),
    password: fallbackPassword,
    database: normalizeString(dbName || process.env.DB_NAME)
  };
}

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + '_test',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  },
  buildSequelizeOptions,
  resolveDatabaseConnectionConfig
};
