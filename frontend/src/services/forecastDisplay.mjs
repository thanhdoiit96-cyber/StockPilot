const outcomeTones = Object.freeze({ advancing: 'advance', balanced: 'balanced', declining: 'decline' })

export function roundedForecastPercent(value) {
  if (value == null || value === '') return null
  const percent = Number(value) * 100
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? Math.round(percent * 10) / 10 : null
}

export function formatForecastPercent(value, locale = 'en-US') {
  const rounded = roundedForecastPercent(value)
  return rounded == null ? null : rounded.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export function forecastOutcomeTone(className) {
  return outcomeTones[className] || null
}
