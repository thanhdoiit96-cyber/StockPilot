// Development-only synthetic index series. Never present as production market data.
const INTRADAY_TIMES = ['09:15', '10:00', '11:00', '13:15', '14:00', '14:45']
const intradayPoints = (close, offsets) => Object.freeze(offsets.map((offset, index) => ({ observed_at: `2026-10-06T${INTRADAY_TIMES[index]}:00+07:00`, close: close + offset })))

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
  ]),
  intraday_points: intradayPoints(1275, [-8, -5, -7, -2, 1, 0])
})

const fixture = (symbol, closes, intradayOffsets) => Object.freeze({ ...INDEX_SERIES_FIXTURE, symbol, points: Object.freeze(closes.map((close, index) => ({ session_date: INDEX_SERIES_FIXTURE.points[index].session_date, close }))), intraday_points: intradayPoints(closes.at(-1), intradayOffsets) })

export const INDEX_SERIES_FIXTURES = Object.freeze([
  INDEX_SERIES_FIXTURE,
  fixture('VN30', [1280, 1287, 1283, 1291], [-5, -2, -6, -3, 2, 0]),
  fixture('HNXINDEX', [238, 240, 239, 241], [-2, 0, -1, 1, 2, 0]),
  fixture('HNX30', [512, 516, 514, 519], [-4, -1, -3, 2, 3, 0])
])

export const indexSeriesFixtureLabel = series => series?.provider === 'fixture' ? series.label : ''
