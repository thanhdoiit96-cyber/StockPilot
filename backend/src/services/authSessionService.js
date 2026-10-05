'use strict';
const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;
const hashToken = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const newToken = randomBytes => randomBytes(32).toString('base64url');

function sessionService({ AuthSession, randomBytes = crypto.randomBytes, now = () => new Date() }) {
  if (!AuthSession) throw new Error('AuthSession model is required');

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
      const current = now();
      if (!session || session.user_id !== userId || session.revoked_at) return null;
      if (new Date(session.expires_at) <= current || new Date(session.idle_expires_at) <= current) return null;
      return session;
    }
  };
}

module.exports = { DAY_MS, hashToken, sessionService };
