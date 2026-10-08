'use strict';
const { MAX_NOTE_LENGTH, normalizeWatchlistMetadata } = require('./watchlistMetadata');

test('normalizes user-owned Watchlist metadata', () => {
  expect(normalizeWatchlistMetadata({ status: 'researching', note: '  Đọc báo cáo quý  ' })).toEqual({ status: 'RESEARCHING', note: 'Đọc báo cáo quý' });
  expect(normalizeWatchlistMetadata({ status: 'WATCHING', note: '   ' })).toEqual({ status: 'WATCHING', note: null });
});

test('rejects unsupported status and oversized notes', () => {
  expect(() => normalizeWatchlistMetadata({ status: 'BUY' })).toThrow('Trạng thái Watchlist không hợp lệ');
  expect(() => normalizeWatchlistMetadata({ note: 'x'.repeat(MAX_NOTE_LENGTH + 1) })).toThrow(`Ghi chú không được vượt quá ${MAX_NOTE_LENGTH} ký tự`);
});
