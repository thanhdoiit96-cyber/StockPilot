// Development-only synthetic index series. Never present as production market data.
export const INDEX_SERIES_FIXTURE = Object.freeze({
  provider: 'fixture',
  label: 'Dữ liệu mô phỏng (development)',
  return_type: 'price_return',
  session_timezone: 'Asia/Ho_Chi_Minh',
  continuity: 'continuous',
  points: Object.freeze([
    { session_date: '2026-10-01', close: 1260 },
    { session_date: '2026-10-02', close: 1268 },
    { session_date: '2026-10-05', close: 1264 },
    { session_date: '2026-10-06', close: 1275 }
  ])
})

export const indexSeriesFixtureLabel = series => series?.provider === 'fixture' ? series.label : ''
