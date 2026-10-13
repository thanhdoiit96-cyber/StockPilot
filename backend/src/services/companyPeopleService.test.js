const { normalizeCompanyPeople } = require('./companyPeopleService');

test('normalizes shareholders and officers without exposing provider-shaped rows', () => {
  const data = normalizeCompanyPeople({ symbol:'fpt', providerPayload:{ provider:'kbs', shareholders:[{ share_holder:'Nguyễn Văn A', share_own_percent:'7.5', share_own:'1000', update_date:'2026-09-30' }], officers:[{ officer_name:'Trần Văn B', officer_position:'Tổng giám đốc', officer_own_percent:1.2 }] }, fetchedAt:new Date('2026-10-13T08:00:00Z') });
  expect(data).toMatchObject({ version:'company_people_v1', symbol:'FPT', status:'available', shareholders:[{ name:'Nguyễn Văn A', ownership_pct:7.5, shares:1000, updated_at:'2026-09-30' }], officers:[{ name:'Trần Văn B', position:'Tổng giám đốc', ownership_pct:1.2 }], summary:{ shareholder_count:1, officer_count:1 }, provenance:{ provider:'kbs' } });
});

test('keeps partial provider results and represents unavailable data explicitly', () => {
  expect(normalizeCompanyPeople({ symbol:'FPT', providerPayload:{ provider:'kbs', shareholders:[{ name:'Quỹ A' }], errors:[{ scope:'officers', error:'timeout' }] } })).toMatchObject({ status:'partial', summary:{ shareholder_count:1, officer_count:0 }, limitations:['officers'] });
  expect(normalizeCompanyPeople({ symbol:'FPT' })).toMatchObject({ status:'unavailable', shareholders:[], officers:[], provenance:{ provider:null, license_status:'provider_unavailable' } });
});
