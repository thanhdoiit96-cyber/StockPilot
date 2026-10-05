export const SECTOR_OPTIONS = [
  ['', 'Tất cả ngành'],
  ['technology', 'Công nghệ'],
  ['banking_finance', 'Ngân hàng & tài chính'],
  ['securities', 'Chứng khoán'],
  ['real_estate', 'Bất động sản'],
  ['energy_resources', 'Tài nguyên & năng lượng'],
  ['manufacturing', 'Sản xuất công nghiệp'],
  ['consumer_retail', 'Tiêu dùng & bán lẻ'],
  ['construction_infrastructure', 'Xây dựng & hạ tầng'],
  ['other', 'Khác / chưa phân loại']
]

export const sectorLabel = value => SECTOR_OPTIONS.find(([key]) => key === value)?.[1] || null
