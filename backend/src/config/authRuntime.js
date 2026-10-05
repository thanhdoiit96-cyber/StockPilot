'use strict';

const DEFAULT_SECRETS = new Set(['development-only-change-me', 'your_jwt_secret_key_here_change_in_production', 'your_jwt_secret_key_change_in_production']);
const EXPOSED_HEADERS = ['Content-Disposition', 'X-Export-Count', 'X-Export-Limit', 'X-Export-Truncated'];

function parseAllowedOrigins(value = '') {
  return [...new Set(String(value).split(',').map(item => item.trim()).filter(Boolean).map(item => {
    if (item === '*') throw new Error('CORS_ORIGIN cannot contain wildcard when cookie authentication is enabled');
    const url = new URL(item);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== item.replace(/\/$/, '')) throw new Error(`CORS_ORIGIN must contain exact HTTP(S) origins: ${item}`);
    return url.origin;
  }))];
}

function assertSecureAuthConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const secret = String(env.JWT_SECRET || '');
  if (secret.length < 32 || DEFAULT_SECRETS.has(secret)) throw new Error('Production JWT_SECRET must be a non-default secret of at least 32 characters');
  const origins = parseAllowedOrigins(env.CORS_ORIGIN);
  if (!origins.length) throw new Error('Production CORS_ORIGIN must explicitly list the browser origin');
  if (origins.some(origin => new URL(origin).protocol !== 'https:')) throw new Error('Production CORS_ORIGIN entries must use HTTPS');
}

function buildCorsOptions(env = process.env) {
  const allowed = parseAllowedOrigins(env.CORS_ORIGIN);
  if (!allowed.length) return { origin: '*', credentials: false, exposedHeaders: EXPOSED_HEADERS };
  return {
    credentials: true,
    exposedHeaders: EXPOSED_HEADERS,
    origin(origin, callback) {
      if (!origin || allowed.includes(origin)) return callback(null, true);
      const error = new Error('Origin is not allowed by CORS policy');
      error.status = 403;
      return callback(error);
    }
  };
}

module.exports = { DEFAULT_SECRETS, EXPOSED_HEADERS, parseAllowedOrigins, assertSecureAuthConfig, buildCorsOptions };
