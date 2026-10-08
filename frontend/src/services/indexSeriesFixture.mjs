// Development-only synthetic index series. Never present as production market data.
export const INDEX_SERIES_FIXTURE = Object.freeze({
  symbol: 'VNINDEX',
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

const fixture = (symbol, closes) => Object.freeze({ ...INDEX_SERIES_FIXTURE, symbol, points: Object.freeze(closes.map((close, index) => ({ session_date: INDEX_SERIES_FIXTURE.points[index].session_date, close }))) })

export const INDEX_SERIES_FIXTURES = Object.freeze([
  INDEX_SERIES_FIXTURE,
  fixture('VN30', [1280, 1287, 1283, 1291]),
  fixture('HNXINDEX', [238, 240, 239, 241]),
  fixture('HNX30', [512, 516, 514, 519])
])

export const indexSeriesFixtureLabel = series => series?.provider === 'fixture' ? series.label : ''
