export function savedSnapshotLabel(snapshot, language = 'vi') {
  const en = language === 'en'
  const raw = snapshot?.createdAt || snapshot?.created_at
  const date = raw && Number.isFinite(Date.parse(raw))
    ? new Intl.DateTimeFormat(en ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(raw))
    : en ? 'Time unavailable' : 'Chưa có thời điểm'
  const count = Array.isArray(snapshot?.result?.recommendations) ? snapshot.result.recommendations.length : 0
  return `${date} · ${count} ${en ? 'symbols' : 'mã'}`
}
