'use strict';
const crypto = require('crypto');
const { Op } = require('sequelize');

const DAY_MS = 24 * 60 * 60 * 1000;
const hashToken = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const newToken = randomBytes => randomBytes(32).toString('base64url');
const sameHash = (left, right) => {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
};

class AuthSessionError extends Error {
  constructor(code, status = 401) { super(code); this.name = 'AuthSessionError'; this.code = code; this.status = status; }
}

function sessionService({ AuthSession, sequelize = AuthSession?.sequelize, randomBytes = crypto.randomBytes, now = () => new Date() }) {
  if (!AuthSession) throw new Error('AuthSession model is required');

  const transact = callback => sequelize?.transaction ? sequelize.transaction(callback) : callback(null);
  const active = (session, current = now()) => Boolean(session && !session.revoked_at && new Date(session.expires_at) > current && new Date(session.idle_expires_at) > current);
  const validateCsrf = (session, csrfToken) => Boolean(csrfToken && session && sameHash(session.csrf_token_hash, hashToken(csrfToken)));
  const findByRefreshHash = (refreshHash, transaction) => AuthSession.findOne({
    where: { [Op.or]: [{ refresh_token_hash: refreshHash }, { previous_refresh_token_hash: refreshHash }] },
    ...(transaction ? { transaction, lock: transaction.LOCK?.UPDATE || true } : {})
  });

  return {
    async create(userId, { hardTtlMs = 7 * DAY_MS, idleTtlMs = DAY_MS } = {}) {
      if (!userId) throw new Error('userId is required');
      const createdAt = now();
      const refreshToken = newToken(randomBytes);
      const csrfToken = newToken(randomBytes);
      const expiresAt = new Date(createdAt.getTime() + hardTtlMs);
      const idleExpiresAt = new Date(Math.min(expiresAt.getTime(), createdAt.getTime() + idleTtlMs));
      const session = await AuthSession.create({
        user_id: userId,
        refresh_token_hash: hashToken(refreshToken),
        csrf_token_hash: hashToken(csrfToken),
        expires_at: expiresAt,
        idle_expires_at: idleExpiresAt,
        last_used_at: createdAt,
        created_at: createdAt,
        updated_at: createdAt
      });
      return { session, refreshToken, csrfToken };
    },

    async findActive(id, userId) {
      const session = await AuthSession.findByPk(id);
      return session?.user_id === userId && active(session) ? session : null;
    },

    validateCsrf(session, csrfToken) {
      return validateCsrf(session, csrfToken);
    },

    async rotate(refreshToken, csrfToken, { idleTtlMs = DAY_MS } = {}) {
      if (!refreshToken) throw new AuthSessionError('AUTH_REFRESH_REQUIRED');
      const refreshHash = hashToken(refreshToken);
      const result = await transact(async transaction => {
        const session = await findByRefreshHash(refreshHash, transaction);
        if (!session) throw new AuthSessionError('AUTH_REFRESH_INVALID');
        if (sameHash(session.previous_refresh_token_hash, refreshHash)) {
          await session.update({ revoked_at: now(), revoke_reason: 'refresh_replay', updated_at: now() }, { transaction });
          return { replayed: true };
        }
        if (!active(session)) throw new AuthSessionError('AUTH_SESSION_EXPIRED');
        if (!validateCsrf(session, csrfToken)) throw new AuthSessionError('CSRF_INVALID', 403);
        const usedAt = now();
        const nextRefreshToken = newToken(randomBytes);
        const nextCsrfToken = newToken(randomBytes);
        await session.update({
          previous_refresh_token_hash: session.refresh_token_hash,
          refresh_token_hash: hashToken(nextRefreshToken),
          csrf_token_hash: hashToken(nextCsrfToken),
          idle_expires_at: new Date(Math.min(new Date(session.expires_at).getTime(), usedAt.getTime() + idleTtlMs)),
          last_used_at: usedAt,
          updated_at: usedAt
        }, { transaction });
        return { session, refreshToken: nextRefreshToken, csrfToken: nextCsrfToken };
      });
      if (result.replayed) throw new AuthSessionError('AUTH_REFRESH_REPLAYED');
      return result;
    },

    async revoke(refreshToken, csrfToken, reason = 'logout') {
      if (!refreshToken) return false;
      const refreshHash = hashToken(refreshToken);
      return transact(async transaction => {
        const session = await findByRefreshHash(refreshHash, transaction);
        if (!session || session.revoked_at) return false;
        if (!validateCsrf(session, csrfToken)) throw new AuthSessionError('CSRF_INVALID', 403);
        const revokedAt = now();
        await session.update({ revoked_at: revokedAt, revoke_reason: reason, updated_at: revokedAt }, { transaction });
        return true;
      });
    }
  };
}

module.exports = { DAY_MS, AuthSessionError, hashToken, sameHash, sessionService };
