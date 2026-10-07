import { useState } from "react";
import { localizeApiError } from "../services/apiErrorCatalog.mjs";
export default function PasswordChangeForm({ onSubmit, onDirty, onBusy, disabled, language = 'vi' }) {
  const [values, setValues] = useState({ current: "", password: "", confirmation: "" });
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  function change(key, value) {
    const next = { ...values, [key]: value };
    setValues(next); setError(""); onDirty(Object.values(next).some(Boolean));
  }
  async function submit(event) {
    event.preventDefault();
    if (disabled) return;
    if (values.password !== values.confirmation) return setError("Mật khẩu xác nhận chưa khớp.");
    if (values.password.length < 12 || new TextEncoder().encode(values.password).length > 72) return setError("Dùng ít nhất 12 ký tự và tối đa 72 byte (ký tự có dấu có thể chiếm nhiều byte).");
    if (values.current === values.password) return setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
    onBusy(true); setError("");
    try { await onSubmit({ current_password: values.current, new_password: values.password }); }
    catch (reason) { setError(localizeApiError(reason, language)); }
    finally { onBusy(false); }
  }
  return <form className="account-form account-password-form" onSubmit={submit} aria-busy={disabled}>
    <h3>Đổi mật khẩu</h3>
    <p>Sau khi đổi, bạn cần đăng nhập lại trên các thiết bị. Hãy lưu thay đổi hồ sơ trước khi tiếp tục.</p>
    {[["current", "Mật khẩu hiện tại"], ["password", "Mật khẩu mới"], ["confirmation", "Xác nhận mật khẩu mới"]].map(([key, label]) => <div key={key}>
      <label htmlFor={"password-change-" + key}>{label}</label>
      <input id={"password-change-" + key} type={visible ? "text" : "password"} autoComplete={key === "current" ? "current-password" : "new-password"} value={values[key]} required disabled={disabled} onChange={event => change(key, event.target.value)} />
    </div>)}
    <small>Ít nhất 12 ký tự, tối đa 72 byte. Khuyến khích dùng cụm từ dài và dễ nhớ.</small>
    <button type="button" className="ghost-btn" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</button>
    {error && <p role="alert" className="account-error">{error}</p>}
    <button type="submit" className="primary-btn" disabled={disabled}>Đổi mật khẩu và đăng nhập lại</button>
  </form>;
}
