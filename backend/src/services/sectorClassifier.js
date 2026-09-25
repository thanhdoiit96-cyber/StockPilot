'use strict';

// These patterns are deliberately applied only to an explicit provider industry
// value. Company names are not used as a proxy for sector, which would create
// silent false positives (for example, a bank holding company name).
const SECTOR_INDUSTRY_PATTERNS = {
  banking_finance: /ng[aâ]n\s*h[aà]ng|bank|t[aà]i\s*ch[ií]nh|financial|b[aả]o\s*hi[eể]m|insurance/i,
  securities: /ch[uứ]ng\s*kho[aá]n|securit|broker/i,
  real_estate: /b[aấ]t\s*[đd][ộo]ng\s*s[aả]n|real\s*estate|property/i,
  energy_resources: /d[aầ]u\s*kh[ií]|oil|gas|energy|n[aă]ng\s*l[uượ]ng|khai\s*kho[aá]ng|mining|[đd]i[eệ]n|than/i,
  manufacturing: /s[aả]n\s*xu[aấ]t|manufactur|th[eé]p|steel|h[oó]a\s*ch[aấ]t|chemical|cao\s*su|nh[uự]a|xi\s*m[aă]ng|cement/i,
  consumer_retail: /b[aá]n\s*l[eẻ]|retail|th[uự]c\s*ph[aẩ]m|food|[đd][ồo]\s*u[uố]ng|beverage|d[eệ]t\s*may|consumer/i,
  technology: /c[oô]ng\s*ngh[eệ]|technolog|software|vi[eễ]n\s*th[oô]ng|telecom/i,
  construction_infrastructure: /x[aâ]y\s*d[uự]ng|construction|h[aạ]\s*t[aầ]ng|infrastructure|v[aậ]t\s*li[eệ]u\s*x[aâ]y\s*d[uự]ng/i
};
const SECTOR_INDUSTRY_LIKE = {
  banking_finance: ['%ngân hàng%', '%bank%', '%tài chính%', '%financial%', '%bảo hiểm%', '%insurance%'],
  securities: ['%chứng khoán%', '%securit%', '%broker%'],
  real_estate: ['%bất động sản%', '%real estate%', '%property%'],
  energy_resources: ['%dầu khí%', '%oil%', '%gas%', '%energy%', '%năng lượng%', '%khai khoáng%', '%mining%', '%điện%', '%than%'],
  manufacturing: ['%sản xuất%', '%manufactur%', '%thép%', '%steel%', '%hóa chất%', '%chemical%', '%cao su%', '%nhựa%', '%xi măng%', '%cement%'],
  consumer_retail: ['%bán lẻ%', '%retail%', '%thực phẩm%', '%food%', '%đồ uống%', '%beverage%', '%dệt may%', '%consumer%'],
  technology: ['%công nghệ%', '%technolog%', '%software%', '%viễn thông%', '%telecom%'],
  construction_infrastructure: ['%xây dựng%', '%construction%', '%hạ tầng%', '%infrastructure%', '%vật liệu xây dựng%']
};

function sectorFromIndustry(industry) {
  const value = String(industry || '').trim();
  if (!value) return null;
  return Object.entries(SECTOR_INDUSTRY_PATTERNS).find(([, pattern]) => pattern.test(value))?.[0] || null;
}

function industryCondition(Op, sector) {
  const patterns = SECTOR_INDUSTRY_LIKE[sector];
  return patterns ? { [Op.or]: patterns.map(pattern => ({ industry: { [Op.iLike]: pattern } })) } : null;
}

module.exports = { SECTOR_INDUSTRY_PATTERNS, SECTOR_INDUSTRY_LIKE, sectorFromIndustry, industryCondition };
