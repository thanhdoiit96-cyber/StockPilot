const boundedPercent = value => Math.max(0, Math.min(100, Number(value) || 0))

/**
 * Maps a scenario probability to a semantic RAG tone.
 * A low probability of broad decline is positive, so its scale is inverted.
 */
export function forecastRagTone(scenario, probability) {
  const value = boundedPercent(probability)
  if (scenario === 'advance') return value >= 60 ? 'green' : value >= 40 ? 'amber' : 'red'
  if (scenario === 'decline') return value >= 40 ? 'red' : value >= 20 ? 'amber' : 'green'
  return 'amber'
}
