export default function DetailSymbolSearch({ value, options = [], error, onChange, onSubmit, translate = value => value }) {
  return <form className="detail-symbol-search panel" onSubmit={onSubmit}>
    <label htmlFor="detail-symbol-input">{translate('Mã cổ phiếu')}</label>
    <div>
      <input
        id="detail-symbol-input"
        list="detail-symbol-options"
        value={value}
        onChange={event => onChange(event.target.value.toUpperCase())}
        placeholder={translate('Nhập mã, ví dụ: HPG')}
        autoComplete="off"
      />
      <datalist id="detail-symbol-options">
        {options.map(stock => <option value={stock.symbol} key={stock.id}>{stock.name}</option>)}
      </datalist>
      <button className="primary-btn" type="submit">{translate('Xem mã')}</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </form>
}
