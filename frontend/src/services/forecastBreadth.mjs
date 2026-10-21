const classes = ['advancing', 'balanced', 'declining']

export const forecastBreadthTarget = Object.freeze({
  version: 'breadth_forward_v1',
  unit: 'share_of_members_with_positive_return',
  point_estimate_available: false,
  bands: Object.freeze([
    Object.freeze({ class: 'declining', minimum: 0, maximum: 0.45, minimum_inclusive: true, maximum_inclusive: false }),
    Object.freeze({ class: 'balanced', minimum: 0.45, maximum: 0.55, minimum_inclusive: true, maximum_inclusive: true }),
    Object.freeze({ class: 'advancing', minimum: 0.55, maximum: 1, minimum_inclusive: false, maximum_inclusive: true })
  ])
})

export function isForecastBreadthTarget(value) {
  return value?.version === forecastBreadthTarget.version && value?.unit === forecastBreadthTarget.unit && value?.point_estimate_available === false
    && Array.isArray(value?.bands) && value.bands.length === forecastBreadthTarget.bands.length
    && forecastBreadthTarget.bands.every(expected => value.bands.some(band => band?.class === expected.class && band.minimum === expected.minimum && band.maximum === expected.maximum && band.minimum_inclusive === expected.minimum_inclusive && band.maximum_inclusive === expected.maximum_inclusive))
}

export function summarizeForecastBreadth(probabilities, target = forecastBreadthTarget) {
  if (!isForecastBreadthTarget(target) || !Array.isArray(probabilities)) return null
  const values = Object.fromEntries(probabilities.map(item => [item?.class, Number(item?.value)]))
  if (classes.some(name => !Number.isFinite(values[name]) || values[name] < 0 || values[name] > 1)) return null
  const scenario = classes.reduce((best, current) => values[current] > values[best] ? current : best, classes[0])
  return { scenario, probability: values[scenario], band: target.bands.find(item => item.class === scenario) }
}
