const symbolOf = item => item?.symbol || item?.stock?.code || ''

export function compareRecommendationSnapshots(baseSnapshot, targetSnapshot) {
  const baseItems = baseSnapshot?.result?.recommendations || []
  const targetItems = targetSnapshot?.result?.recommendations || []
  const baseBySymbol = new Map(baseItems.map(item => [symbolOf(item), item]).filter(([symbol]) => symbol))
  const targetBySymbol = new Map(targetItems.map(item => [symbolOf(item), item]).filter(([symbol]) => symbol))
  const symbols = [...new Set([...baseBySymbol.keys(), ...targetBySymbol.keys()])].sort((left, right) => {
    const leftRank = Number(targetBySymbol.get(left)?.rank ?? baseBySymbol.get(left)?.rank ?? Number.MAX_SAFE_INTEGER)
    const rightRank = Number(targetBySymbol.get(right)?.rank ?? baseBySymbol.get(right)?.rank ?? Number.MAX_SAFE_INTEGER)
    return leftRank - rightRank || left.localeCompare(right)
  })
  const rows = symbols.map(symbol => {
    const base = baseBySymbol.get(symbol)
    const target = targetBySymbol.get(symbol)
    const status = !base ? 'added' : !target ? 'removed' : 'retained'
    const baseRank = base ? Number(base.rank) : null
    const targetRank = target ? Number(target.rank) : null
    const baseScore = base ? Number(base.score) : null
    const targetScore = target ? Number(target.score) : null
    return {
      symbol,
      status,
      baseRank: Number.isFinite(baseRank) ? baseRank : null,
      targetRank: Number.isFinite(targetRank) ? targetRank : null,
      rankDelta: Number.isFinite(baseRank) && Number.isFinite(targetRank) ? baseRank - targetRank : null,
      baseScore: Number.isFinite(baseScore) ? baseScore : null,
      targetScore: Number.isFinite(targetScore) ? targetScore : null,
      scoreDelta: Number.isFinite(baseScore) && Number.isFinite(targetScore) ? targetScore - baseScore : null
    }
  })
  const criteriaKeys = [...new Set([
    ...Object.keys(baseSnapshot?.criteria || {}),
    ...Object.keys(targetSnapshot?.criteria || {})
  ])]
  return {
    rows,
    added: rows.filter(row => row.status === 'added').length,
    removed: rows.filter(row => row.status === 'removed').length,
    retained: rows.filter(row => row.status === 'retained').length,
    criteria: criteriaKeys.map(key => ({
      key,
      base: Number(baseSnapshot?.criteria?.[key] || 0),
      target: Number(targetSnapshot?.criteria?.[key] || 0),
      delta: Number(targetSnapshot?.criteria?.[key] || 0) - Number(baseSnapshot?.criteria?.[key] || 0)
    })).filter(item => item.delta !== 0)
  }
}
