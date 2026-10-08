'use strict';

const STATUSES = Object.freeze(['WATCHING', 'RESEARCHING', 'PAUSED']);
const MAX_NOTE_LENGTH = 280;

function normalizeWatchlistMetadata(input = {}) {
  const status = String(input.status || 'WATCHING').trim().toUpperCase();
  const note = String(input.note || '').trim();
  if (!STATUSES.includes(status)) {
    const error = new Error('Trạng thái Watchlist không hợp lệ');
    error.code = 'WATCHLIST_STATUS_INVALID';
    throw error;
  }
  if (note.length > MAX_NOTE_LENGTH) {
    const error = new Error(`Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`);
    error.code = 'WATCHLIST_NOTE_TOO_LONG';
    throw error;
  }
  return { status, note: note || null };
}

module.exports = { MAX_NOTE_LENGTH, STATUSES, normalizeWatchlistMetadata };
