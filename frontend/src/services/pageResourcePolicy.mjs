const PAGE_RESOURCES = Object.freeze({
  overview: ['stocks', 'latestRecommendations'],
  'market-board': [],
  portfolio: [],
  detail: ['stocks', 'detail'],
  recommendations: ['latestRecommendations', 'recommendationHistory'],
  advisor: ['stocks', 'aiGate']
})

export const resourcesForView = view => new Set(PAGE_RESOURCES[view] || PAGE_RESOURCES.overview)

export const viewNeedsResource = (view, resource) => resourcesForView(view).has(resource)
