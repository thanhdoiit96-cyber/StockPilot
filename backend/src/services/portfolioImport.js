'use strict';

const MAX_IMPORT_ROWS = 500;
const MAX_VALUE = 1e15;

const issue = (row, field, message) => ({ row, field, message });

function parsePositiveDecimal(value, { allowZero = false } = {}) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  if (!Number.isFinite(number) || number > MAX_VALUE || (allowZero ? number < 0 : number <= 0)) return null;
  return number;
}

function normalizePortfolioImportRows(rawRows) {
  if (!Array.isArray(rawRows)) return { rows: [], errors: [issue(null, 'rows', 'Danh sách giao dịch không hợp lệ')] };
  if (!rawRows.length) return { rows: [], errors: [issue(null, 'rows', 'File không có giao dịch')] };
  if (rawRows.length > MAX_IMPORT_ROWS) return { rows: [], errors: [issue(null, 'rows', `Mỗi lần chỉ được nhập tối đa ${MAX_IMPORT_ROWS} giao dịch`)] };

  const rows = [];
  const errors = [];
  rawRows.forEach((raw, index) => {
    const rowNumber = Number.isInteger(Number(raw?.row_number)) && Number(raw.row_number) >= 2 ? Number(raw.row_number) : index + 2;
    const symbol = String(raw?.symbol || '').trim().toUpperCase();
    const side = String(raw?.side || '').trim().toUpperCase();
    const quantity = parsePositiveDecimal(raw?.quantity);
    const rawPrice = parsePositiveDecimal(raw?.price);
    const price = rawPrice != null && rawPrice < 1000 ? rawPrice * 1000 : rawPrice;
    const fees = parsePositiveDecimal(raw?.fees == null || raw.fees === '' ? 0 : raw.fees, { allowZero: true });
    const rawTradedAt = String(raw?.traded_at ?? '').trim();
    const tradedAt = rawTradedAt ? new Date(rawTradedAt) : new Date(Number.NaN);

    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) errors.push(issue(rowNumber, 'symbol', 'Mã cổ phiếu không hợp lệ'));
    if (!['BUY', 'SELL'].includes(side)) errors.push(issue(rowNumber, 'side', 'Loại giao dịch phải là BUY hoặc SELL'));
    if (quantity == null) errors.push(issue(rowNumber, 'quantity', 'Số lượng phải là số dương'));
    if (price == null || !Number.isFinite(price) || price > MAX_VALUE) errors.push(issue(rowNumber, 'price', 'Giá phải là số dương hợp lệ'));
    if (fees == null) errors.push(issue(rowNumber, 'fees', 'Phí phải là số không âm'));
    if (Number.isNaN(tradedAt.getTime())) errors.push(issue(rowNumber, 'traded_at', 'Thời điểm giao dịch không hợp lệ'));

    rows.push({ row_number: rowNumber, symbol, side, quantity, price, fees, traded_at: Number.isNaN(tradedAt.getTime()) ? null : tradedAt });
  });
  return { rows, errors };
}

const transactionKey = tx => [
  String(tx.stock_id),
  tx.side,
  Number(tx.quantity),
  Number(tx.price),
  Number(tx.fees || 0),
  new Date(tx.traded_at).toISOString()
].join('|');

function compareTransactions(left, right) {
  const traded = new Date(left.traded_at).getTime() - new Date(right.traded_at).getTime();
  if (traded) return traded;
  const created = new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();
  if (created) return created;
  return String(left.id || '').localeCompare(String(right.id || ''));
}

function validatePortfolioTimeline(transactions = []) {
  const errors = [];
  const byStock = new Map();
  for (const tx of transactions) {
    const stockId = String(tx.stock_id || '');
    const quantity = Number(tx.quantity);
    const tradedAt = new Date(tx.traded_at);
    if (!stockId || !['BUY', 'SELL'].includes(tx.side) || !Number.isFinite(quantity) || quantity <= 0 || Number.isNaN(tradedAt.getTime())) {
      errors.push({ stock_id: stockId || null, transaction_id: tx.id || null, message: 'Ledger có giao dịch không hợp lệ' });
      continue;
    }
    if (!byStock.has(stockId)) byStock.set(stockId, []);
    byStock.get(stockId).push(tx);
  }
  for (const [stockId, rows] of byStock) {
    let position = 0;
    for (const tx of [...rows].sort(compareTransactions)) {
      position += tx.side === 'BUY' ? Number(tx.quantity) : -Number(tx.quantity);
      if (position < -1e-8) {
        errors.push({
          stock_id: stockId,
          transaction_id: tx.id || null,
          message: 'Số lượng bán vượt vị thế tại thời điểm giao dịch'
        });
        break;
      }
    }
  }
  return errors;
}

function validatePortfolioImport({ rows, stocks = [], existingTransactions = [], now = Date.now() }) {
  const errors = [];
  const stockByCode = new Map(stocks.map(stock => [String(stock.code || '').toUpperCase(), stock]));
  const prepared = [];

  for (const row of rows) {
    const stock = stockByCode.get(row.symbol);
    if (!stock) {
      errors.push(issue(row.row_number, 'symbol', `Không tìm thấy mã ${row.symbol}`));
      continue;
    }
    prepared.push({ ...row, stock_id: stock.id, created_at: new Date(now + prepared.length) });
  }

  const known = new Set();
  for (const tx of existingTransactions) {
    try { known.add(transactionKey(tx)); } catch (_) {}
  }
  for (const row of prepared) {
    const key = transactionKey(row);
    if (known.has(key)) errors.push(issue(row.row_number, 'row', 'Giao dịch trùng với ledger hiện có hoặc một dòng trước trong file'));
    known.add(key);
  }

  const importedByStock = new Map();
  for (const row of prepared) {
    if (!importedByStock.has(String(row.stock_id))) importedByStock.set(String(row.stock_id), []);
    importedByStock.get(String(row.stock_id)).push(row);
  }
  const allByStock = new Map();
  for (const tx of existingTransactions) {
    const key = String(tx.stock_id);
    if (!allByStock.has(key)) allByStock.set(key, []);
    allByStock.get(key).push({ ...tx, imported: false });
  }
  for (const row of prepared) {
    const key = String(row.stock_id);
    if (!allByStock.has(key)) allByStock.set(key, []);
    allByStock.get(key).push({ ...row, imported: true });
  }

  for (const [stockId, transactions] of allByStock) {
    transactions.sort(compareTransactions);
    let quantity = 0;
    let existingTimelineInvalid = false;
    for (const tx of transactions) {
      const amount = Number(tx.quantity || 0);
      quantity += tx.side === 'BUY' ? amount : -amount;
      if (quantity < -1e-8) {
        if (tx.imported) errors.push(issue(tx.row_number, 'quantity', 'Số lượng bán vượt vị thế tại thời điểm giao dịch'));
        else existingTimelineInvalid = true;
      }
    }
    if (existingTimelineInvalid) {
      for (const row of importedByStock.get(stockId) || []) errors.push(issue(row.row_number, 'quantity', 'Ledger hiện tại của mã này có timeline âm; cần sửa dữ liệu trước khi import'));
    }
  }

  const uniqueErrors = [...new Map(errors.map(error => [`${error.row}|${error.field}|${error.message}`, error])).values()]
    .sort((left, right) => Number(left.row || 0) - Number(right.row || 0) || left.field.localeCompare(right.field));
  return { rows: prepared, errors: uniqueErrors };
}

module.exports = { MAX_IMPORT_ROWS, normalizePortfolioImportRows, validatePortfolioImport, validatePortfolioTimeline };
