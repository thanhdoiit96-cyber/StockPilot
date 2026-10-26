import { formatMoney } from '../services/userLocale.mjs'

export function purchaseExceedsCash(cash, draft) {
  if (draft?.side !== 'BUY') return false
  const rawPrice = Number(draft.price), price = rawPrice < 1000 ? rawPrice * 1000 : rawPrice
  const total = Number(draft.quantity) * price + Number(draft.fees || 0)
  return cash?.status !== 'available' || !Number.isFinite(cash.available_to_buy) || !Number.isFinite(total) || total > cash.available_to_buy || cash.available_to_buy <= 0
}

export default function PortfolioCashSummary({ cash, language = 'vi', onFunding, draft }) {
  const copy = (vi, en) => language === 'en' ? en : vi
  const money = value => Number.isFinite(value) ? formatMoney(value, language) : '—'
  const rawPrice = Number(draft?.price), price = rawPrice < 1000 ? rawPrice * 1000 : rawPrice
  const cost = draft?.side === 'BUY' && Number(draft.quantity) > 0 && price > 0 ? Number(draft.quantity) * price + Number(draft.fees || 0) : null
  return <section className="panel portfolio-cash-summary" aria-label={copy('Tiền mặt danh mục', 'Portfolio cash')}>
    <div><span className="eyebrow">{copy('Tiền mặt khả dụng theo sổ', 'Available ledger cash')}</span><strong>{money(cash?.status === 'available' ? cash.available_to_buy : null)}</strong><small>{copy('Tách biệt với giá trị cổ phiếu; chưa đối soát sức mua tại công ty chứng khoán.', 'Separate from stock value; not reconciled with broker buying power.')}</small></div>
    {cash?.status === 'deficit' && <p role="status">{copy('Lịch sử tiền mặt bị âm. Bổ sung hoặc sửa dòng tiền đúng ngày trước khi mua.', 'Cash history has a deficit. Correct dated cash flows before buying.')} {copy('Số dư theo sổ', 'Ledger balance')}: {money(cash.balance)}</p>}
    {cash?.status === 'deficit' && cash.first_deficit && Number.isFinite(Date.parse(cash.first_deficit.occurred_at)) && <p>{copy('Thiếu tiền lần đầu', 'First funding deficit')}: {new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(cash.first_deficit.occurred_at))} · {money(cash.first_deficit.amount)}</p>}
    {!cash || cash.status === 'unavailable' ? <p role="status">{copy('Chưa xác minh được tiền mặt. Tạm khóa ghi mua.', 'Cash cannot be verified. Purchases are temporarily blocked.')}</p> : null}
    {cost != null && <p aria-live="polite">{copy('Tiền mua dự kiến, gồm phí', 'Estimated purchase including fees')}: <b>{money(cost)}</b>{purchaseExceedsCash(cash, draft) ? ` · ${copy('Không đủ tiền', 'Insufficient cash')}` : ''}</p>}
    <button type="button" className="ghost-btn small-btn" onClick={onFunding}>{copy('Quản lý dòng tiền', 'Manage cash flows')}</button>
  </section>
}
