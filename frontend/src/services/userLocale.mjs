export const DEFAULT_LANGUAGE = 'vi'
export const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const localeFor = language => language === 'en' ? 'en-US' : 'vi-VN'
export const timezoneFor = timezone => ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'UTC'].includes(timezone) ? timezone : DEFAULT_TIMEZONE

export function formatNumber(value, language = DEFAULT_LANGUAGE, options = {}) {
  return new Intl.NumberFormat(localeFor(language), options).format(Number(value || 0))
}
export function formatMoney(value, language = DEFAULT_LANGUAGE, options = {}) {
  return new Intl.NumberFormat(localeFor(language), { style: 'currency', currency: 'VND', maximumFractionDigits: 0, ...options }).format(Number(value || 0))
}
export function formatDateTime(value, language = DEFAULT_LANGUAGE, timezone = DEFAULT_TIMEZONE, options = {}) {
  const date = new Date(value)
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'short', timeStyle: 'short', timeZone: timezoneFor(timezone), ...options }).format(date) : '—'
}
export function formatDateOnly(value, language = DEFAULT_LANGUAGE, options = {}) {
  const date = new Date(`${value}T12:00:00Z`)
  return value && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(localeFor(language), { timeZone: 'UTC', ...options }).format(date) : '—'
}
