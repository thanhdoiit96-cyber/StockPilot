'use strict';

const SECTOR_CODES = {
  banking_finance: ['VCB','BID','CTG','TCB','MBB','ACB','VPB','STB','SHB','TPB','EIB','HDB','VIB','OCB','LPB','MSB','SSB','NAB','VAB','BVB','ABB','PGB'],
  securities: ['SSI','VND','HCM','VCI','VIX','SHS','VDS','FTS','CTS','BSI','ORS','AAS'],
  real_estate: ['VHM','VIC','VRE','NVL','PDR','KDH','NLG','DIG','DXG','CEO','KBC','BCM','SZC','SIP','LHG','TCH'],
  energy_resources: ['GAS','PLX','POW','PVS','PVD','BSR','DCM','DPM','QNS','SBT'],
  manufacturing: ['HPG','GVR','REE','BMP','HSG','NKG','TLH','VGC','GEX','PC1','DGC','PAN','KSB'],
  consumer_retail: ['VNM','MSN','SAB','MWG','FRT','PNJ','DGW','PET','VTP','DBC'],
  technology: ['FPT','CMG','ELC','VGI','ICT'],
  construction_infrastructure: ['VCG','HUT','C4G','HHV','CII','CTD','HBC','IDI','ANV','VHC','ASM','FMC']
};

const SECTOR_LABELS = {
  banking_finance: 'Ngân hàng & tài chính', securities: 'Chứng khoán', real_estate: 'Bất động sản',
  energy_resources: 'Tài nguyên & năng lượng', manufacturing: 'Sản xuất công nghiệp', consumer_retail: 'Tiêu dùng & bán lẻ',
  technology: 'Công nghệ', construction_infrastructure: 'Xây dựng & hạ tầng'
};

const CLASSIFIED_CODES = [...new Set(Object.values(SECTOR_CODES).flat())];
const sectorForCode = code => Object.entries(SECTOR_CODES).find(([, codes]) => codes.includes(String(code || '').toUpperCase()))?.[0] || null;

module.exports = { SECTOR_CODES, SECTOR_LABELS, CLASSIFIED_CODES, sectorForCode };
