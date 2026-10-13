const { normalizeCompanyProfile } = require('./companyProfileService');

test('merges provider profile onto stable local identity with provenance', () => {
  const result = normalizeCompanyProfile({
    stock: { code:'FPT', name:'FPT local', exchange:'HOSE', industry:'Technology', market_cap:'123' },
    providerPayload: { provider:'vci', route:'company.info', profile:{ name:'CTCP FPT', short_name:'FPT Corp', profile:'Technology company', listing_date:'2006-12-13', issued_share:1000 } },
    fetchedAt:new Date('2026-10-13T08:00:00Z')
  });
  expect(result).toMatchObject({ status:'available', profile:{ symbol:'FPT', name:'CTCP FPT', exchange:'HOSE', industry:'Technology', description:'Technology company', issued_shares:1000, market_cap:123 }, provenance:{ provider:'vci', route:'company.info', live_provider_fields:4 } });
});

test('fails soft to local fields without fabricating company facts', () => {
  const result = normalizeCompanyProfile({ stock:{ code:'FPT', name:'FPT', exchange:'HOSE', industry:null, market_cap:null }, fetchedAt:new Date('2026-10-13T08:00:00Z') });
  expect(result).toMatchObject({ status:'partial', profile:{ symbol:'FPT', name:'FPT', exchange:'HOSE', industry:null, description:null, listing_date:null }, provenance:{ provider:'local_reference', license_status:'provider_unavailable', live_provider_fields:0 }, limitations:['provider_profile_unavailable'] });
});
