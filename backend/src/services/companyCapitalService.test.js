const { normalizeCompanyCapital } = require('./companyCapitalService');

test('normalizes capital history and disclosures with explicit ledger semantics', () => {
  const data=normalizeCompanyCapital({ symbol:'fpt', providerPayload:{ provider:'kbs', capital_history:[{ date:'2026-01-02', charter_capital:'1000000', issued_share:100 }], events:[{ event_date:'2026-02-01', event_name:'Cổ tức tiền mặt', ratio:'10%' }] }, fetchedAt:new Date('2026-10-13T08:00:00Z') });
  expect(data).toMatchObject({ version:'company_capital_v1', status:'available', capital_history:[{ date:'2026-01-02', charter_capital:1000000, issued_shares:100 }], events:[{ date:'2026-02-01', title:'Cổ tức tiền mặt', value:'10%' }], semantics:{ provider_events_are_disclosures:true, portfolio_effect_requires_confirmed_ledger_event:true } });
});

test('does not turn missing provider events into confirmed portfolio actions', () => {
  expect(normalizeCompanyCapital({ symbol:'FPT' })).toMatchObject({ status:'unavailable', capital_history:[], events:[], summary:{ capital_records:0, event_records:0 }, provenance:{ provider:null } });
});
