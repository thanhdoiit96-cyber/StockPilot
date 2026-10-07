import { accountText } from "../services/accountCatalog.mjs";
import { useEffect, useRef, useState } from "react";
import { localizeApiError } from "../services/apiErrorCatalog.mjs";

const dateLabel = (value, language) => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN') : accountText(language, "Chưa có thông tin");
};
export default function AccountSessions({ active, onLoad, onRevoke, onRename, onDirty, disabled, language = 'vi' }) {
  const t = text => accountText(language, text);
  const [editing, setEditing] = useState(null);
  const labelInput = useRef(null);
  useEffect(() => { if (editing) labelInput.current?.focus(); }, [editing?.id]);
  useEffect(() => () => onDirty?.(false), [onDirty]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const version = useRef(0);
  const heading = useRef(null);
  const loader = useRef(onLoad);
  loader.current = onLoad;
  async function load(append = false) {
    const request = ++version.current;
    setLoading(true); setError("");
    try {
      const response = await loader.current(append ? data?.next_cursor : undefined);
      if (!Array.isArray(response?.data?.sessions)) throw new Error(t("Không thể đọc danh sách phiên đăng nhập."));
      if (version.current === request) setData(current => {
        if (!append || !current) return response.data;
        const merged = new Map(current.sessions.map(session => [session.id, session]));
        response.data.sessions.forEach(session => merged.set(session.id, session));
        return { ...response.data, sessions: [...merged.values()] };
      });
    } catch (reason) { if (version.current === request) setError(localizeApiError(reason, language)); }
    finally { if (version.current === request) setLoading(false); }
  }
  useEffect(() => {
    if (active) { setConfirm(false); load(); }
    return () => { version.current++; };
  }, [active]);
  async function revoke(sessionId) {
    if (disabled || revoking) return;
    setRevoking(true); setError(""); setNotice("");
    try {
      await onRevoke(sessionId);
      setConfirm(false);
      setNotice(sessionId ? t("Đã đăng xuất phiên đã chọn. Các phiên khác vẫn được giữ.") : t("Đã đăng xuất các phiên khác. Phiên hiện tại vẫn được giữ."));
      await load();
      heading.current?.focus();
    } catch (reason) { setError(localizeApiError(reason, language)); }
    finally { setRevoking(false); }
  }
  async function rename(event) {
    event.preventDefault();
    if (!editing || disabled || revoking || loading) return;
    setRevoking(true); setError(""); setNotice("");
    try {
      const response = await onRename(editing.id, editing.value.trim() || null);
      if (response?.data?.id !== editing.id || (response.data.label !== null && typeof response.data.label !== "string")) throw new Error(t("Không thể xác nhận tên phiên đã lưu."));
      setData(current => ({ ...current, sessions: current.sessions.map(session => session.id === editing.id ? { ...session, label: response.data.label } : session) }));
      setEditing(null); onDirty?.(false); setNotice(t("Đã lưu tên phiên đăng nhập."));
      heading.current?.focus();
    } catch (reason) { setError(localizeApiError(reason, language)); }
    finally { setRevoking(false); }
  }
  const locked = disabled || loading || revoking;
  const otherCount = data?.sessions.filter(session => !session.current).length || 0;
  return <section className="account-sessions" aria-labelledby="account-sessions-title" aria-busy={loading || revoking}>
    <div className="account-sessions-heading"><h3 ref={heading} tabIndex={-1} id="account-sessions-title">{t("Phiên đăng nhập")}</h3><button type="button" className="ghost-btn" disabled={locked || Boolean(editing)} onClick={() => { setConfirm(false); load(); }}>{t("Làm mới phiên")}</button></div>
    <p>{t("Kiểm tra các phiên còn hiệu lực. Thời gian hiển thị theo múi giờ trình duyệt; lần gia hạn không đồng nghĩa với thao tác gần nhất.")}</p>
    {loading && <p role="status">{t("Đang tải phiên đăng nhập…")}</p>}
    {error && <p role="alert" className="account-error">{error}</p>}
    {notice && <p role="status" className="account-success">{notice}</p>}
    {data && <>
      <ul className="account-session-list">{data.sessions.map((session, index) => <li key={session.id}>
        <strong>{session.label || (session.current ? t("Phiên hiện tại") : t("Phiên khác ") + (index + (data.sessions[0]?.current ? 0 : 1)))}</strong>
        {session.current && <span className="account-verified">{t("Đang sử dụng")}</span>}
        <dl><div><dt>{t("Đăng nhập")}</dt><dd>{dateLabel(session.created_at, language)}</dd></div><div><dt>{t("Gia hạn gần nhất")}</dt><dd>{dateLabel(session.last_used_at, language)}</dd></div><div><dt>{t("Hết hạn dự kiến")}</dt><dd>{dateLabel(session.expires_at, language)}</dd></div></dl>
        {onRename && data.can_revoke_others && (editing?.id === session.id
          ? <form className="account-session-label-form" onSubmit={rename}>
              <label htmlFor="session-label-input">{t("Tên phiên do bạn đặt")}</label>
              <input ref={labelInput} id="session-label-input" value={editing.value} maxLength={80} disabled={locked} placeholder={t("Ví dụ: Laptop cá nhân")} onChange={event => { setEditing({ ...editing, value: event.target.value }); onDirty?.(event.target.value.trim() !== editing.original); }} aria-describedby="session-label-hint" />
              <small id="session-label-hint">{t("Tối đa 80 ký tự. Để trống để dùng tên mặc định.")}</small>
              <div><button type="button" className="ghost-btn" disabled={locked} onClick={() => { setEditing(null); onDirty?.(false); setError(""); heading.current?.focus(); }}>{t("Hủy đổi tên")}</button><button type="submit" className="primary-btn" disabled={locked || editing.value.trim() === editing.original}>{t("Lưu tên phiên")}</button></div>
            </form>
          : <button type="button" className="ghost-btn account-session-revoke" disabled={locked || Boolean(editing)} onClick={() => { setEditing({ id: session.id, value: session.label || "", original: session.label || "" }); setConfirm(false); setError(""); setNotice(""); }}>{session.label ? t("Đổi tên phiên") : t("Đặt tên phiên")}</button>)}
        {!session.current && data.can_revoke_others && !editing && (confirm === session.id
          ? <div className="account-session-confirm"><p>{t("Đăng xuất")} {session.label ? "“" + session.label + "”" : t("phiên")} {t("đăng nhập lúc")} {dateLabel(session.created_at, language)}{t("? Các phiên khác không bị ảnh hưởng.")}</p>
            <button type="button" className="ghost-btn" disabled={locked} onClick={() => { setConfirm(false); heading.current?.focus(); }}>{t("Giữ phiên này")}</button>
            <button type="button" className="primary-btn" disabled={locked} onClick={() => revoke(session.id)}>{t("Xác nhận đăng xuất phiên này")}</button>
          </div>
          : <button type="button" className="ghost-btn account-session-revoke" disabled={locked} aria-label={t("Đăng xuất phiên khác ") + (index + (data.sessions[0]?.current ? 0 : 1))} onClick={() => { setConfirm(session.id); setNotice(""); setError(""); }}>{t("Đăng xuất phiên này")}</button>)}
      </li>)}</ul>
      {!data.sessions.length && <p>{t("Không có phiên được quản lý nào còn hiệu lực.")}</p>}
      <p role="status">{t("Đang hiển thị")} {data.sessions.length} {t("phiên. Các phiên khác được xếp theo thời điểm đăng nhập mới nhất.")}</p>
      {data.has_more && <button type="button" className="ghost-btn" disabled={locked || Boolean(editing) || !data.next_cursor} onClick={() => { setConfirm(false); load(true); }}>{t("Xem thêm phiên")}</button>}
      {!data.can_revoke_others && <p>{t("Vui lòng đăng nhập lại để quản lý các phiên khác.")}</p>}
      {confirm === "all" ? <div className="account-session-confirm"><p>{t("Các phiên khác sẽ cần đăng nhập lại. Tiếp tục?")}</p><button type="button" className="ghost-btn" disabled={locked} onClick={() => setConfirm(false)}>{t("Hủy đăng xuất phiên")}</button><button type="button" className="primary-btn" disabled={locked} onClick={() => revoke()}>{t("Xác nhận đăng xuất phiên khác")}</button></div>
        : <button type="button" className="ghost-btn" disabled={locked || Boolean(editing) || !data.can_revoke_others || (!otherCount && !data.has_more)} onClick={() => { setConfirm("all"); setNotice(""); }}>{t("Đăng xuất các phiên khác")}</button>}
      <p className="account-sessions-note">{t("Đổi mật khẩu để vô hiệu toàn bộ thông tin đăng nhập cũ.")}</p>
    </>}
  </section>;
}
