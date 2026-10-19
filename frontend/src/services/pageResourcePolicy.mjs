const PAGE_RESOURCES = Object.freeze({
  overview: ['stocks', 'latestRecommendations'],
  'market-board': [],
  portfolio: [],
  detail: ['stocks', 'detail'],
  recommendations: [],
  advisor: ['stocks']
})

export const resourcesForView = view => new Set(PAGE_RESOURCES[view] || PAGE_RESOURCES.overview)

export const viewNeedsResource = (view, resource) => resourcesForView(view).has(resource)
