'use strict';

function cookieNames(env = process.env.NODE_ENV) {
  const production = env === 'production';
  return {
    access: production ? '__Host-sp_access' : 'sp_access_dev',
    refresh: production ? '__Host-sp_refresh' : 'sp_refresh_dev',
    csrf: 'sp_csrf'
  };
}

function parseCookies(header = '') {
  return String(header).split(';').reduce((cookies, part) => {
    const separator = part.indexOf('=');
    if (separator < 1) return cookies;
    const key = part.slice(0, separator).trim();
    try { cookies[key] = decodeURIComponent(part.slice(separator + 1).trim()); } catch {
      // Ignore malformed cookie encoding and continue parsing the remaining cookies.
    }
    return cookies;
  }, {});
}

function cookieOptions({ httpOnly = true, maxAge } = {}) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(Number.isFinite(maxAge) ? { maxAge } : {})
  };
}

function setSessionCookies(res, { accessToken, refreshToken, csrfToken, accessMaxAge = 15 * 60 * 1000, refreshMaxAge = 7 * 24 * 60 * 60 * 1000 }) {
  const names = cookieNames();
  res.cookie(names.access, accessToken, cookieOptions({ maxAge: accessMaxAge }));
  res.cookie(names.refresh, refreshToken, cookieOptions({ maxAge: refreshMaxAge }));
  res.cookie(names.csrf, csrfToken, cookieOptions({ httpOnly: false, maxAge: refreshMaxAge }));
}

function clearSessionCookies(res) {
  const names = cookieNames();
  res.clearCookie(names.access, cookieOptions());
  res.clearCookie(names.refresh, cookieOptions());
  res.clearCookie(names.csrf, cookieOptions({ httpOnly: false }));
}

module.exports = { cookieNames, parseCookies, cookieOptions, setSessionCookies, clearSessionCookies };
