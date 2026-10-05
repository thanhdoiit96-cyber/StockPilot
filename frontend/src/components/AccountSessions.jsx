import { useEffect, useRef, useState } from "react";

const dateLabel = value => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN") : "Chưa có thông tin";
};
export default function AccountSessions({ active, onLoad, onRevoke, disabled }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState(false);
  const version = useRef(0);
  const loader = useRef(onLoad);
  loader.current = onLoad;
  async function load() {
    const request = ++version.current;
    setLoading(true); setError("");
    try {
      const response = await loader.current();
      if (!Array.isArray(response?.data?.sessions)) throw new Error("Không thể đọc danh sách phiên đăng nhập.");
      if (version.current === request) setData(response.data);
    } catch (reason) { if (version.current === request) setError(reason.message || "Không thể tải phiên đăng nhập."); }
    finally { if (version.current === request) setLoading(false); }
  }
  useEffect(() => {
    if (active) { setConfirm(false); load(); }
    return () => { version.current++; };
  }, [active]);
  async function revoke() {
    if (disabled || revoking) return;
    setRevoking(true); setError(""); setNotice("");
    try {
      await onRevoke();
      setConfirm(false);
      setNotice("Đã đăng xuất các phiên khác. Phiên hiện tại vẫn được giữ.");
      await load();
    } catch (reason) { setError(reason.message || "Chưa thể đăng xuất các phiên khác."); }
    finally { setRevoking(false); }
  }
  const locked = disabled || loading || revoking;
  const otherCount = data?.sessions.filter(session => !session.current).length || 0;
  return <section className="account-sessions" aria-labelledby="account-sessions-title" aria-busy={loading || revoking}>
    <div className="account-sessions-heading"><h3 id="account-sessions-title">Phiên đăng nhập</h3><button type="button" className="ghost-btn" disabled={locked} onClick={load}>Làm mới phiên</button></div>
    <p>Kiểm tra các phiên còn hiệu lực. Thời gian hiển thị theo múi giờ trình duyệt; lần gia hạn không đồng nghĩa với thao tác gần nhất.</p>
    {loading && <p role="status">Đang tải phiên đăng nhập…</p>}
    {error && <p role="alert" className="account-error">{error}</p>}
    {notice && <p role="status" className="account-success">{notice}</p>}
    {data && <>
      <ul className="account-session-list">{data.sessions.map((session, index) => <li key={session.id}>
        <strong>{session.current ? "Phiên hiện tại" : "Phiên khác " + (index + (data.sessions[0]?.current ? 0 : 1))}</strong>
        {session.current && <span className="account-verified">Đang sử dụng</span>}
        <dl><div><dt>Đăng nhập</dt><dd>{dateLabel(session.created_at)}</dd></div><div><dt>Gia hạn gần nhất</dt><dd>{dateLabel(session.last_used_at)}</dd></div><div><dt>Hết hạn dự kiến</dt><dd>{dateLabel(session.expires_at)}</dd></div></dl>
      </li>)}</ul>
      {!data.sessions.length && <p>Không có phiên được quản lý nào còn hiệu lực.</p>}
      {data.has_more && <p>Đang hiển thị 50 phiên khác gần nhất. Thao tác đăng xuất áp dụng cho tất cả phiên khác.</p>}
      {!data.can_revoke_others && <p>Vui lòng đăng nhập lại để quản lý các phiên khác.</p>}
      {confirm ? <div className="account-session-confirm"><p>Các phiên khác sẽ cần đăng nhập lại. Tiếp tục?</p><button type="button" className="ghost-btn" disabled={locked} onClick={() => setConfirm(false)}>Hủy đăng xuất phiên</button><button type="button" className="primary-btn" disabled={locked} onClick={revoke}>Xác nhận đăng xuất phiên khác</button></div>
        : <button type="button" className="ghost-btn" disabled={locked || !data.can_revoke_others || (!otherCount && !data.has_more)} onClick={() => { setConfirm(true); setNotice(""); }}>Đăng xuất các phiên khác</button>}
      <p className="account-sessions-note">Đổi mật khẩu để vô hiệu toàn bộ thông tin đăng nhập cũ.</p>
    </>}
  </section>;
}
