const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

export function filterPositions(positions, query) {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  return positions.filter(position => {
    const text = normalize(`${position.symbol ?? ''} ${position.name ?? ''}`)
    return terms.every(term => text.includes(term))
  })
}
