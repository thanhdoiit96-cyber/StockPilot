const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

export function matchesSearch(values, query) {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const text = normalize(values.join(' '))
  return terms.every(term => text.includes(term))
}

export function filterPositions(positions, query) {
  return positions.filter(position => matchesSearch([position.symbol, position.name], query))
}
