const { profileDetails } = require('./profileDetails');
test('normalizes optional fields, preserves omitted fields and clears explicitly', () => {
  expect(profileDetails({ full_name: ' Nguyễn An ', phone: '+84 (912) 345-678', date_of_birth: '2000-02-29', role: 'admin' })).toEqual({ full_name: 'Nguyễn An', phone: '+84912345678', date_of_birth: '2000-02-29' });
  expect(profileDetails({ full_name: null, phone: null, date_of_birth: null })).toEqual({ full_name: null, phone: null, date_of_birth: null });
});
test('accepts supported locale preferences and rejects empty preferences', () => {
  expect(profileDetails({ preferred_language: 'en', timezone: 'Asia/Bangkok' })).toEqual({ preferred_language: 'en', timezone: 'Asia/Bangkok' });
  expect(() => profileDetails({ preferred_language: null })).toThrow(/không được để trống/);
  expect(() => profileDetails({ timezone: 'Europe/London' })).toThrow(/chưa được hỗ trợ/);
});
test.each([{}, { role: 'admin' }, { full_name: 1 }, { full_name: ' ' }, { full_name: 'x'.repeat(121) }, { display_name: 'a\nb' }, { phone: '123' }, { phone: '12345678ext1' }, { phone: '++84912345678' }, { date_of_birth: '2025-02-29' }, { date_of_birth: '2000-13-01' }, { date_of_birth: '1899-12-31' }, { date_of_birth: '2999-01-01' }, { date_of_birth: [] }])('rejects invalid profile %j', body => {
  expect(() => profileDetails(body)).toThrow();
});
