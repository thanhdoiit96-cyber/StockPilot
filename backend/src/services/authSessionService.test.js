const { DAY_MS, hashToken, sessionService } = require('./authSessionService');

describe('authSessionService', () => {
  const instant = new Date('2026-10-05T03:00:00.000Z');
  const randomBytes = jest.fn()
    .mockReturnValueOnce(Buffer.alloc(32, 1))
    .mockReturnValueOnce(Buffer.alloc(32, 2));

  test('creates hashed refresh and csrf credentials with bounded expiries', async () => {
    const AuthSession = { create: jest.fn(async value => ({ id: 'session-a', ...value })) };
    const service = sessionService({ AuthSession, randomBytes, now: () => instant });
    const result = await service.create('user-a');

    expect(result.refreshToken).not.toBe(result.csrfToken);
    expect(AuthSession.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-a',
      refresh_token_hash: hashToken(result.refreshToken),
      csrf_token_hash: hashToken(result.csrfToken),
      expires_at: new Date(instant.getTime() + 7 * DAY_MS),
      idle_expires_at: new Date(instant.getTime() + DAY_MS)
    }));
    expect(JSON.stringify(AuthSession.create.mock.calls[0][0])).not.toContain(result.refreshToken);
    expect(JSON.stringify(AuthSession.create.mock.calls[0][0])).not.toContain(result.csrfToken);
  });

  test('finds only owned, unrevoked and unexpired sessions', async () => {
    const active = { id: 's', user_id: 'u', expires_at: new Date(instant.getTime() + 1000), idle_expires_at: new Date(instant.getTime() + 1000), revoked_at: null };
    const AuthSession = { create: jest.fn(), findByPk: jest.fn() };
    const service = sessionService({ AuthSession, now: () => instant });
    AuthSession.findByPk.mockResolvedValueOnce(active);
    await expect(service.findActive('s', 'u')).resolves.toBe(active);
    for (const invalid of [null, { ...active, user_id: 'other' }, { ...active, revoked_at: instant }, { ...active, expires_at: instant }, { ...active, idle_expires_at: instant }]) {
      AuthSession.findByPk.mockResolvedValueOnce(invalid);
      await expect(service.findActive('s', 'u')).resolves.toBeNull();
    }
  });

  test('rotates refresh and csrf hashes and revokes the session when the previous token is replayed', async () => {
    const initialRefresh = Buffer.alloc(32, 3).toString('base64url');
    const csrf = Buffer.alloc(32, 4).toString('base64url');
    const session = {
      user_id: 'u', refresh_token_hash: hashToken(initialRefresh), previous_refresh_token_hash: null,
      csrf_token_hash: hashToken(csrf), expires_at: new Date(instant.getTime() + DAY_MS),
      idle_expires_at: new Date(instant.getTime() + DAY_MS), revoked_at: null,
      update: jest.fn(async function (values) { Object.assign(this, values); })
    };
    const AuthSession = { findOne: jest.fn().mockResolvedValue(session) };
    const bytes = jest.fn().mockReturnValueOnce(Buffer.alloc(32, 5)).mockReturnValueOnce(Buffer.alloc(32, 6));
    const service = sessionService({ AuthSession, randomBytes: bytes, now: () => instant });

    const rotated = await service.rotate(initialRefresh, csrf);
    expect(session.previous_refresh_token_hash).toBe(hashToken(initialRefresh));
    expect(session.refresh_token_hash).toBe(hashToken(rotated.refreshToken));
    expect(session.csrf_token_hash).toBe(hashToken(rotated.csrfToken));

    await expect(service.rotate(initialRefresh, csrf)).rejects.toMatchObject({ code: 'AUTH_REFRESH_REPLAYED', status: 401 });
    expect(session).toMatchObject({ revoked_at: instant, revoke_reason: 'refresh_replay' });
  });

  test('rejects csrf mismatch and revokes logout idempotently', async () => {
    const refresh = 'refresh';
    const csrf = 'csrf';
    const session = {
      refresh_token_hash: hashToken(refresh), csrf_token_hash: hashToken(csrf), revoked_at: null,
      expires_at: new Date(instant.getTime() + DAY_MS), idle_expires_at: new Date(instant.getTime() + DAY_MS),
      update: jest.fn(async function (values) { Object.assign(this, values); })
    };
    const AuthSession = { findOne: jest.fn().mockResolvedValue(session) };
    const service = sessionService({ AuthSession, now: () => instant });
    await expect(service.rotate(refresh, 'wrong')).rejects.toMatchObject({ code: 'CSRF_INVALID', status: 403 });
    await expect(service.revoke(refresh, csrf)).resolves.toBe(true);
    await expect(service.revoke(refresh, csrf)).resolves.toBe(false);
  });
});
