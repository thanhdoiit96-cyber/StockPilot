'use strict';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function readCursor(value) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid cursor');
  const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  if (!cursor || !uuid.test(cursor.id) || typeof cursor.created_at !== 'string' || !Number.isFinite(Date.parse(cursor.created_at)) ||
      new Date(cursor.created_at).toISOString() !== cursor.created_at) throw new Error('Invalid cursor');
  return { id: cursor.id, created_at: new Date(cursor.created_at) };
}
function writeCursor(row) {
  return Buffer.from(JSON.stringify({ id: row.id, created_at: new Date(row.created_at).toISOString() })).toString('base64url');
}
module.exports = { readCursor, writeCursor };
