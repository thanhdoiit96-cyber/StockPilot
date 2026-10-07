export default function DetailRiskPlan({
  riskPlan,
  normalizeRisk,
  formatPrice = value => value,
  translate = value => value,
  emptyValue = '-'
}) {
  if (!riskPlan?.horizons) return null

  return <div className="external-factor-box">
    <strong>{translate('Kịch bản tham khảo')}</strong>
    <div className="table-wrap risk-table">
      <table>
        <thead><tr>
          <th>{translate('Khung thời gian')}</th>
          <th>{translate('Kỳ vọng')}</th>
          <th>{translate('Tỷ trọng')}</th>
          <th>{translate('Chốt lời')}</th>
          <th>Stop loss</th>
        </tr></thead>
        <tbody>{Object.values(riskPlan.horizons).map(horizon => {
          const normalized = normalizeRisk(horizon)
          return <tr key={translate(horizon.label)}>
            <td>{translate(horizon.label)}</td>
            <td>{horizon.expectation_pct ? `${horizon.expectation_pct.min}% - ${horizon.expectation_pct.max}%` : emptyValue}</td>
            <td>{Number(horizon.allocation_pct || 0).toFixed(1)}%</td>
            <td>{normalized.displayTake == null ? emptyValue : formatPrice(normalized.displayTake)}</td>
            <td>{normalized.displayStop == null ? emptyValue : formatPrice(normalized.displayStop)}{normalized.adjusted && <small className="data-time"> {translate('điều chỉnh theo giá hiện tại')}</small>}</td>
          </tr>
        })}</tbody>
      </table>
    </div>
    <p className="analysis-disclaimer">{riskPlan.disclaimer}</p>
  </div>
}
