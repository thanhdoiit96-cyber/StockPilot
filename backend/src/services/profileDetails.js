'use strict';

const fields = ['display_name', 'full_name', 'phone', 'date_of_birth', 'preferred_language', 'timezone'];
const languages = new Set(['vi', 'en']);
const timezones = new Set(['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'UTC']);
function profileDetails(body, now = new Date()) {
  const changes = {};
  for (const field of fields) {
    if (!body || !Object.prototype.hasOwnProperty.call(body, field)) continue;
    const value = body[field];
    if (value === null) {
      if (field === 'preferred_language' || field === 'timezone') throw new Error('Ngôn ngữ và múi giờ không được để trống.');
      changes[field] = null; continue;
    }
    if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Thông tin cá nhân phải là văn bản hợp lệ.');
    let normalized = value.trim();
    if (field === 'preferred_language') {
      if (!languages.has(normalized)) throw new Error('Ngôn ngữ chỉ hỗ trợ tiếng Việt hoặc tiếng Anh.');
    } else if (field === 'timezone') {
      if (!timezones.has(normalized)) throw new Error('Múi giờ chưa được hỗ trợ.');
    } else if (field === 'phone') {
      if (normalized.length > 32 || !/^[+\d ()-]+$/.test(normalized)) throw new Error('Số điện thoại không hợp lệ.');
      normalized = normalized.replace(/[ ()-]/g, '');
      if (!/^\+?\d{8,15}$/.test(normalized)) throw new Error('Số điện thoại cần từ 8 đến 15 chữ số.');
    } else if (field === 'date_of_birth') {
      const date = new Date(normalized + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized || normalized < '1900-01-01' || normalized > now.toISOString().slice(0, 10)) throw new Error('Ngày sinh phải là ngày hợp lệ từ năm 1900 đến hôm nay.');
    } else if (!normalized || normalized.length > 120) throw new Error('Họ tên và tên hiển thị phải dài từ 1 đến 120 ký tự.');
    changes[field] = normalized;
  }
  if (!Object.keys(changes).length) throw new Error('Chưa có thông tin hồ sơ để cập nhật.');
  return changes;
}
module.exports = { profileDetails, languages, timezones };
