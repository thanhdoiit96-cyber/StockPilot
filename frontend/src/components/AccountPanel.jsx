import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./AccountPanel.css";

export default function AccountPanel({ user, onSave, onLogout }) {
  const dialog = useRef(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const identity = user?.display_name || user?.email?.split("@")[0] || "Tài khoản";
  const initial = Array.from(identity.trim())[0]?.toUpperCase() || "U";
  const dirty = name.trim() !== (user?.display_name || "");
  const verified = Boolean(user?.email_verified_at && Number.isFinite(Date.parse(user.email_verified_at)));
  const verification = verified ? "Đã xác thực" : user?.email_verified_at === null ? "Chưa xác thực" : "Chưa có thông tin";
  function open() {
    setName(user?.display_name || "");
    setError("");
    setMessage("");
    dialog.current.showModal();
  }
  function close() {
    if (busy) return;
    if (dirty && !window.confirm("Bỏ các thay đổi chưa lưu?")) return;
    dialog.current.close();
  }
  async function save(event) {
    event.preventDefault();
    if (busy || !dirty) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await onSave(name.trim() || null);
      setName(updated.display_name || "");
      setMessage("Đã lưu thông tin cá nhân.");
    } catch (reason) {
      setError(reason.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  async function logout() {
    if (busy || (dirty && !window.confirm("Đăng xuất và bỏ các thay đổi chưa lưu?"))) return;
    setBusy(true); setError(""); setMessage("");
    try { await onLogout(); }
    catch { setError("Chưa thể đăng xuất. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  return <>
    <button className="account-trigger" type="button" onClick={open} title="Tài khoản và thông tin cá nhân" aria-label="Tài khoản và thông tin cá nhân" aria-haspopup="dialog">
      <span className="account-avatar" aria-hidden="true">{initial}</span>
      <span className="account-trigger-copy"><strong>{identity}</strong><small>Tài khoản cá nhân</small></span>
      <span className="account-chevron" aria-hidden="true">›</span>
    </button>
    {createPortal(<dialog ref={dialog} className="account-dialog" aria-labelledby="account-title" onCancel={event => { event.preventDefault(); close(); }}>
      <header className="account-heading"><div><span className="account-kicker">CÀI ĐẶT TÀI KHOẢN</span><h2 id="account-title">Thông tin cá nhân</h2><p>Quản lý hồ sơ và thông tin đăng nhập của bạn.</p></div><button type="button" className="account-close" aria-label="Đóng thông tin cá nhân" disabled={busy} onClick={close}>×</button></header>
      <div className="account-body">
        <section className="account-summary" aria-label="Tóm tắt tài khoản">
          <span className="account-avatar account-avatar-large" aria-hidden="true">{initial}</span>
          <h3>{identity}</h3><p>{user?.email || "Chưa có email"}</p>
          <span className="account-role">{user?.role === "admin" ? "Quản trị viên" : "Thành viên"}</span>
          <p className="account-summary-note">Thông tin tài khoản được dùng để nhận diện bạn trong StockPilot.</p>
        </section>
        <form className="account-form" onSubmit={save} aria-busy={busy}>
          <h3>Hồ sơ của bạn</h3>
          <label htmlFor="account-display-name">Tên hiển thị <span>(không bắt buộc)</span></label>
          <input id="account-display-name" name="display_name" autoComplete="nickname" maxLength={120} value={name} disabled={busy} placeholder="Nhập tên bạn muốn sử dụng" onChange={event => { setName(event.target.value); setMessage(""); setError(""); }} aria-describedby="account-name-hint" />
          <small id="account-name-hint">Tối đa 120 ký tự. Để trống để dùng tên từ email.</small>
          <div className="account-email-heading"><label htmlFor="account-email">Email đăng nhập</label><span className={verified ? "account-verified" : "account-unverified"}>{verification}</span></div>
          <input id="account-email" type="email" value={user?.email || ""} readOnly />
          <small>Email hiện chưa thể thay đổi tại đây.</small>
          <div className="account-feedback" aria-live="polite">{error ? <p role="alert" className="account-error">{error}</p> : message ? <p className="account-success">{message}</p> : null}</div>
          <div className="account-form-actions"><button type="button" className="ghost-btn" disabled={busy || !dirty} onClick={() => { setName(user?.display_name || ""); setError(""); setMessage(""); }}>Hoàn tác</button><button type="submit" className="primary-btn" disabled={busy || !dirty}>{busy ? "Đang xử lý…" : "Lưu thay đổi"}</button></div>
        </form>
      </div>
      <footer className="account-footer"><div><strong>Phiên đăng nhập</strong><p>Đăng xuất khỏi tài khoản trên trình duyệt này.</p></div><button type="button" className="ghost-btn account-signout" disabled={busy} onClick={logout}>Đăng xuất</button></footer>
    </dialog>, document.body)}
  </>;
}
