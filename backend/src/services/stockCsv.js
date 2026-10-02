const csvCell = value => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  const safe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${safe.replace(/"/g, '""')}"`;
};

const formatNumber = value => value == null || !Number.isFinite(Number(value)) ? '' : String(Number(value));

const serializeStockCsv = (rows, columns = {}) => {
  const selected = [
    { label: 'Mã', value: row => row.code },
    ...(columns.name === false ? [] : [{ label: 'Tên', value: row => row.name }]),
    { label: 'Giá EOD', value: row => formatNumber(row.price) },
    ...(columns.volume === false ? [] : [{ label: 'Khối lượng', value: row => formatNumber(row.volume) }]),
    { label: 'Nguồn dữ liệu', value: row => row.data_source || 'EOD gần nhất' }
  ];
  const records = [
    selected.map(column => csvCell(column.label)).join(','),
    ...rows.map(row => selected.map(column => csvCell(column.value(row))).join(','))
  ];
  return `\uFEFF${records.join('\r\n')}\r\n`;
};

module.exports = { csvCell, serializeStockCsv };
