import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./AccountPanel.css";
import PasswordChangeForm from "./PasswordChangeForm.jsx";
import AccountSessions from "./AccountSessions.jsx";

const detailsOf = user => ({ full_name: user?.full_name || "", phone: user?.phone || "", date_of_birth: user?.date_of_birth || "", preferred_language: user?.preferred_language || "vi", timezone: user?.timezone || "Asia/Ho_Chi_Minh" });

export default function AccountPanel({ user, onSave, onLogout, onPasswordChange, onLoadSessions, onRevokeSessions, onRenameSession }) {
  const [sessionDirty, setSessionDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [tab, setTab] = useState("profile");
  const dialog = useRef(null);
  const keepEditing = useRef(null);
  const [opened, setOpened] = useState(false);
  const [pendingExit, setPendingExit] = useState(null);
  const [name, setName] = useState("");
  const [details, setDetails] = useState(() => detailsOf(user));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const identity = user?.display_name || user?.email?.split("@")[0] || "Tài khoản";
  const initial = Array.from(identity.trim())[0]?.toUpperCase() || "U";
  const savedDetails = detailsOf(user);
  const profileDirty = name.trim() !== (user?.display_name || "") || Object.keys(details).some(key => details[key].trim() !== savedDetails[key]);
  const dirty = profileDirty || passwordDirty || sessionDirty;
  useEffect(() => {
    if (!opened || (!dirty && !busy)) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [opened, dirty, busy]);
  useEffect(() => {
    if (pendingExit) keepEditing.current?.focus();
    else if (opened) {
      const target = tab === "profile" ? dialog.current?.querySelector("#account-display-name")
        : dialog.current?.querySelector("#session-label-input") || dialog.current?.querySelector("#password-change-current");
      target?.focus();
    }
  }, [pendingExit, opened]);
  const verified = Boolean(user?.email_verified_at && Number.isFinite(Date.parse(user.email_verified_at)));
  const verification = verified ? "Đã xác thực" : user?.email_verified_at === null ? "Chưa xác thực" : "Chưa có thông tin";
  function open() {
    setName(user?.display_name || "");
    setDetails(detailsOf(user));
    setTab("profile");
    setPasswordDirty(false);
    setError("");
    setMessage("");
    setPendingExit(null);
    setOpened(true);
    dialog.current.showModal();
  }
  function close() {
    if (busy) return;
    if (pendingExit) { setPendingExit(null); return; }
    if (dirty) { setPendingExit("close"); return; }
    dialog.current.close();
  }
  async function save(event) {
    event.preventDefault();
    if (busy || !profileDirty) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const updated = await onSave({ display_name: name.trim() || null, ...Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value.trim() || null])) });
      setName(updated.display_name || "");
      setDetails(detailsOf(updated));
      setMessage("Đã lưu thông tin cá nhân.");
    } catch (reason) {
      setError(reason.message || "Không thể lưu thông tin. Vui lòng thử lại.");
    } finally { setBusy(false); }
  }
  async function logout(confirmed = false) {
    if (busy) return;
    if (dirty && !confirmed) { setPendingExit("logout"); return; }
    setPendingExit(null);
    setBusy(true); setError(""); setMessage("");
    try { await onLogout(); }
    catch { setError("Chưa thể đăng xuất. Vui lòng thử lại."); }
    finally { setBusy(false); }
  }
  function selectTab(next) {
    if (busy || pendingExit) return;
    setTab(next);
    dialog.current?.querySelector("#account-tab-" + next)?.focus();
  }
  function tabKeys(event) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    selectTab(event.key === "Home" ? "profile" : event.key === "End" ? "security" : tab === "profile" ? "security" : "profile");
  }
  return <>
    <button className="account-trigger" type="button" onClick={open} title="Tài khoản và thông tin cá nhân" aria-label="Tài khoản và thông tin cá nhân" aria-haspopup="dialog">
      <span className="account-avatar" aria-hidden="true">{initial}</span>
      <span className="account-trigger-copy"><strong>{identity}</strong><small>Tài khoản cá nhân</small></span>
      <span className="account-chevron" aria-hidden="true">›</span>
    </button>
    {createPortal(<dialog ref={dialog} className="account-dialog" aria-labelledby="account-title" onClose={() => { setOpened(false); setPendingExit(null); }} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }} onCancel={event => { event.preventDefault(); close(); }}>
      <header className="account-heading"><div><span className="account-kicker">CÀI ĐẶT TÀI KHOẢN</span><h2 id="account-title">Thông tin cá nhân</h2><p>Quản lý hồ sơ và thông tin đăng nhập của bạn.</p></div><button type="button" className="account-close" aria-label="Đóng thông tin cá nhân" disabled={busy} onClick={close}>×</button></header>
      {pendingExit && <section className="account-discard" role="alert" aria-label="Thay đổi chưa lưu">
        <strong>Bạn có thay đổi chưa lưu</strong>
        <p>{pendingExit === "logout" ? "Đăng xuất sẽ bỏ các thay đổi trong hồ sơ." : "Đóng hồ sơ sẽ bỏ các thay đổi bạn vừa nhập."}</p>
        <div><button ref={keepEditing} type="button" className="primary-btn" onClick={() => setPendingExit(null)}>Tiếp tục chỉnh sửa</button>
        <button type="button" className="ghost-btn" onClick={() => pendingExit === "logout" ? logout(true) : dialog.current.close()}>{pendingExit === "logout" ? "Bỏ thay đổi và đăng xuất" : "Bỏ thay đổi và đóng"}</button></div>
      </section>}
      {onPasswordChange && <div className="account-tabs" role="tablist" aria-label="Cài đặt tài khoản" inert={pendingExit ? "" : undefined}>
        {[["profile", "Hồ sơ", profileDirty], ["security", "Bảo mật", passwordDirty]].map(([key, label, edited]) => <button key={key} id={"account-tab-" + key} type="button" role="tab" aria-label={label} aria-description={edited ? "Có thay đổi chưa lưu" : undefined} aria-selected={tab === key} aria-controls={"account-panel-" + key} tabIndex={tab === key ? 0 : -1} disabled={busy} onClick={() => selectTab(key)} onKeyDown={tabKeys}>{label}{edited && <span className="account-draft-dot" aria-label="Có thay đổi chưa lưu"> •</span>}</button>)}
      </div>}
      {error && <p role="alert" className="account-error account-global-error">{error}</p>}
      <div id="account-panel-profile" role="tabpanel" aria-labelledby="account-tab-profile" className="account-body" hidden={tab !== "profile"} inert={pendingExit ? "" : undefined}>
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
          <small id="account-name-hint">{name.length}/120 ký tự. Để trống để dùng tên từ email.</small>
          {profileDirty && !name.trim() && <small className="account-reset-hint">Khi lưu, tên hiển thị hiện tại sẽ được xóa. Email đăng nhập vẫn giữ nguyên.</small>}
          <fieldset className="account-details"><legend>Thông tin cơ bản <span>Không bắt buộc</span></legend>
            <label htmlFor="account-full-name">Họ và tên</label>
            <input id="account-full-name" autoComplete="name" maxLength={120} value={details.full_name} disabled={busy} placeholder="Nhập họ và tên" onChange={event => { setDetails({ ...details, full_name: event.target.value }); setMessage(""); setError(""); }} />
            <label htmlFor="account-birthday">Ngày sinh</label>
            <input id="account-birthday" type="date" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={details.date_of_birth} disabled={busy} onChange={event => { setDetails({ ...details, date_of_birth: event.target.value }); setMessage(""); setError(""); }} />
            <label htmlFor="account-phone">Số điện thoại</label>
            <input id="account-phone" type="tel" autoComplete="tel" maxLength={32} value={details.phone} disabled={busy} placeholder="Ví dụ: +84 912 345 678" aria-describedby="account-phone-hint" onChange={event => { setDetails({ ...details, phone: event.target.value }); setMessage(""); setError(""); }} />
            <small id="account-phone-hint">Thông tin tự khai, chưa xác minh. Không dùng để đăng nhập hoặc khôi phục tài khoản.</small>
          </fieldset>
          <fieldset className="account-details"><legend>Hiển thị <span>Áp dụng sau khi lưu</span></legend>
            <label htmlFor="account-language">Ngôn ngữ và định dạng</label>
            <select id="account-language" value={details.preferred_language} disabled={busy} onChange={event => { setDetails({ ...details, preferred_language: event.target.value }); setMessage(""); setError(""); }}><option value="vi">Tiếng Việt · 1.234.567 ₫</option><option value="en">English · ₫1,234,567</option></select>
            <small>Áp dụng cho định dạng và các màn hình đã hỗ trợ Việt/Anh. Nội dung phân tích từ nguồn dữ liệu giữ ngôn ngữ gốc.</small>
            <label htmlFor="account-timezone">Múi giờ</label>
            <select id="account-timezone" value={details.timezone} disabled={busy} onChange={event => { setDetails({ ...details, timezone: event.target.value }); setMessage(""); setError(""); }}><option value="Asia/Ho_Chi_Minh">Việt Nam (UTC+7)</option><option value="Asia/Bangkok">Bangkok (UTC+7)</option><option value="Asia/Singapore">Singapore (UTC+8)</option><option value="UTC">UTC</option></select>
            <small>Dùng cho thời điểm giao dịch, dòng tiền và báo giá; ngày giao dịch của thị trường vẫn theo phiên Việt Nam.</small>
          </fieldset>
          <div className="account-email-heading"><label htmlFor="account-email">Email đăng nhập</label><span className={verified ? "account-verified" : "account-unverified"}>{verification}</span></div>
          <input id="account-email" type="email" value={user?.email || ""} readOnly />
          <small>Email hiện chưa thể thay đổi tại đây.</small>
          <div className="account-feedback" aria-live="polite">{message ? <p className="account-success">{message}</p> : null}</div>
          <div className="account-form-actions"><button type="button" className="ghost-btn" disabled={busy || !profileDirty} onClick={() => { setName(user?.display_name || ""); setDetails(detailsOf(user)); setError(""); setMessage(""); }}>Hoàn tác</button><button type="submit" className="primary-btn" disabled={busy || !profileDirty}>{busy ? "Đang xử lý…" : "Lưu thay đổi"}</button></div>
        </form>
      </div>
      {opened && onPasswordChange && <div id="account-panel-security" role="tabpanel" aria-labelledby="account-tab-security" className="account-password-section" hidden={tab !== "security"} inert={pendingExit ? "" : undefined}>
        {profileDirty && <div className="account-profile-reminder" role="status">Bạn có thay đổi hồ sơ chưa lưu. <button type="button" className="ghost-btn" onClick={() => selectTab("profile")}>Quay lại Hồ sơ</button></div>}
        {sessionDirty && <p className="account-profile-reminder" role="status">Hãy lưu hoặc hủy tên phiên đang sửa trước khi đổi mật khẩu.</p>}
        <PasswordChangeForm onSubmit={onPasswordChange} onDirty={setPasswordDirty} onBusy={setBusy} disabled={busy || profileDirty || sessionDirty} />
        {onLoadSessions && <AccountSessions active={tab === "security"} onLoad={onLoadSessions} onRevoke={onRevokeSessions} onRename={onRenameSession} onDirty={setSessionDirty} disabled={busy} />}
      </div>}
      <footer className="account-footer" inert={pendingExit ? "" : undefined}><div><strong>Phiên đăng nhập</strong><p>Đăng xuất khỏi tài khoản trên trình duyệt này.</p></div><button type="button" className="ghost-btn account-signout" disabled={busy} onClick={() => logout()}>Đăng xuất</button></footer>
    </dialog>, document.body)}
  </>;
}
