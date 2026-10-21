const outcomeTones = Object.freeze({ advancing: 'advance', balanced: 'balanced', declining: 'decline' })

export function roundedForecastPercent(value) {
  if (value == null || value === '') return null
  const percent = Number(value) * 100
  return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? Math.round(percent * 10) / 10 : null
}

export function forecastOutcomeTone(className) {
  return outcomeTones[className] || null
}
