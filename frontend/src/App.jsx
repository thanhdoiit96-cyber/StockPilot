import * as D from "react";
import * as O from "react/jsx-runtime";
import MarketBoardPage from "./components/MarketBoardPage.jsx";
import MarketBreadth from "./components/MarketBreadth.jsx";
import PortfolioAllocation from "./components/PortfolioAllocation.jsx";
import PageLoadingOverlay from "./components/PageLoadingOverlay.jsx";
import DetailSymbolSearch from "./components/DetailSymbolSearch.jsx";
import DetailHero from "./components/DetailHero.jsx";
import DetailPriceVolumeChart from "./components/DetailPriceVolumeChart.jsx";
class ur extends Error {
  constructor(n, t = null) {
    super(n), this.name = "ApiError", this.status = t;
  }
}
async function je(e, { signal: n, method: t = "GET", body: r, token: l } = {}) {
  const o = AbortSignal.timeout(15e3), a = n ? AbortSignal.any([n, o]) : o;
  let u;
  try {
    u = await fetch(e, { signal: a, method: t, headers: { Accept: "application/json", ...l ? { Authorization: `Bearer ${l}` } :
    {}, ...r ? { "Content-Type": "application/json" } : {} }, ...r ? { body: JSON.stringify(r) } : {} });
  } catch (f) {
    throw n != null && n.aborted || f.name === "AbortError" ? f : new ur("Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7. Vui l\xF2ng th\u1EED l\u1EA1i.");
  }
  if (!u.ok) {
    let f = "";
    try {
      f = (await u.clone().json()).message || "";
    } catch {
    }
    const k = u.status === 401 && /Invalid or expired token/i.test(f) ? "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7. V\
ui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i." : f || (u.status === 404 ? "Kh\xF4ng t\xECm th\u1EA5y d\u1EEF li\u1EC7u \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u." :
    u.status === 429 ? "C\xF3 qu\xE1 nhi\u1EC1u y\xEAu c\u1EA7u. Vui l\xF2ng ch\u1EDD m\u1ED9t ch\xFAt r\u1ED3i th\u1EED l\u1EA1i." :
    "M\xE1y ch\u1EE7 kh\xF4ng th\u1EC3 x\u1EED l\xFD y\xEAu c\u1EA7u. Vui l\xF2ng th\u1EED l\u1EA1i.");
    throw new ur(`${k} (HTTP ${u.status})`, u.status);
  }
  if (u.status === 204) return { success: true, data: null };
  let c;
  try {
    c = await u.json();
  } catch (f) {
    throw n != null && n.aborted || f.name === "AbortError" ? f : new ur("Ph\u1EA3n h\u1ED3i m\xE1y ch\u1EE7 kh\xF4ng ph\u1EA3i JSON h\u1EE3p l\u1EC7.");
  }
  if (!c || typeof c != "object" || c.success === false) throw new ur("M\xE1y ch\u1EE7 tr\u1EA3 v\u1EC1 d\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c y\xEAu c\u1EA7u \
th\u1EA5t b\u1EA1i.");
  return c;
}
function $m(e) {
  if (e.success !== true || !e.data || typeof e.data.price != "number") throw new ur("B\u1ED9 gi\xE1 hi\u1EC7n t\u1EA1i tr\u1EA3 v\u1EC1 kh\xF4ng \u0111\xFAng \
\u0111\u1ECBnh d\u1EA1ng.");
  return e.data;
}
function Om(e) {
  if (e.success !== true || !e.data || typeof e.data != "object" || Array.isArray(e.data) || Object.values(e.data).some(
  (n) => !n || !Number.isFinite(n.price) || n.price <= 0 || !n.observed_at || !Number.isFinite(Date.parse(n.fetched_at))))
   throw new ur("Danh s\xE1ch b\xE1o gi\xE1 hi\u1EC7n t\u1EA1i tr\u1EA3 v\u1EC1 kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
  return e.data;
}
function ma(e, { enabled: n = true, stockId: t = null } = {}) {
  const r = [...new Set(e.filter(Boolean))].sort().join(","), l = n ? t ? `/api/stocks/${encodeURIComponent(t)}/quote` :
  r ? `/api/stocks/quotes?symbols=${encodeURIComponent(r)}` : null : null, [o, a] = D.useState({ url: null, data: {}, loading: false,
  error: "", providerStatus: null });
  return D.useEffect(() => {
    if (!l) return;
    let u = false, c, f, q = 0;
    const k = /* @__PURE__ */ new Map();
    let j = true;
    a({ url: l, data: {}, loading: true, error: "", providerStatus: null });
    const y = async () => {
      var C;
      f = new AbortController();
      const E = setTimeout(() => f.abort(), 14e3), M = Date.now();
      let b = {}, m = "", h = null;
      try {
        const [z, x] = await Promise.allSettled([je(t ? l : `${l}&poll=${q++}`, { signal: f.signal }), je("/api/stocks/q\
uotes/status", { signal: f.signal })]);
        if (x.status === "fulfilled" && (h = ((C = x.value) == null ? void 0 : C.data) || null), z.status === "rejected")
         throw z.reason;
        const _ = z.value, P = t ? $m(_) : null;
        b = P ? { [P.symbol || P.stock_code || r]: P } : Om(_), Object.keys(b).length ? Object.values(b).some((g) => g.stale) &&
        (m = "Intraday \u0111ang d\xF9ng gi\xE1 ghi nh\u1EADn g\u1EA7n nh\u1EA5t; s\u1EBD t\u1EF1 c\u1EADp nh\u1EADt.") :
        m = "Ch\u01B0a l\u1EA5y \u0111\u01B0\u1EE3c intraday; s\u1EBD t\u1EF1 th\u1EED l\u1EA1i.";
      } catch {
        m = "Ch\u01B0a c\u1EADp nh\u1EADt \u0111\u01B0\u1EE3c intraday; s\u1EBD t\u1EF1 th\u1EED l\u1EA1i.";
      } finally {
        clearTimeout(E);
      }
      if (u) return;
      for (const [z, x] of Object.entries(b)) {
        const _ = k.get(z), P = (_ == null ? void 0 : _.quote.fetched_at) === x.fetched_at ? _.at : Date.now();
        k.set(z, { quote: x, at: P });
      }
      const v = Object.fromEntries([...k].filter(([, z]) => Date.now() - z.at < 9e4).map(([z, x]) => [z, x.quote]));
      if (j && await new Promise((z) => setTimeout(z, Math.max(0, 350 - (Date.now() - M)))), u) return;
      j = false, a({ url: l, data: v, loading: false, error: m, providerStatus: h });
      const w = t ? 1 : r.split(",").filter(Boolean).length;
      c = setTimeout(y, Object.keys(v).length < w || m ? 5e3 : 3e4);
    };
    return y(), () => {
      u = true, clearTimeout(c), f == null || f.abort();
    };
  }, [l, t, r]), l ? o.url === l ? o : { data: {}, loading: true, error: "", providerStatus: null } : { data: {}, loading: false,
  error: "", providerStatus: null };
}
const Rm = { overview: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", "market-board": "M4 5h16v14H4zM7 9h10M7 13h4M14 13h3M7 16h6", portfolio: "M4 7h16v13H4zM8 7V5h8v2M8 12h8M\
8 16h5", detail: "M11 4a7 7 0 1 0 4.9 12L20 20l1-1-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z", recommendations: "\
m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15\
Z", advisor: "M7 8h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Zm2-4v4m6-4v4M8 13h.01M16 13h.01M9 1\
6h6" };
function Am({ name: e }) {
  return O.jsx("svg", { viewBox: "0 0 24 24", role: "img", focusable: "false", "aria-hidden": "true", children: O.jsx("p\
ath", { d: Rm[e] }) });
}
class Ut extends Error {
  constructor(n, t = null) {
    super(n), this.name = "ApiError", this.status = t;
  }
}
function Pc(e) {
  if (e.success !== true || !Array.isArray(e.data) || e.data.some((n) => !n || typeof n.id != "string")) throw new Ut("D\
anh s\xE1ch c\u1ED5 phi\u1EBFu tr\u1EA3 v\u1EC1 kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
  return e.pagination && Object.defineProperty(e.data, "pagination", { value: e.pagination, enumerable: false }), e.data;
}
function Um(e) {
  if (e.success !== true || !e.data || typeof e.data.id != "string" || !Array.isArray(e.data.price_history)) throw new Ut(
  "Chi ti\u1EBFt c\u1ED5 phi\u1EBFu tr\u1EA3 v\u1EC1 kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
  return e.data;
}
function bm(e) {
  if (e.success !== true || !e.data || !e.data.indicators || typeof e.data.observations != "number" || !e.data.quality ||
  !e.data.risk_plan || !e.data.expert_guidance || !Array.isArray(e.data.expert_guidance.score_breakdown)) throw new Ut("\
Ph\xE2n t\xEDch k\u1EF9 thu\u1EADt tr\u1EA3 v\u1EC1 kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
  return e.data;
}
function Bm(e) {
  if (e.success !== true || !e.data || typeof e.data.enabled != "boolean" || !Array.isArray(e.data.reasons)) throw new Ut(
  "Tr\u1EA1ng th\xE1i AI Gate tr\u1EA3 v\u1EC1 kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
  return e.data;
}
function Vm(e) {
  if (e.success !== true || !e.data || !Array.isArray(e.data.recommendations)) throw new Ut("\u0110\u1EC1 xu\u1EA5t c\u1ED5 phi\u1EBFu tr\u1EA3 v\u1EC1 kh\xF4\
ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
  return e.data;
}
function Hm(e) {
  if (e.success !== true || !e.data || !Array.isArray(e.data)) throw new Ut("L\u1ECBch s\u1EED \u0111\u1EC1 xu\u1EA5t tr\u1EA3 v\u1EC1 kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng\
.");
  return e.data;
}
function Qm(e) {
  if (e.success !== true || !e.data || !Array.isArray(e.data.coverage)) throw new Ut("Tr\u1EA1ng th\xE1i d\u1EEF li\u1EC7u \u0111\u1EC1 xu\u1EA5t tr\u1EA3 v\u1EC1 \
kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng.");
  return e.data;
}
function Km(e, n, t) {
  const r = new AbortController();
  t({ status: "loading", data: null, error: "" });
  const l = je(e, { signal: r.signal }).then((o) => {
    if (r.signal.aborted) return;
    const a = n(o);
    r.signal.aborted || t({ status: "success", data: a, error: "" });
  }).catch((o) => {
    r.signal.aborted || t({ status: "error", data: null, error: o.message });
  });
  return { cancel: () => r.abort(), done: l };
}
const Wm = (e) => e, zc = { status: "idle", data: null, error: "" }, qm = { status: "loading", data: null, error: "" };
function Pn(e, n = Wm) {
  const [t, r] = D.useState(0), [l, o] = D.useState({ ...zc, url: null, attempt: -1 });
  return D.useEffect(() => e ? Km(e, n, (a) => o({ ...a, url: e, attempt: t })).cancel : void 0, [e, n, t]), { ...e ? l.
  url === e && l.attempt === t ? l : qm : zc, retry: () => r((a) => a + 1) };
}
function $i({ url: e, children: n }) {
  let t;
  try {
    const r = new URL(e);
    ["https:", "http:"].includes(r.protocol) && (t = r.href);
  } catch {
  }
  return t ? O.jsxs("a", { className: "source-link", href: t, title: t, "aria-label": `${n} - ${t}`, target: "_blank", rel: "\
noopener noreferrer", onClick: (r) => r.stopPropagation(), children: [n, O.jsx("span", { "aria-hidden": "true", children: "\
 -" })] }) : O.jsx(i.Fragment, { children: n });
}
const va = (e) => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(Number(e || 0)),
Gm = (e) => e && Number.isFinite(Date.parse(e)) ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "sh\
ort", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(e)) : "Ch\u01B0a c\xF3 quote", ga = [{ key: "up", label: "T\u0103ng gi\xE1",
color: "up" }, { key: "down", label: "Gi\u1EA3m gi\xE1", color: "down" }, { key: "flat", label: "\u0110\u1EE9ng gi\xE1",
color: "flat" }];
function Ym({ stocks: e = [], quotes: n = {} }) {
  const t = D.useMemo(() => {
    const r = { up: { count: 0, volume: 0 }, down: { count: 0, volume: 0 }, flat: { count: 0, volume: 0 }, unknown: 0, quoted: 0,
    averageChange: null, latestQuoteAt: null }, l = [];
    for (const o of e) {
      const a = n[o.symbol];
      a && (r.quoted += 1, (!r.latestQuoteAt || Date.parse(a.observed_at) > Date.parse(r.latestQuoteAt)) && (r.latestQuoteAt =
      a.observed_at));
      const u = (a == null ? void 0 : a.change) ?? o.change, c = Number(u);
      if (u == null || !Number.isFinite(c)) {
        r.unknown += 1;
        continue;
      }
      l.push(c);
      const f = c > 0 ? "up" : c < 0 ? "down" : "flat";
      r[f].count += 1;
      const k = Number((a == null ? void 0 : a.volume_type) === "session" ? a.volume : null);
      Number.isFinite(k) && k > 0 && (r[f].volume += k);
    }
    return r.averageChange = l.length ? l.reduce((o, a) => o + a, 0) / l.length : null, r.classified = r.up.count + r.down.
    count + r.flat.count, r.totalVolume = r.up.volume + r.down.volume + r.flat.volume, r.maxVolume = Math.max(1, r.up.volume,
    r.down.volume, r.flat.volume), r;
  }, [e, n]);
  return O.jsxs("section", { className: "panel market-breadth-panel", "aria-labelledby": "market-breadth-heading", children: [
  O.jsxs("div", { className: "panel-header market-breadth-header", children: [O.jsxs("div", { children: [O.jsx("h3", { id: "\
market-breadth-heading", children: "\u0110\u1ED9 r\u1ED9ng th\u1ECB tr\u01B0\u1EDDng" }), O.jsxs("p", { className: "mute\
d-text", children: [e.length, " M\xE3 trong v\u0169 tr\u1EE5 || ", t.quoted, "/", e.length, " M\xE3 c\xF3 quote intraday c\u1EADp n\
h\u1EADt g\u1EA7n nh\u1EA5t ", Gm(t.latestQuoteAt)] })] }), O.jsxs("span", { className: "chip neutral", children: [O.jsx(
  "span", { className: t.averageChange != null && t.averageChange < 0 ? "negative" : "positive", children: t.averageChange ==
  null ? "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u" : `Bi\u1EBFn \u0111\u1ED9ng b\xECnh qu\xE2n ${t.averageChange >= 0 ?
  "+" : ""}${t.averageChange.toFixed(2)}%` })] })] }), O.jsx("div", { className: "breadth-counts", children: ga.map((r) => O.
  jsxs("article", { className: `breadth-count ${r.color}`, children: [O.jsx("span", { children: r.label }), O.jsx("stron\
g", { children: t[r.key].count }), O.jsx("small", { children: t.classified ? `${(t[r.key].count / t.classified * 100).toFixed(
  1)}% s\u1ED1 m\xE3 c\xF3 bi\u1EBFn \u0111\u1ED9ng` : "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u" })] }, r.key)) }), t.classified >
  0 && O.jsx("div", { className: "breadth-distribution", role: "img", "aria-label": ` rng: tng ${t.up.count}, gi\u1EA3m ${t.
  down.count}, \u1EE9ng gi ${t.flat.count}`, children: ga.map((r) => O.jsx("span", { className: `breadth-segment ${r.color}`,
  style: { width: `${t[r.key].count / t.classified * 100}%` }, title: `${r.label}: ${t[r.key].count}` }, r.key)) }), O.jsxs(
  "div", { className: "breadth-volume-heading", children: [O.jsx("strong", { children: "Kh\u1ED1i l\u01B0\u1EE3ng phi\xEAn theo nh\xF3m bi\u1EBFn \
\u0111\u1ED9ng" }), O.jsxs("span", { children: [va(t.totalVolume), " c\u1ED5 phi\u1EBFu"] })] }), O.jsx("div", { className: "\
breadth-volume-chart", role: "img", "aria-label": "Kh\u1ED1i l\u01B0\u1EE3ng phi\xEAn c\u1EE7a c\xE1c m\xE3 t\u0103ng gi\xE1, gi\u1EA3m gi\xE1 v\xE0 \u0111\u1EE9ng gi\xE1",
  children: ga.map((r) => O.jsxs("div", { className: "breadth-volume-column", title: `${r.label}: ${va(t[r.key].volume)}\
 c phi\u1EBFu`, children: [O.jsx("div", { className: "breadth-volume-track", children: O.jsx("span", { className: r.color,
  style: { height: `${t[r.key].volume / t.maxVolume * 100}%` } }) }), O.jsx("strong", { children: va(t[r.key].volume) }),
  O.jsx("small", { children: r.label })] }, r.key)) }), O.jsxs("p", { className: "breadth-disclaimer", children: ["Ph\xE2n \
lo\u1EA1i d\xF9ng bi\u1EBFn \u0111\u1ED9ng gi\xE1 m\u1EDBi nh\u1EA5t hi\u1EC7n c\xF3; kh\u1ED1i l\u01B0\u1EE3ng ch\u1EE7 \u0111\u1ED9ng l\u1EA5y t\u1EEB quote intraday theo phi\xEAn. Ngu\u1ED3n hi\u1EC7n t\u1EA1i kh\xF4ng t\xE1c\
h kh\u1ED1i l\u01B0\u1EE3ng ch\u1EE7 \u0111\u1ED9ng b\xEAn mua v\xE0 b\xEAn b\xE1n. ", t.unknown > 0 && `${t.unknown} m \
cha c m\u1EE9c bi\u1EBFn \u0111\u1ED9ng  ph\xE2n lo\u1EA1i.`] })] });
}
const Oi = { trend: 30, momentum: 25, rsi: 15, stability: 15, liquidity: 15 }, ya = [{ key: "trend", label: "Xu h\u01B0\u1EDBng gi\
\xE1", description: "Gi\xE1 so v\u1EDBi SMA20 v\xE0 h\u01B0\u1EDBng xu h\u01B0\u1EDBng" }, { key: "momentum", label: "\u0110\u1ED9\
ng l\u01B0\u1EE3ng", description: "Bi\u1EBFn \u0111\u1ED9ng gi\xE1 trong kho\u1EA3ng 10 phi\xEAn" }, { key: "rsi", label: "\
RSI c\xE2n b\u1EB1ng", description: "\u01AFu ti\xEAn v\xF9ng \u0111\u1ED9ng l\u01B0\u1EE3ng v\u1EEBa ph\u1EA3i, tr\xE1nh qu\xE1 mua" },
{ key: "stability", label: "An to\xE0n / r\u1EE7i ro", description: "\u0110i\u1EC3m cao h\u01A1n khi bi\u1EBFn \u0111\u1ED9ng g\u1EA7n \u0111\xE2y th\u1EA5p" },
{ key: "liquidity", label: "Thanh kho\u1EA3n", description: "X\u1EBFp h\u1EA1ng t\u01B0\u01A1ng \u0111\u1ED1i theo kh\u1ED1i l\u01B0\u1EE3ng 20 phi\xEAn" }],
Xm = (e) => e == null ? "-" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(e) + " ";
function Zm({ initialData: e, history: n = [], token: t, onAddToPortfolio: r }) {
  var l, o;
  const [a, u] = D.useState(() => {
    try {
      return { ...Oi, ...JSON.parse(localStorage.getItem("stockpilot.recommendation.criteria") || "{}") };
    } catch {
      return Oi;
    }
  }), [c, f] = D.useState(null), [k, j] = D.useState(false), [y, C] = D.useState(""), [E, M] = D.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("stockpilot.recommendation.saved") || "[]");
    } catch {
      return [];
    }
  }), [b, m] = D.useState(""), h = Object.values(a).reduce((g, I) => g + Number(I || 0), 0), v = D.useMemo(() => n.filter(
  (g) => Number(g.measured_count) > 0), [n]);
  D.useEffect(() => {
    localStorage.setItem("stockpilot.recommendation.criteria", JSON.stringify(a));
  }, [a]), D.useEffect(() => {
    f(null);
  }, [(o = e == null ? void 0 : e.run) == null ? void 0 : o.id]), D.useEffect(() => {
    t && je("/api/recommendations/saved", { token: t }).then(async (g) => {
      var I;
      if (!Array.isArray(g.data)) return;
      let B = [];
      try {
        B = JSON.parse(localStorage.getItem("stockpilot.recommendation.saved") || "[]");
      } catch {
        B = [];
      }
      const K = new Set(g.data.map((se) => se.id)), ie = B.filter((se) => (se == null ? void 0 : se.id) && !K.has(se.id) &&
      se.criteria && se.result).slice(0, 20), ye = [];
      for (const se of ie) try {
        const Ye = await je("/api/recommendations/saved", { method: "POST", body: { criteria: se.criteria, result: se.result },
        token: t });
        (I = Ye.data) != null && I.id && ye.push(Ye.data);
      } catch {
      }
      const mn = [...ye, ...g.data].slice(0, 20);
      M(mn), localStorage.setItem("stockpilot.recommendation.saved", JSON.stringify(mn));
    }).catch(() => {
    });
  }, [t]);
  async function w(g) {
    var I;
    g == null || g.preventDefault(), j(true), C("");
    try {
      const B = await je("/api/recommendations/personalized", { method: "POST", body: { criteria: a, limit: 10, horizon_days: 20 },
      token: t });
      f(B.data);
      try {
        const K = await je("/api/recommendations/saved", { method: "POST", body: { criteria: a, result: B.data }, token: t });
        (I = K.data) != null && I.id && (M((ie) => {
          const ye = [K.data, ...ie].slice(0, 20);
          return localStorage.setItem("stockpilot.recommendation.saved", JSON.stringify(ye)), ye;
        }), m(K.data.id));
      } catch {
        const K = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: (/* @__PURE__ */ new Date()).
        toISOString(), criteria: { ...a }, result: B.data };
        M((ie) => {
          const ye = [K, ...ie].slice(0, 20);
          return localStorage.setItem("stockpilot.recommendation.saved", JSON.stringify(ye)), m(K.id), ye;
        });
      }
    } catch (B) {
      C(B.message);
    } finally {
      j(false);
    }
  }
  function z(g) {
    g && (m(g.id), u(g.criteria || Oi), f(g.result || null), C(""));
  }
  async function x(g) {
    try {
      await je(`/api/recommendations/saved/${g}`, { method: "DELETE", token: t });
    } catch {
    }
    M((I) => {
      var B;
      const K = I.filter((ie) => ie.id !== g);
      return localStorage.setItem("stockpilot.recommendation.saved", JSON.stringify(K)), b === g && m(((B = K[0]) == null ?
      void 0 : B.id) || ""), K;
    });
  }
  const _ = (c == null ? void 0 : c.recommendations) || (e == null ? void 0 : e.recommendations) || [], P = (c == null ? void 0 : c.learning) || (e == null ? void 0 : e.learning);
  return O.jsxs("section", { className: "recommendations-page recommendation-workbench", children: [((l = e == null ? void 0 :
  e.risk) == null ? void 0 : l.concentration_warning) && O.jsx("p", { className: "recommendation-risk-banner", role: "st\
atus", children: `T\u1EF7 tr\u1ECDng ng\xE0nh cao nh\u1EA5t trong v\u1EE3t \u0111\u1EC1 xu\u1EA5t: ${e.risk.max_sector_share_pct}\
%. C\u1EA7n xem xt r\u1EE7i ro t\u1EADp trung.` }), O.jsxs("div", { className: "page-heading", children: [O.jsxs("div", {
  children: [O.jsx("h2", { children: "\u0110\u1EC1 xu\u1EA5t theo ti\xEAu ch\xED c\u1EE7a b\u1EA1n" }), O.jsx("p", { children: "\
\u0110i\u1EC1u ch\u1EC9nh \u01B0u ti\xEAn \u0111\u1EC3 x\u1EBFp h\u1EA1ng l\u1EA1i to\xE0n b\u1ED9 m\xE3 \u0111\u1EE7 d\u1EEF li\u1EC7u l\u1ECBch s\u1EED." })] }),
  O.jsx("span", { className: "chip neutral", children: "M\xF4 h\xECnh gi\u1EA3i th\xEDch \u0111\u01B0\u1EE3c" })] }), O.
  jsxs("section", { className: "panel recommendation-criteria-panel", children: [O.jsxs("div", { className: "recommendat\
ion-section-heading", children: [O.jsxs("div", { children: [O.jsx("span", { className: "eyebrow accent", children: "Ti\xEAu\
 ch\xED \u0111\u1EA7u t\u01B0" }), O.jsx("h3", { children: "B\u1EA1n mu\u1ED1n \u01B0u ti\xEAn \u0111i\u1EC1u g\xEC?" }),
  O.jsx("p", { className: "muted-text", children: "T\u0103ng tr\u1ECDng s\u1ED1 \u0111\u1EC3 ti\xEAu ch\xED \u1EA3nh h\u01B0\u1EDFng nhi\u1EC1u h\u01A1n \u0111\u1EBFn \u0111i\u1EC3m t\u1ED5ng. M\u1ED7i ti\xEAu\
 ch\xED \u0111\u01B0\u1EE3c chu\u1EA9n h\xF3a khi t\xEDnh." })] }), O.jsxs("span", { className: "criteria-total", children: [
  "T\u1ED5ng tr\u1ECDng s\u1ED1 ", O.jsx("strong", { children: h })] })] }), O.jsxs("form", { onSubmit: w, children: [O.
  jsx("div", { className: "criteria-grid", children: ya.map((g) => O.jsxs("label", { className: "criteria-control", children: [
  O.jsxs("span", { className: "criteria-label", children: [O.jsx("strong", { children: g.label }), O.jsxs("b", { children: [
  a[g.key], " \u0110i\u1EC3m \u01B0u ti\xEAn"] })] }), O.jsx("small", { children: g.description }), O.jsx("input", { type: "\
range", min: "0", max: "60", step: "5", value: a[g.key], "aria-label": `Tr\u1ECDng s ${g.label}`, onChange: (I) => u((B) => ({
  ...B, [g.key]: Number(I.target.value) })) })] }, g.key)) }), O.jsxs("div", { className: "criteria-actions", children: [
  O.jsx("p", { className: "muted-text", children: "Ch\u1EC9 ti\xEAu k\u1EF9 thu\u1EADt c\xF3 d\u1EEF li\u1EC7u m\u1EDBi \u0111\u01B0\u1EE3c ch\u1EA5m \u0111i\u1EC3m; tin t\u1EE9c, t\xE2m l\xFD v\xE0 v\
\u0129 m\xF4 ch\u01B0a \u0111\u01B0\u1EE3c c\u1ED9ng \u0111i\u1EC3m n\u1EBFu ch\u01B0a c\xF3 ngu\u1ED3n x\xE1c minh trong m\xF4 h\xECnh." }),
  O.jsxs("div", { className: "criteria-action-buttons", children: [O.jsxs("div", { className: "saved-proposal-picker", children: [
  O.jsx("label", { htmlFor: "saved-proposal-select", children: "\u0110\u1EC1 xu\u1EA5t \u0111\xE3 l\u01B0u" }), O.jsxs("\
select", { id: "saved-proposal-select", className: "saved-proposal-select", value: b, onChange: (g) => m(g.target.value),
  disabled: !E.length, children: [O.jsx("option", { value: "", children: E.length ? "Ch\u1ECDn snapshot" : "Ch\u01B0a c\xF3 b\u1EA3n \
l\u01B0u" }), E.map((g) => {
    var I, B;
    return O.jsx("option", { value: g.id, children: `${new Date(g.createdAt).toLocaleString("vi-VN")}  ${((B = (I = g.result) ==
    null ? void 0 : I.recommendations) == null ? void 0 : B.length) || 0} m` }, g.id);
  })] }), O.jsx("button", { type: "button", className: "ghost-btn small-btn", disabled: !b, onClick: () => z(E.find((g) => g.
  id === b)), children: "Load" }), O.jsx("button", { type: "button", className: "ghost-btn small-btn danger-btn", disabled: !b,
  onClick: () => x(b), children: "X\xF3a" })] }), O.jsx("button", { type: "button", className: "ghost-btn", onClick: () => u(
  Oi), children: "Kh\xF4i ph\u1EE5c m\u1EB7c \u0111\u1ECBnh" }), O.jsx("button", { type: "submit", className: "primary-b\
tn", disabled: k || h === 0, children: k ? "\u0110ang x\u1EBFp h\u1EA1ng -" : "T\u1EA1o \u0111\u1EC1 xu\u1EA5t c\xE1 nh\xE2n" })] })] })] }),
  false && O.jsxs("section", { className: "saved-proposals", "aria-labelledby": "saved-proposals-title", children: [O.jsxs("div",
  { className: "recommendation-section-heading", children: [O.jsxs("div", { children: [O.jsx("span", { className: "eyebr\
ow accent", children: "L\u01AFU TR\u1EEE" }), O.jsx("h3", { id: "saved-proposals-title", children: "\u0110\u1EC1 xu\u1EA5t \u0111\xE3 t\u1EA1o" }),
  O.jsx("p", { className: "muted-text", children: "Snapshot b\u1EA5t bi\u1EBFn; ch\u1EC9 c\xF3 th\u1EC3 Load ho\u1EB7c X\xF3a." })] }),
  O.jsxs("span", { className: "chip neutral", children: [E.length, "/20"] })] }), E.length ? O.jsx("div", { className: "\
saved-proposals-list", children: E.map((g) => {
    var I, B;
    return O.jsxs("article", { className: "saved-proposal", children: [O.jsxs("div", { children: [O.jsx("strong", { children: new Date(
    g.createdAt).toLocaleString("vi-VN") }), O.jsx("small", { children: Object.entries(g.criteria || {}).map(([K, ie]) => `${K}\
: ${ie}`).join("  ") }), O.jsxs("small", { children: [((B = (I = g.result) == null ? void 0 : I.recommendations) == null ?
    void 0 : B.length) || 0, "C\xE1c m\xE3 \u0111\u01B0\u1EE3c \u0111\u1EC1 xu\u1EA5t"] })] }), O.jsxs("div", { className: "\
saved-proposal-actions", children: [O.jsx("button", { type: "button", className: "ghost-btn small-btn", onClick: () => z(
    g), children: "Load" }), O.jsx("button", { type: "button", className: "ghost-btn small-btn danger-btn", onClick: () => x(
    g.id), children: "Xa" })] })] }, g.id);
  }) }) : O.jsx("p", { className: "muted-text saved-proposals-empty", children: "Ch\u01B0a c\xF3 \u0111\u1EC1 xu\u1EA5t \u0111\xE3 l\u01B0u." })] }),
  y && O.jsx("p", { role: "alert", className: "error-text", children: y })] }), O.jsxs("div", { className: "recommendati\
on-grid personalized-results", children: [O.jsxs("section", { className: "panel insights-panel", children: [O.jsxs("div",
  { className: "recommendation-section-heading", children: [O.jsxs("div", { children: [O.jsx("h3", { children: c ? "K\u1EBFt \
qu\u1EA3 theo ti\xEAu ch\xED \u0111\xE3 ch\u1ECDn" : "\u0110\u1EC1 xu\u1EA5t hi\u1EC7n t\u1EA1i" }), O.jsx("p", { className: "\
muted-text", children: c ? ` r\xFAt g\u1ECDn: ${c.eligible_count} m\xE3 \u0111\u1EE7 \xEDt nh\u1EA5t 50 phi\xEAn.` : "D\u1EEF\
 li\u1EC7u snapshot g\u1EA7n nh\u1EA5t; h\xE3y t\u1EA1o \u0111\u1EC1 xu\u1EA5t c\xE1 nh\xE2n \u0111\u1EC3 x\u1EBFp h\u1EA1ng l\u1EA1i theo b\u1ED9 l\u1ECDc." }),
  O.jsx("div", { className: "recommendation-signal-legend", children: [O.jsx("span", { children: "- T\xEDch c\u1EF1c: \u0111\u1ED3ng thu\u1EADn\
 xu h\u01B0\u1EDBng" }), O.jsx("span", { children: "- Trung t\xEDnh: c\u1EA7n x\xE1c nh\u1EADn th\xEAm" }), O.jsx("span",
  { children: "- Th\u1EADn tr\u1ECDng: t\xEDn hi\u1EC7u suy y\u1EBFu" })] })] }), _.length > 0 && O.jsxs("span", { className: "\
chip success", children: [_.length, " m\xE3"] })] }), _.length ? O.jsx("ol", { className: "insights-list personalized-li\
st", children: _.map((g) => {
    var I, B, K, ie, ye, mn, se, Ye, L, R, U, W, X, vn, Ae, _n, Ue, gn, Er, Tr, Pr, zr, Mr, Lr, Ir, Fr, bt, Dr, Jl, s, $r,
    Or, Rr, Ar, Ur, br, Br, Vr, Hr, Qr, Kr, Wr, qr, Gr, Yr, Xr, Zr, ue, Bt, Un, ei, bn, Vt, dt, on, re, Xe, yn, ni, Cn, ht,
    be, ti, ft, ri, xn, En, Ht, li, Qt, ii, pt, Bn, Jr, el, pe, mt, nl, tl, rl, vt, gt, yt, Vn, ll;
    const xt = Number(g.score || 0), oi = xt >= 75 ? "high" : xt >= 55 ? "medium" : "low", jt = ((tl = g.stock) == null ?
    void 0 : tl.code) || g.symbol, Ie = (c == null ? void 0 : c.generated_at) || ((rl = e == null ? void 0 : e.run) == null ?
    void 0 : rl.created_at) || ((vt = e == null ? void 0 : e.run) == null ? void 0 : vt.as_of), kt = c ? "personalized" :
    "scheduled";
    return O.jsxs("li", { children: [O.jsxs("div", { className: "recommendation-stock-heading", children: [O.jsx("strong",
    { children: jt }), O.jsxs("span", { className: `recommendation-score score-${oi}`, children: [O.jsx("b", { children: xt.
    toFixed(1) }), O.jsx("small", { children: "/100 \u0111i\u1EC3m" })] }), O.jsxs("span", { className: "rank-label", children: [
    "H\u1EA1ng ", g.rank] }), O.jsx("button", { type: "button", className: "ghost-btn small-btn recommendation-add-btn",
    onClick: () => {
      var Be, Ze, wt;
      return r == null ? void 0 : r({ symbol: jt, name: ((Be = g.stock) == null ? void 0 : Be.name) || g.name || jt, price: g.
      entry_price, recommendationContext: { source: kt, symbol: jt, model: (c == null ? void 0 : c.model) || ((Ze = e ==
      null ? void 0 : e.run) == null ? void 0 : Ze.model) || "short_term_rule_v2", generated_at: Ie, horizon_days: Number(
      g.horizon_days || ((wt = e == null ? void 0 : e.run) == null ? void 0 : wt.horizon_days) || 20), score: xt, rank: Number(
      g.rank), expected_entry_price: Number(g.entry_price), criteria: (c == null ? void 0 : c.criteria) || null } });
    }, children: " Th\xEAm v\xE0o danh m\u1EE5c" })] }), ((gt = g.rationale) == null ? void 0 : gt.score_parts) && O.jsx(
    "div", { className: "score-breakdown", children: ya.map((Be) => {
      const Ze = Math.max(0, Math.min(100, Number(g.rationale.score_parts[Be.key] || 0)));
      return O.jsxs("span", { className: `criterion-${Be.key}`, title: `${Be.label}: ${Ze} \u0111i\u1EC3m`, children: [O.
      jsx("small", { children: Be.label }), O.jsxs("b", { children: [Ze.toFixed(0), O.jsx("i", { children: "/100" })] }),
      O.jsx("span", { className: "criterion-meter", children: O.jsx("i", { style: { width: `${Ze}%` } }) })] }, Be.key);
    }) }), O.jsx("div", { className: "recommendation-result-footer", children: O.jsxs("div", { className: "recommendatio\
n-data-chips", children: [O.jsxs("span", { children: ["Gi\xE1 tham chi\u1EBFu ", O.jsx("b", { children: Xm(g.entry_price) }),
    O.jsx("small", { children: ((B = (I = g.rationale) == null ? void 0 : I.reference_plan) == null ? void 0 : B.price_source) ===
    "intraday" ? "Intraday" : "EOD fallback" })] }), O.jsxs("span", { children: ["RSI ", O.jsx("b", { children: ((Vn = (yt =
    g.rationale) == null ? void 0 : yt.indicators) == null ? void 0 : Vn.rsi14) == null ? "-" : Number(g.rationale.indicators.
    rsi14).toFixed(1) })] }), O.jsxs("span", { className: "recommendation-technical-score", children: ["K\u1EF9 thu\u1EADt ",
    O.jsx("b", { children: ((K = g.rationale) == null ? void 0 : K.technical_score) == null ? "-" : `${Number(g.rationale.
    technical_score).toFixed(0)}/100` })] }), O.jsxs("div", { className: "recommendation-signal-chips", children: [O.jsx(
    "span", { className: "signal-chip " + ((((ye = (ie = g.rationale) == null ? void 0 : ie.technical_confirmation) == null ?
    void 0 : ye.ichimoku) || ((Ye = (se = (mn = g.rationale) == null ? void 0 : mn.indicators) == null ? void 0 : se.ichimoku) ==
    null ? void 0 : Ye.cloud)) === "above_cloud" ? "signal-positive" : (((R = (L = g.rationale) == null ? void 0 : L.technical_confirmation) ==
    null ? void 0 : R.ichimoku) || ((X = (W = (U = g.rationale) == null ? void 0 : U.indicators) == null ? void 0 : W.ichimoku) ==
    null ? void 0 : X.cloud)) === "below_cloud" ? "signal-negative" : "signal-neutral"), title: "Ichimoku: xu h\u01B0\u1EDBng v\xE0 v\
\u1ECB tr\xED gi\xE1 so v\u1EDBi m\xE2y", children: ["Ichimoku ", (((Ae = (vn = g.rationale) == null ? void 0 : vn.technical_confirmation) ==
    null ? void 0 : Ae.ichimoku) || ((gn = (Ue = (_n = g.rationale) == null ? void 0 : _n.indicators) == null ? void 0 :
    Ue.ichimoku) == null ? void 0 : gn.cloud)) === "above_cloud" ? "Tr\xEAn m\xE2y" : (((Tr = (Er = g.rationale) == null ?
    void 0 : Er.technical_confirmation) == null ? void 0 : Tr.ichimoku) || ((Mr = (zr = (Pr = g.rationale) == null ? void 0 :
    Pr.indicators) == null ? void 0 : zr.ichimoku) == null ? void 0 : Mr.cloud)) === "below_cloud" ? "D\u01B0\u1EDBi m\xE2y" :
    (((Ir = (Lr = g.rationale) == null ? void 0 : Lr.technical_confirmation) == null ? void 0 : Ir.ichimoku) || ((Dr = (bt =
    (Fr = g.rationale) == null ? void 0 : Fr.indicators) == null ? void 0 : bt.ichimoku) == null ? void 0 : Dr.cloud)) ===
    "inside_cloud" ? "Trong my" : "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u"] }), O.jsx("span", { className: "signal-chi\
p " + ((((s = (Jl = g.rationale) == null ? void 0 : Jl.technical_confirmation) == null ? void 0 : s.macd) || ((Rr = (Or =
    ($r = g.rationale) == null ? void 0 : $r.indicators) == null ? void 0 : Or.macd) == null ? void 0 : Rr.state)) === "\
bullish" ? "signal-positive" : (((Ur = (Ar = g.rationale) == null ? void 0 : Ar.technical_confirmation) == null ? void 0 :
    Ur.macd) || ((Vr = (Br = (br = g.rationale) == null ? void 0 : br.indicators) == null ? void 0 : Br.macd) == null ? void 0 :
    Vr.state)) === "bearish" ? "signal-negative" : "signal-neutral"), title: "MACD 12/26/9: \u0111\u1ED9ng l\u01B0\u1EE3ng v\xE0 giao c\u1EAFt",
    children: ["MACD ", (((Qr = (Hr = g.rationale) == null ? void 0 : Hr.technical_confirmation) == null ? void 0 : Qr.macd) ||
    ((qr = (Wr = (Kr = g.rationale) == null ? void 0 : Kr.indicators) == null ? void 0 : Wr.macd) == null ? void 0 : qr.
    state)) === "bullish" ? "\u0110\u1ED9ng l\u01B0\u1EE3ng t\u0103ng" : (((Yr = (Gr = g.rationale) == null ? void 0 : Gr.
    technical_confirmation) == null ? void 0 : Yr.macd) || ((ue = (Zr = (Xr = g.rationale) == null ? void 0 : Xr.indicators) ==
    null ? void 0 : Zr.macd) == null ? void 0 : ue.state)) === "bearish" ? "\u0110\u1ED9ng l\u01B0\u1EE3ng gi\u1EA3m" : (((Un =
    (Bt = g.rationale) == null ? void 0 : Bt.technical_confirmation) == null ? void 0 : Un.macd) || ((Vt = (bn = (ei = g.
    rationale) == null ? void 0 : ei.indicators) == null ? void 0 : bn.macd) == null ? void 0 : Vt.state)) === "neutral" ?
    "Trung tnh" : "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u"] }), O.jsx("span", { className: "signal-chip " + ((((on = (dt =
    g.rationale) == null ? void 0 : dt.technical_confirmation) == null ? void 0 : on.bollinger) || ((yn = (Xe = (re = g.
    rationale) == null ? void 0 : re.indicators) == null ? void 0 : Xe.bollinger) == null ? void 0 : yn.position)) === "\
above_upper" ? "signal-negative" : "signal-neutral"), title: "Bollinger Bands: bi\u1EBFn \u0111\u1ED9ng v\xE0 v\xF9ng qu\xE1 xa trung b\xECnh",
    children: ["Bollinger ", (((Cn = (ni = g.rationale) == null ? void 0 : ni.technical_confirmation) == null ? void 0 :
    Cn.bollinger) || ((ti = (be = (ht = g.rationale) == null ? void 0 : ht.indicators) == null ? void 0 : be.bollinger) ==
    null ? void 0 : ti.position)) === "above_upper" ? "V\u01B0\u1EE3t d\u1EA3i tr\xEAn" : (((ri = (ft = g.rationale) == null ?
    void 0 : ft.technical_confirmation) == null ? void 0 : ri.bollinger) || ((Ht = (En = (xn = g.rationale) == null ? void 0 :
    xn.indicators) == null ? void 0 : En.bollinger) == null ? void 0 : Ht.position)) === "below_lower" ? "D\u01B0\u1EDBi d\u1EA3i d\u01B0\u1EDBi" :
    (((Qt = (li = g.rationale) == null ? void 0 : li.technical_confirmation) == null ? void 0 : Qt.bollinger) || ((Bn = (pt =
    (ii = g.rationale) == null ? void 0 : ii.indicators) == null ? void 0 : pt.bollinger) == null ? void 0 : Bn.position)) ===
    "upper_half" ? "N\u1EEDa tr\xEAn d\u1EA3i" : (((el = (Jr = g.rationale) == null ? void 0 : Jr.technical_confirmation) ==
    null ? void 0 : el.bollinger) || ((nl = (mt = (pe = g.rationale) == null ? void 0 : pe.indicators) == null ? void 0 :
    mt.bollinger) == null ? void 0 : nl.position)) === "lower_half" ? "N\u1EEDa d\u01B0\u1EDBi d\u1EA3i" : "Ch\u01B0a \u0111\u1EE7 d\u1EEF l\
i\u1EC7u"] })] }), O.jsxs("span", { children: ["Quan s\xE1t ", O.jsxs("b", { children: [((ll = g.rationale) == null ? void 0 :
    ll.observations) || "-", " phi\xEAn"] })] })] }) })] }, g.id || g.stock_id || g.symbol);
  }) }) : O.jsx("p", { className: "muted-text", children: c ? "Ch\u01B0a c\xF3 m\xE3 \u0111\u1EA1t ng\u01B0\u1EE1ng \u0111i\u1EC3m v\u1EDBi tr\u1ECDng s\u1ED1 n\xE0y. H\xE3y \u0111i\u1EC1u ch\u1EC9\
nh ti\xEAu ch\xED r\u1ED3i th\u1EED l\u1EA1i." : "Ch\u01B0a c\xF3 \u0111\u1EC1 xu\u1EA5t kh\u1EA3 d\u1EE5ng." }), O.jsx(
  "p", { className: "analysis-disclaimer", children: "\u0110i\u1EC3m s\u1ED1 h\u1ED7 tr\u1EE3 nghi\xEAn c\u1EE9u, kh\xF4ng ph\u1EA3i l\u1EDDi khuy\xEAn hay l\u1EC7nh mua b\xE1n." })] }),
  O.jsxs("section", { className: "panel learning-panel", children: [O.jsx("span", { className: "eyebrow accent", children: "\
V\xD2NG PH\u1EA2N H\u1ED2I" }), O.jsx("h3", { children: "Hi\u1EC7u qu\u1EA3 c\xE1c \u0111\u1EE3t \u0111\u1EC1 xu\u1EA5t c\u1EE7a h\u1EC7 th\u1ED1ng" }),
  O.jsx("p", { className: "muted-text", children: "M\u1ED7i d\xF2ng l\u1ECBch s\u1EED l\xE0 m\u1ED9t \u0111\u1EE3t \u0111\u1EC1 xu\u1EA5t chung \u0111\u01B0\u1EE3c t\u1EA1o theo l\u1ECBch. H\u1EC7 th\u1ED1n\
g so gi\xE1 t\u1EA1i th\u1EDDi \u0111i\u1EC3m \u0111\u1EC1 xu\u1EA5t v\u1EDBi gi\xE1 sau t\u1ED1i \u0111a 20 phi\xEAn: l\u1EE3i nhu\u1EADn d\u01B0\u01A1ng \u0111\u01B0\u1EE3c t\xEDnh l\xE0 m\u1ED9t m\xE3 d\u1EF1 b\xE1o \u0111\xFAng. -T\u1EF7 l\u1EC7 \u0111\xFAng\
- l\xE0 ph\u1EA7n tr\u0103m m\xE3 c\xF3 k\u1EBFt qu\u1EA3 \u0111\xFAng; -l\u1EE3i nhu\u1EADn trung b\xECnh- l\xE0 m\u1EE9c sinh l\u1EDDi trung b\xECnh c\u1EE7a c\xE1c m\xE3 \u0111\xF3." }),
  O.jsxs("div", { className: "learning-definition", children: [O.jsx("strong", { children: "L\u1ECBch s\u1EED chung v\xE0 k\u1EBFt qu\u1EA3 t\u1EEBn\
g m\xE3 l\xE0 hai th\u01B0\u1EDBc \u0111o ri\xEAng." }), O.jsxs("span", { children: ["B\u1EA3ng b\xEAn d\u01B0\u1EDBi \u0111o c\xE1c \u0111\u1EE3t \u0111\u1EC1 xu\u1EA5t c\
hung. Khi b\u1EA1n th\xEAm m\xE3 t\u1EEB k\u1EBFt qu\u1EA3 v\xE0 l\u01B0u giao d\u1ECBch, \u1EE9ng d\u1EE5ng s\u1EBD l\u01B0u \u0111i\u1EC3m, gi\xE1 tham chi\u1EBFu v\xE0 k\u1EF3 h\u1EA1n c\xF9ng giao d\u1ECBch; m\u1EE5c ",
  O.jsx("b", { children: "Theo d\xF5i m\xE3 th\xEAm t\u1EEB \u0111\u1EC1 xu\u1EA5t" }), " trong Danh m\u1EE5c c\xE1 nh\xE2n s\u1EBD so g\
i\xE1 th\u1EF1c t\u1EBF c\u1EE7a v\u1ECB th\u1EBF v\xE0 k\u1EBFt qu\u1EA3 cu\u1ED1i k\u1EF3 h\u1EA1n."] })] }), O.jsx("p",
  { className: "muted-text", children: "Khi c\xF3 \u0111\u1EE7 d\u1EEF li\u1EC7u \u0111\xE1nh gi\xE1, k\u1EBFt qu\u1EA3 t\u1EEBng ti\xEAu ch\xED t\u1EEB c\xE1c \u0111\u1EE3t chung c\xF3 th\u1EC3 \u0111i\u1EC1u c\
h\u1EC9nh nh\u1EB9 tr\u1ECDng s\u1ED1 \u0111\u1EC1 xu\u1EA5t t\u01B0\u01A1ng lai. \u0110\xE2y l\xE0 \u0111i\u1EC1u ch\u1EC9nh th\u1ED1ng k\xEA, kh\xF4ng ch\u1EE9ng minh quan h\u1EC7 nh\xE2n qu\u1EA3." }),
  O.jsxs("div", { className: "learning-stat-grid", children: [O.jsxs("div", { children: [O.jsx("small", { children: "\u0110\u1EE3t\
 c\xF3 k\u1EBFt qu\u1EA3" }), O.jsx("strong", { children: v.length })] }), O.jsxs("div", { children: [O.jsx("small", { children: "\
Hit rate TB c\xE1c \u0111\u1EE3t" }), O.jsx("strong", { children: v.length ? `${(v.reduce((g, I) => g + Number(I.hit_rate_pct ||
  0), 0) / v.length).toFixed(1)}%` : "-" })] }), O.jsxs("div", { children: [O.jsx("small", { children: "M\xE3 \u1EA3o theo ti\xEAu \
ch\xED" }), O.jsx("strong", { children: (P == null ? void 0 : P.sample_count) ?? 0 })] })] }), O.jsxs("div", { className: `\
learning-status ${(P == null ? void 0 : P.status) === "calibrated" ? "is-ready" : ""}`, role: "status", children: [O.jsx(
  "strong", { children: (P == null ? void 0 : P.status) === "calibrated" ? " b\u1EADt \u0111i\u1EC1u ch\u1EC9nh l\u1ECBch s\u1EED" :
  "\u0110ang thu th\u1EADp d\u1EEF li\u1EC7u \u0111\xE1nh gi\xE1" }), O.jsx("span", { children: P ? `${P.sample_count}/${P.
  minimum_samples} k\u1EBFt qu\u1EA3 c\u1EA7n thi\u1EBFt.` : "Ch\u01B0a c\xF3 \u0111\u1EE7 k\u1EBFt qu\u1EA3 l\u1ECBch s\u1EED theo t\u1EEBng ti\xEAu ch\xED; tr\u1ECDng s\u1ED1 h\u1ECD\
c v\u1EABn \u1EDF m\u1EE9c trung b\xECnh." })] }), (P == null ? void 0 : P.evidence) && O.jsx("div", { className: "calib\
ration-list", children: ya.map((g) => O.jsxs("span", { children: [g.label, O.jsxs("b", { children: [P.evidence[g.key].adjustment.
  toFixed(2), ""] }), O.jsxs("small", { children: [P.evidence[g.key].samples, " m\u1EABu"] })] }, g.key)) }), O.jsx("h4",
  { children: "L\u1ECBch s\u1EED c\xE1c \u0111\u1EE3t \u0111\u1EC1 xu\u1EA5t chung" }), n.length ? O.jsx("div", { className: "\
table-wrap", children: O.jsxs("table", { children: [O.jsx("thead", { children: O.jsxs("tr", { children: [O.jsx("th", { children: "\
Ng\xE0y \u0111\u1EC1 xu\u1EA5t" }), O.jsx("th", { children: "S\u1ED1 m\xE3 \u0111\xFAng / t\u1ED5ng m\xE3" }), O.jsx("th",
  { children: "M\xE3 d\u1EF1 b\xE1o \u0111\xFAng" }), O.jsx("th", { children: "Sinh l\u1EDDi trung b\xECnh c\xE1c m\xE3" })] }) }),
  O.jsx("tbody", { children: n.slice(0, 8).map((g) => O.jsxs("tr", { children: [O.jsx("td", { children: g.as_of }), O.jsxs(
  "td", { children: [g.measured_count, "/", g.selected_count] }), O.jsx("td", { children: g.hit_rate_pct == null ? "\u0110ang\
 ch\u1EDD" : `${g.hit_rate_pct}%` }), O.jsx("td", { children: g.average_forward_return_pct == null ? "-" : `${Number(g.average_forward_return_pct).
  toFixed(2)}%` })] }, g.id)) })] }) }) : O.jsx("p", { className: "muted-text", children: "Ch\u01B0a c\xF3 k\u1EF3 \u0111\xE1nh gi\xE1 \u0111\u1EE7 d\u1EEF li\u1EC7\
u." })] })] })] });
}
const xa = (e) => e == null ? "-" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(e)) + " ",
ja = (e) => e ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(
e)) : "-";
function Jm({ entries: e = [] }) {
  var n, t, r, l;
  return O.jsxs("section", { className: "recommendation-tracking", "aria-labelledby": "recommendation-tracking-title", children: [
  O.jsxs("div", { className: "recommendation-tracking-heading", children: [O.jsxs("div", { children: [O.jsx("h3", { id: "\
recommendation-tracking-title", children: "Theo d\xF5i m\xE3 th\xEAm t\u1EEB \u0111\u1EC1 xu\u1EA5t" }), O.jsx("p", { children: "\
M\u1ED7i giao d\u1ECBch \u0111\u01B0\u1EE3c li\xEAn k\u1EBFt v\u1EDBi \u0111i\u1EC3m, gi\xE1 tham chi\u1EBFu v\xE0 k\u1EF3 h\u1EA1n t\u1EA1i l\xFAc b\u1EA1n th\xEAm m\xE3." })] }),
  O.jsxs("span", { className: "chip neutral", children: [e.length, " giao d\u1ECBch"] })] }), e.length ? O.jsxs(i.Fragment,
  { children: [O.jsx("div", { className: "table-wrap recommendation-tracking-table", children: O.jsxs("table", { children: [
  O.jsx("thead", { children: O.jsxs("tr", { children: [O.jsx("th", { children: "M\xE3 / \u0111\u1EC1 xu\u1EA5t" }), O.jsx(
  "th", { children: "Gi\xE1 v\xE0o th\u1EF1c t\u1EBF" }), O.jsx("th", { children: "Gi\xE1 hi\u1EC7n t\u1EA1i" }), O.jsx(
  "th", { children: "Bi\u1EBFn \u0111\u1ED9ng t\u1EEB gi\xE1 v\xE0o" }), O.jsx("th", { children: "K\u1EBFt qu\u1EA3 d\u1EF1 b\xE1o" })] }) }),
  O.jsx("tbody", { children: e.map((o) => {
    const a = o.evaluation || {}, u = o.recommendation || {}, c = o.current_quote, f = (c == null ? void 0 : c.price) ??
    o.current_eod_price, k = Number(o.actual_entry_price), j = f != null && k > 0 ? (Number(f) / k - 1) * 100 : null, y = a.
    status === "pending" ? "pending" : a.outcome === "positive" ? "positive" : a.outcome === "negative" ? "negative" : "\
flat";
    return O.jsxs("tr", { children: [O.jsxs("td", { children: [O.jsx("strong", { children: o.symbol }), O.jsxs("small", {
    children: ["\u0110i\u1EC3m: ", Number(u.score || 0).toFixed(1), " - ", ja(u.generated_at)] }), O.jsx("small", { children: o.
    position_status === "active" ? "C\xF2n v\u1ECB th\u1EBF" : "\u0110\xFAng / kh\xF4ng c\xF2n v\u1ECB th\u1EBF" })] }),
    O.jsxs("td", { children: [xa(o.actual_entry_price), O.jsx("small", { children: ja(o.traded_at) })] }), O.jsxs("td", {
    children: [xa(f), O.jsx("small", { children: c ? `Intraday  ${ja(c.observed_at)}` : "Gi EOD" })] }), O.jsx("td", { className: j ==
    null ? "" : j >= 0 ? "positive" : "negative", children: j == null ? "Ch\u01B0a c\xF3 gi\xE1" : `${j >= 0 ? "+" : ""}${j.
    toFixed(2)}%` }), O.jsxs("td", { children: [O.jsx("span", { className: `recommendation-outcome is-${y}`, children: a.
    status === "pending" ? `\u0110ang ch\u1EDD ${a.sessions_observed || 0}/${a.horizon_days || u.horizon_days} phi\xEAn` :
    a.outcome === "positive" ? `\u0110\xFAng chi\u1EC1u \xB7 +${Number(a.forward_return_pct).toFixed(2)}%` : a.outcome ===
    "negative" ? `Ng\u01B0\u1EE3c chi\u1EC1u \xB7 ${Number(a.forward_return_pct).toFixed(2)}%` : `\u0110i ngang  ${Number(
    a.forward_return_pct || 0).toFixed(2)}%` }), O.jsxs("small", { children: ["So gi\xE1 tham chi\u1EBFu ", xa(u.expected_entry_price),
    " sau ", a.horizon_days || u.horizon_days, " phi\xEAn"] })] })] }, o.transaction_id);
  }) })] }) }), O.jsxs("p", { className: "recommendation-tracking-note", children: ["-Bi\u1EBFn \u0111\u1ED9ng t\u1EEB gi\xE1 v\xE0o- so gi\xE1 hi\u1EC7n \
t\u1EA1i v\u1EDBi gi\xE1 tr\xEAn giao d\u1ECBch \u0111\xE3 ghi nh\u1EADn; \u0111\xE2y kh\xF4ng ph\u1EA3i l\xE3i/l\u1ED7 th\u1EF1c hi\u1EC7n. -K\u1EBFt qu\u1EA3 d\u1EF1 b\xE1o- so gi\xE1 EOD \u1EDF phi\xEAn th\u1EE9 ",
  ((t = (n = e[0]) == null ? void 0 : n.evaluation) == null ? void 0 : t.horizon_days) || ((l = (r = e[0]) == null ? void 0 :
  r.recommendation) == null ? void 0 : l.horizon_days) || 20, " v\u1EDBi gi\xE1 tham chi\u1EBFu l\xFAc \u0111\u1EC1 xu\u1EA5t. Tr\u1EA1ng th\xE1i ch\u1EDD t\u1EF1 c\u1EADp nh\
\u1EADt khi c\xF3 \u0111\u1EE7 phi\xEAn."] })] }) : O.jsx("p", { className: "recommendation-tracking-empty", children: "\
M\xE3 th\xEAm t\u1EEB trang \u0111\u1EC1 xu\u1EA5t s\u1EBD xu\u1EA5t hi\u1EC7n \u1EDF \u0111\xE2y sau khi b\u1EA1n l\u01B0u giao d\u1ECBch. Nh\u1EEFng giao d\u1ECBch c\u0169 kh\xF4ng c\xF3 li\xEAn k\u1EBFt ngu\u1ED3n s\u1EBD kh\xF4\
ng \u0111\u01B0\u1EE3c g\xE1n ng\u01B0\u1EE3c th\xE0nh giao d\u1ECBch t\u1EEB \u0111\u1EC1 xu\u1EA5t." })] });
}
const p = (e) => e, Xn = "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u", oe = (e) => e == null ? Xn : new Intl.NumberFormat("vi-VN",
{ style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(Number(e || 0)), Et = (e) => e == null ? Xn : new Intl.
NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(Number(e || 0)), Hh = (e) => e == null ?
Xn : `${Number(e) >= 0 ? "+" : ""}${Number(e).toFixed(2)}%`, He = (e) => e ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "\
medium", timeStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(e)) : Xn, cr = (e) => {
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? String(e || "").slice(0, 10) : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/H\
o_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(n);
};
function ev(e = [], n = null) {
  const t = /* @__PURE__ */ new Map();
  for (const r of e) {
    const l = cr(r.observed_at), o = t.get(l);
    (!o || Date.parse(r.observed_at) >= Date.parse(o.observed_at)) && t.set(l, r);
  }
  if ((n == null ? void 0 : n.price) != null && n.observed_at) {
    const r = { close: n.price, price: n.price, volume: n.volume, observed_at: n.observed_at, fetched_at: n.fetched_at, provider: n.
    upstream, interval: "intraday", open: n.open, high: n.high, low: n.low };
    t.set(cr(n.observed_at), r);
  }
  return [...t.values()].sort((r, l) => Date.parse(r.observed_at) - Date.parse(l.observed_at));
}
const nv = (e) => ({ id: e.id, symbol: e.code || e.symbol || "N/A", name: e.name || p("Ch\u01B0a c\xF3 t\xEAn"), price: e.
price == null ? null : Number(e.price), change: e.change == null ? null : Number(e.change), volume: e.volume == null ? null :
Number(e.volume), rating: e.rating || p("Ch\u01B0a \u0111\xE1nh gi\xE1"), industry: e.industry || p("Ch\u01B0a ph\xE2n lo\u1EA1i"),
exchange: e.exchange || null, listingStatus: e.listing_status || "unknown", listingCheckedAt: e.listing_checked_at || null,
dataSource: e.data_source, dataFetchedAt: e.data_fetched_at, sourceUrl: e.data_source_url || e.source_url, url: e.website_url ||
e.url }), tv = (e) => {
  var n;
  const t = Number(((n = e.liveQuote) == null ? void 0 : n.change) ?? e.change);
  return Number.isFinite(t) ? t >= 1 ? { label: "T\u0103ng t\xEDch c\u1EF1c", detail: "\u0110\u1ED9ng l\u01B0\u1EE3ng t\u0103ng; ki\u1EC3m tra v\xF9ng kh\
\xE1ng c\u1EF1." } : t <= -1 ? { label: "\xC1p l\u1EF1c gi\u1EA3m", detail: "\xC1p l\u1EF1c b\xE1n t\u0103ng; ki\u1EC3m tra v\xF9ng h\u1ED7 tr\u1EE3." } :
  { label: "\u0110i ngang", detail: "Bi\xEAn \u0111\u1ED9 h\u1EB9p; ch\u1EDD x\xE1c nh\u1EADn xu h\u01B0\u1EDBng." } : {
  label: "Theo di thm", detail: "Ch\u1EDD quote m\u1EDBi \u0111\u1EC3 x\xE1c nh\u1EADn xu h\u01B0\u1EDBng." };
};
function lv() {
  var e, n, t, r, l, o, a, u, c, f, k, j, y, C, E, M, b, m, h, v, w, z, x, _, P, g, I, B, K, ie, ye, mn, se, Ye, L, R, U,
  W, X, vn, Ae, _n, Ue, gn, Er, Tr, Pr, zr, Mr, Lr;
  const [Ir, Fr] = D.useState(false), [bt, Dr] = D.useState(""), [Jl, s] = D.useState(0), $r = D.useRef(null);
  var Or, Rr, Ar, Ur, br, Br, Vr, Hr, Qr, Kr, Wr, qr, Gr, Yr, Xr, Zr;
  const [ue, Bt] = D.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("market-auth") || "null");
    } catch {
      return null;
    }
  }), [Un, ei] = D.useState("login"), [bn, Vt] = D.useState({ email: "", password: "" }), [dt, on] = D.useState(""), [re,
  Xe] = D.useState(() => {
    try {
      return sessionStorage.getItem("stockpilot-view") || (sessionStorage.getItem("stockpilot-market-view") === "board" ? "market-board" : "overview");
    } catch {
      return "overview";
    }
  }), [yn, ni] = D.useState(() => {
    try {
      return sessionStorage.getItem("stockpilot-sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  }), [Cn, ht] = D.useState(() => {
    try {
      return sessionStorage.getItem("stockpilot-selected-id") || null;
    } catch {
      return null;
    }
  }), [be, ti] = D.useState({ key: "volume", direction: "desc" }), [ft, ri] = D.useState(""), [xn, En] = D.useState(1), [
  Ht, li] = D.useState(40), [Qt, ii] = D.useState(""), [pt, Bn] = D.useState([]), [Jr, el] = D.useState(""), [pe, mt] = D.
  useState(null), [nl, tl] = D.useState(""), [rl, vt] = D.useState(""), gt = D.useMemo(() => new Set(((pe == null ? void 0 :
  pe.positions) || []).filter((d) => Number(d.quantity) > 0).map((d) => {
    var S;
    return (S = d.symbol) == null ? void 0 : S.toUpperCase();
  }).filter(Boolean)), [pe]), yt = D.useMemo(() => new Set(pt.map((d) => {
    var S, $;
    return ($ = ((S = d.Stock) == null ? void 0 : S.code) || d.symbol) == null ? void 0 : $.toUpperCase();
  }).filter(Boolean)), [pt]), Vn = D.useMemo(() => /* @__PURE__ */ new Set([...gt, ...yt]), [gt, yt]), ll = [...Vn].sort().
  join(",");
  D.useEffect(() => {
    En(1);
  }, [ll]);
  D.useEffect(() => {
    window.dispatchEvent(new Event("stockpilot:react-commit"));
  });
  const xt = D.useRef(null), [oi, jt] = D.useState(false);
  D.useEffect(() => {
    var d;
    re === "portfolio" && oi && ((d = xt.current) == null || d.focus(), jt(false));
  }, [re, oi]);
  const [Ie, kt] = D.useState({ symbol: "", side: "BUY", quantity: "", price: "", fees: "", traded_at: (/* @__PURE__ */ new Date()).
  toISOString().slice(0, 10), recommendation_context: null }), Be = D.useRef(null), Ze = (d) => {
    Be.current = window.scrollY, d();
  };
  D.useEffect(() => {
    try {
      sessionStorage.setItem("stockpilot-view", re), Cn == null ? sessionStorage.removeItem("stockpilot-selected-id") : sessionStorage.
      setItem("stockpilot-selected-id", String(Cn));
    } catch {
    }
  }, [re, Cn]), D.useEffect(() => {
    try {
      sessionStorage.setItem("stockpilot-sidebar-collapsed", yn ? "1" : "0");
    } catch {
    }
  }, [yn]), D.useEffect(() => {
    if (!ue) {
      Bn([]), mt(null);
      return;
    }
    $r.current !== ue.token && (Bn([]), mt(null), $r.current = ue.token);
    let d = false;
    const S = new AbortController();
    localStorage.setItem("market-auth", JSON.stringify(ue));
    const $ = (A) => {
      d || (A.status === 401 ? (Bt(null), on(A.message)) : Dr("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c danh m\u1EE5c. Vui l\xF2ng th\u1EED l\u1EA1i."));
    };
    return Fr(true), Dr(""), je("/api/watchlist", { token: ue.token, signal: S.signal }).then((A) => {
      d || Bn(A.data || []);
    }).catch((A) => {
      A.status === 401 && $(A);
    }), je("/api/portfolio", { token: ue.token, signal: S.signal }).then((A) => {
      d || mt(A.data);
    }).catch($).finally(() => {
      d || Fr(false);
    }), () => {
      d = true, S.abort();
    };
  }, [ue, Jl]);
  const wt = Pn("/api/health"), ai = Pn("/api/cache/stats"), au = Pn("/api/ai-gate", Bm), su = Pn("/api/recommendations/\
latest", Vm), uu = Pn("/api/recommendations/history?limit=5", Hm);
  Pn("/api/recommendations/readiness", Qm);
  const Nt = Pn(`/api/stocks?page=${xn}&pageSize=${ft ? 200 : Ht}&q=${encodeURIComponent(ft)}&sector=${encodeURIComponent(
  Qt)}&sort=${be.key === "symbol" ? "code" : be.key}&direction=${be.direction}&pinned=${encodeURIComponent(ll)}`, Pc), il = D.
  useMemo(() => (Nt.data || []).map(nv), [Nt.data]), si = D.useMemo(() => il.slice(0, 40), [il]), ol = ma(si.map((d) => d.
  symbol), { enabled: re === "overview" }), an = ol.data, cu = ol.loading, ui = ol.providerStatus, Oo = [...new Set([...((pe ==
  null ? void 0 : pe.positions) || []).map((d) => d.symbol), ...((pe == null ? void 0 : pe.recommendation_entries) || []).
  map((d) => d.symbol)].filter(Boolean))].sort(), ci = ma(Oo, { enabled: re === "portfolio" }), di = ci.data, Qh = ci.error,
  hi = ci.providerStatus, Ro = D.useMemo(() => [...il].map((d) => an[d.symbol] ? { ...d, price: an[d.symbol].price, change: an[d.
  symbol].change ?? null, volume: an[d.symbol].volume_type === "session" ? an[d.symbol].volume : d.volume, liveQuote: an[d.
  symbol] } : d).sort((d, S) => {
    const $ = Number(Vn.has(S.symbol)) - Number(Vn.has(d.symbol));
    if ($) return $;
    const A = d[be.key] ?? "", Z = S[be.key] ?? "", de = typeof A == "string" ? String(A).localeCompare(String(Z), "vi") :
    Number(A) - Number(Z);
    return be.direction === "asc" ? de : -de;
  }), [il, be, an, Vn]), me = Ro.find((d) => d.id === Cn) || (Cn ? { id: Cn } : Ro[0]), Ee = Pn(me != null && me.id ? `/\
api/stocks/${encodeURIComponent(me.id)}` : null, Um), [Kh, du] = D.useState(false), [Wh, hu] = D.useState(false), T = Pn(
  Kh && me != null && me.id ? `/api/stocks/${encodeURIComponent(me.id)}/analysis${Wh ? "?refresh=1" : ""}` : null, bm), fi = ma(
  [], { enabled: re === "detail", stockId: me == null ? void 0 : me.id }), Te = Object.values(fi.data)[0] || null, qh = fi.
  error, pi = fi.providerStatus;
  D.useEffect(() => {
    du(() => {
      try {
        return re === "detail" && sessionStorage.getItem("analysis-requested:" + (me == null ? void 0 : me.id)) === "1";
      } catch {
        return false;
      }
    }), hu(false);
  }, [me == null ? void 0 : me.id, re]);
  const Kt = Number((Te == null ? void 0 : Te.price) ?? ((Rr = (Or = T.data) == null ? void 0 : Or.risk_plan) == null ? void 0 :
  Rr.current_price) ?? ((Ar = Ee.data) == null ? void 0 : Ar.price)), Gh = (d) => {
    const S = Number(d.stop_loss), $ = Number(d.take_profit), A = Number.isFinite(Kt) && Kt > 0, Z = A && Number.isFinite(
    S) && S >= Kt, de = A && d.take_profit != null && Number.isFinite($) && $ <= Kt;
    return { ...d, displayStop: Z ? Kt * 0.99 : d.stop_loss, displayTake: de ? Kt * 1.08 : d.take_profit, adjusted: Z ||
    de };
  };
  D.useEffect(() => {
    if (Be.current == null) return;
    const d = Be.current;
    Be.current = null, requestAnimationFrame(() => window.scrollTo({ top: d, behavior: "auto" }));
  }, [ft, Qt, be, xn, Ht]);
  const Yh = async (d) => {
    d.preventDefault();
    try {
      const S = await je(`/api/auth/${Un}`, { method: "POST", body: bn });
      Bt({ token: S.token, user: S.user }), Vt({ email: "", password: "" }), on("");
    } catch (S) {
      on(S.message);
    }
  }, Xh = async (d) => {
    d.preventDefault();
    try {
      await je("/api/watchlist", { method: "POST", token: ue.token, body: { symbol: Jr } });
      const S = await je("/api/watchlist", { token: ue.token });
      Bn(S.data || []), el("");
    } catch (S) {
      on(S.message);
    }
  }, Ao = (d) => {
    kt({ symbol: d.symbol, side: "BUY", quantity: "", price: d.price == null ? "" : String(d.price), fees: "", traded_at: (/* @__PURE__ */ new Date()).
    toISOString().slice(0, 10), recommendation_context: d.recommendationContext || null }), on(""), Xe("portfolio"), jt(
    true);
  }, Zh = async (d) => {
    d.preventDefault();
    try {
      const S = await je("/api/portfolio/transactions", { method: "POST", token: ue.token, body: Ie }), $ = await je("/api/portfolio", { token: ue.token }), A = Ie.recommendation_context, Z = $.data || {};
      if (A && !(Z.recommendation_entries || []).some((de) => de.transaction_id === (S.data == null ? void 0 : S.data.id))) {
        const de = { transaction_id: (S.data == null ? void 0 : S.data.id) || `pending-${Date.now()}`, stock_id: null, symbol: Ie.symbol, actual_entry_price: Number(Ie.price), current_eod_price: null, recommendation: A, evaluation: { status: "pending", sessions_observed: 0, horizon_days: A.horizon_days, outcome: "pending" } };
        $.data = { ...Z, recommendation_entries: [...Z.recommendation_entries || [], de] };
      }
      mt($.data), on(p("Ghi nh\u1EADn giao d\u1ECBch"));
    } catch (S) {
      on(S.message);
    }
  }, Jh = (d) => Ze(() => {
    En(1), ti((S) => S.key === d ? { key: d, direction: S.direction === "asc" ? "desc" : "asc" } : { key: d, direction: "\
asc" });
  }), fu = (d) => Ze(() => En(Math.max(1, d))), ef = (d) => Ze(() => {
    En(1), li(Number(d));
  }), nf = su.data, tf = async (d) => {
    d.preventDefault();
    const S = nl.trim();
    if (S) {
      vt("");
      try {
        const $ = await je("/api/stocks?page=1&pageSize=200&q=" + encodeURIComponent(S) + "&sort=code"), A = Pc($), Z = A.
        find((de) => String(de.code || de.symbol).toUpperCase() === S.toUpperCase()) || A[0];
        if (!Z) {
          vt(p("Kh\xF4ng th\u1EA5y th\u01B0 m\u1EE5c n\xE0y trong danh s\xE1ch."));
          return;
        }
        ht(Z.id), tl(""), vt(""), Xe("detail");
      } catch ($) {
        vt($.message);
      }
    }
  }, rf = async (d) => {
    try {
      await je(`/api/watchlist/${encodeURIComponent(d)}`, { method: "DELETE", token: ue.token }), Bn((S) => S.filter(($) => {
        var A;
        return ((A = $.Stock) == null ? void 0 : A.code) !== d;
      }));
    } catch (S) {
      on(S.message);
    }
  }, mi = ((pe == null ? void 0 : pe.positions) || []).map((d) => {
    var S;
    const $ = di[(S = d.symbol) == null ? void 0 : S.toUpperCase()] || d.current_quote, A = ($ == null ? void 0 : $.price) ??
    d.market_price, Z = A == null ? null : Number(d.quantity) * Number(A), de = Number(d.avg_cost || 0) * Number(d.quantity ||
    0);
    return { ...d, market_price: A, market_value: Z, unrealized_pnl: Z == null ? d.unrealized_pnl : Z - de, quote: $ };
  }), vi = mi.reduce((d, S) => d + Number(S.market_value || 0), 0), Wt = mi.map((d) => ({ ...d, weight: vi > 0 ? Number(
  d.market_value || 0) / vi * 100 : 0 })), lf = ((pe == null ? void 0 : pe.recommendation_entries) || []).map((d) => {
    var S;
    const $ = di[(S = d.symbol) == null ? void 0 : S.toUpperCase()], A = ($ == null ? void 0 : $.price) ?? d.current_eod_price,
    Z = Number(d.actual_entry_price), de = A != null && Z > 0 ? Number(((Number(A) / Z - 1) * 100).toFixed(2)) : null, Gt = ((pe ==
    null ? void 0 : pe.positions) || []).some((St) => {
      var sl, ul;
      return ((sl = St.symbol) == null ? void 0 : sl.toUpperCase()) === ((ul = d.symbol) == null ? void 0 : ul.toUpperCase()) &&
      Number(St.quantity) > 0;
    });
    return { ...d, current_price: A, current_quote: $, actual_return_pct: de, position_status: Gt ? "active" : "closed" };
  }), qt = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#2dd4bf", "#f97316", "#818cf8"];
  let Uo = 0;
  const pu = Wt.map((d, S) => {
    const $ = Uo;
    return Uo += d.weight, `${qt[S % qt.length]} ${$}% ${Uo}%`;
  }).join(", "), [of, af] = D.useState([{ role: "ai", text: p("AI Advisor \u0111ang s\u1EED d\u1EE5ng ph\xE2n t\xEDch rule-based c\xF3 ngu\u1ED3n v\xE0 \
quality gate.") }]), [bo, mu] = D.useState(""), Bo = (d) => {
    var S, $;
    const A = String(d || "").trim();
    if (!A) return;
    const Z = (me == null ? void 0 : me.symbol) || p("M\xE3 \u0111ang ch\u1ECDn"), de = (($ = (S = T.data) == null ? void 0 :
    S.insight) == null ? void 0 : $.label) || p("Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u \u0111\u1EC3 t\u1EA1o nh\u1EADn \u0111\u1ECBnh"),
    Gt = `${Z}: ${de}. ${p("\u0110\xE2y l\xE0 ph\xE2n t\xEDch ph\u1EE5c v\u1EE5 nghi\xEAn c\u1EE9u, kh\xF4ng ph\u1EA3i khuy\u1EBFn ngh\u1ECB mua b\xE1n.")}`;
    af((St) => [...St, { role: "user", text: A }, { role: "ai", text: Gt }]), mu("");
  };
  if (!ue) return O.jsx("div", { className: "auth-page", children: O.jsxs("section", { className: "auth-card panel", children: [
  O.jsxs("div", { className: "brand-block", children: [O.jsx("div", { className: "brand-mark", children: "S" }), O.jsxs(
  "div", { children: [O.jsx("p", { className: "eyebrow", children: "AI Platform" }), O.jsx("h2", { children: "StockPilot" })] })] }),
  O.jsx("p", { className: "eyebrow accent", children: p("Ph\xE2n t\xEDch c\xE1 nh\xE2n") }), O.jsx("h1", { children: p(Un ===
  "login" ? "\u0110\u0103ng nh\u1EADp" : "T\u1EA1o t\xE0i kho\u1EA3n") }), O.jsx("p", { className: "muted-text", children: p(
  "\u0110\u0103ng nh\u1EADp \u0111\u1EC3 l\u01B0u watchlist v\xE0 danh m\u1EE5c ri\xEAng.") }), O.jsxs("form", { onSubmit: Yh,
  className: "auth-form", children: [O.jsxs("label", { children: [p("Email"), O.jsx("input", { "aria-label": p("Email \u0111\u0103\
ng nh\u1EADp"), type: "email", placeholder: "you@example.com", value: bn.email, onChange: (d) => Vt({ ...bn, email: d.target.
  value }), required: true })] }), O.jsxs("label", { children: [p("M\u1EADt kh\u1EA9u"), O.jsx("input", { "aria-label": p(
  "M\u1EADt kh\u1EA9u \u0111\u0103ng nh\u1EADp"), type: "password", placeholder: p("T\u1ED1i thi\u1EC3u 8 k\xFD t\u1EF1"),
  value: bn.password, onChange: (d) => Vt({ ...bn, password: d.target.value }), required: true, minLength: 8 })] }), O.jsx(
  "button", { className: "primary-btn", type: "submit", children: p(Un === "login" ? "\u0110\u0103ng nh\u1EADp" : "\u0110\u0103ng \
k\xFD") }), O.jsx("button", { className: "ghost-btn", type: "button", onClick: () => ei(Un === "login" ? "register" : "l\
ogin"), children: p(Un === "login" ? "Ch\u01B0a c\xF3 t\xE0i kho\u1EA3n? \u0110\u0103ng k\xFD" : "\u0110\xE3 c\xF3 t\xE0i kho\u1EA3n? \u0110\u0103ng \
nh\u1EADp") }), dt && O.jsx("p", { role: "alert", className: "error-text", children: dt })] })] }) });
  const al = Ro, gi = ((Ur = Nt.data) == null ? void 0 : Ur.pagination) || { page: xn, total: al.length, totalPages: 1 },
  vu = gi.total ?? al.length, yi = Object.keys(an).length, gu = (e = Object.values(an).find((d) => d == null ? void 0 : d.
  license_url)) == null ? void 0 : e.license_url, sf = (/* @__PURE__ */ new Set([...gt, ...yt])).size, yu = Object.values(
  an).reduce((d, S) => {
    const $ = Date.parse(S.observed_at || S.fetched_at);
    return Number.isFinite($) && $ > d ? $ : d;
  }, 0);
  const pageTitles = {
    overview: ["Tổng quan thị trường", "Tổng quan"],
    "market-board": ["Bảng giá", "Bảng giá"],
    portfolio: ["Danh mục cá nhân", "Danh mục"],
    detail: ["Chi tiết mã", "Chi tiết mã"],
    recommendations: ["Đề xuất", "Đề xuất"],
    advisor: ["AI Advisor", "AI Advisor"]
  }, currentPageTitle = pageTitles[re] || pageTitles.overview, navigateToPage = (view) => {
    try {
      Object.keys(sessionStorage).filter((key) => key.startsWith("analysis-requested:")).forEach((key) => sessionStorage.removeItem(key));
    } catch {
    }
    window.__stockpilotResetAnalysis?.();
    Xe(view);
  }, openMarketStock = (stock, options = {}) => {
    ht(stock.id);
    if (options.analyze) {
      try {
        sessionStorage.setItem(`analysis-requested:${stock.id}`, "1");
      } catch {
      }
      window.__stockpilotRequestAnalysis?.();
    }
    Xe("detail");
  };
  return O.jsxs("div", { className: `dashboard-shell ${yn ? "sidebar-collapsed" : ""}`, children: [O.jsxs("aside", { className: `\
sidebar ${yn ? "is-collapsed" : ""}`, children: [O.jsxs("div", { className: "brand-block", children: [O.jsx("div", { className: "\
brand-mark", children: "S" }), O.jsxs("div", { children: [O.jsx("p", { className: "eyebrow", children: "AI Platform" }),
  O.jsx("h2", { children: "StockPilot" })] })] }), O.jsx("button", { type: "button", className: "sidebar-toggle", title: yn ?
  "M\u1EDF r\u1ED9ng thanh \u0111i\u1EC1u h\u01B0\u1EDBng" : "Thu g\u1ECDn thanh \u0111i\u1EC1u h\u01B0\u1EDBng", "aria-\
label": yn ? "M\u1EDF r\u1ED9ng thanh \u0111i\u1EC1u h\u01B0\u1EDBng" : "Thu g\u1ECDn thanh \u0111i\u1EC1u h\u01B0\u1EDBng",
  onClick: () => ni((d) => !d), children: O.jsx("svg", { className: "sidebar-toggle-icon", "data-sidebar-direction": yn ? "right" : "left", viewBox: "0 0 24 24", "aria-hidden": "true", children: O.jsx("path", { d: yn ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6" }) }) }), O.jsx("nav", { className: "nav", children: [["overview", "T\
\u1ED5ng quan", "-"], ["market-board", "B\u1EA3ng gi\xE1", "-"], ["portfolio", "Danh m\u1EE5c c\xE1 nh\xE2n", "-"], ["detail", "Chi ti\u1EBFt m\xE3", "-"], ["recom\
mendations", "\u0110\u1EC1 xu\u1EA5t", "-"], ["advisor", "AI Advisor", "-"]].map(([d, S, $]) => O.jsx("button", { className: `\
nav-item ${d === "market-board" ? "market-board-nav-item " : ""}${re === d ? "active" : ""}`, onClick: () => navigateToPage(d), title: S, "aria-label": S, "aria-current": re === d ? "page" : void 0, children: [O.jsx("span", { className: "\
nav-icon", children: O.jsx(Am, { name: d }) }), O.jsx("span", { className: "nav-label", children: p(S) })] }, d)) }), O.
  jsxs("div", { className: "profile-card", children: [O.jsx("p", { className: "eyebrow", children: p("T\xE0i kho\u1EA3n") }),
  O.jsx("strong", { className: "profile-email", children: ue.user.email }), O.jsx("span", { className: "role-badge", children: ue.
  user.role === "admin" ? p("Qu\u1EA3n tr\u1ECB vi\xEAn") : p("Nh\xE0 \u0111\u1EA7u t\u01B0") }), O.jsx("p", { className: "\
eyebrow", children: p("Danh m\u1EE5c") })] })] }), O.jsxs("main", { className: "main-panel", children: [O.jsxs("header",
  { className: "topbar", children: [O.jsxs("div", { children: [O.jsx("p", { className: "eyebrow", children: currentPageTitle[0] }), O.jsx("h1", { children: currentPageTitle[1] })] }), O.jsxs("div", { className: "\
topbar-actions", children: [O.jsx("span", { children: ue.user.email }), O.jsx("button", { className: "ghost-btn", onClick: () => Bt(
  null), children: p("\u0110\u0103ng xu\u1EA5t") })] })] }), (re === "overview" && cu || re === "portfolio" && ci.loading ||
  re === "detail" && (Ee.status === "loading" || fi.loading) || re === "recommendations" && (su.status === "loading" || uu.
  status === "loading")) && O.jsx(PageLoadingOverlay, { active: true, label: re === "detail" ? p("\u0110ang t\u1EA3i d\u1EEF li\u1EC7u Chi ti\u1EBFt m\u00E3 m\u1EDBi nh\u1EA5t...") : re === "recommendations" ? p("\u0110ang c\u1EADp nh\u1EADt d\u1EEF li\u1EC7u \u0110\u1EC1 xu\u1EA5t m\u1EDBi nh\u1EA5t...") : re === "portfolio" ? p("\u0110ang c\u1EADp nh\u1EADt d\u1EEF li\u1EC7u Danh m\u1EE5c m\u1EDBi nh\u1EA5t...") : p("\u0110ang c\u1EADp nh\u1EADt d\u1EEF li\u1EC7u Th\u1ECB tr\u01B0\u1EDDng m\u1EDBi nh\u1EA5t...") }), re !== "market-board" && (wt.error || ai.error) &&
  O.jsxs("section", { className: "api-panel diagnostics-panel", children: [wt.error && O.jsxs("p", { role: "alert", children: [
  wt.error, " ", O.jsx("button", { className: "ghost-btn small-btn", onClick: wt.retry, children: p("Th\u1EED l\u1EA1i health") })] }),
  ai.error && O.jsxs("p", { role: "alert", children: [ai.error, " ", O.jsx("button", { className: "ghost-btn small-btn",
  onClick: ai.retry, children: p("Th\u1EED l\u1EA1i cache") })] })] }), O.jsx(MarketBoardPage, {
    active: re === "market-board",
    overviewStocks: il,
    overviewTotal: vu,
    overviewQuotes: an,
    portfolioSymbols: [...gt],
    watchlistSymbols: [...yt],
    onOpenDetail: openMarketStock,
    onAddToPortfolio: (stock) => Ao({ ...stock, symbol: stock.symbol || stock.code })
  }), re === "overview" && O.jsxs(i.Fragment, { children: [
  O.jsxs("section", { className: "overview-hero panel", children: [O.jsxs("div", { children: [O.jsx("p", { className: "e\
yebrow accent", children: p("T\u1ED5ng quan th\u1ECB tr\u01B0\u1EDDng") }), O.jsx("h2", { children: p("Theo d\xF5i gi\xE1 v\xE0 c\
\xE1c m\xE3 quan t\xE2m c\u1EE7a b\u1EA1n.") }), O.jsx("p", { children: p("Gi\xE1 intraday \u0111\u01B0\u1EE3c d\xF9ng khi c\xF3 quote; c\xE1c m\xE3 c\
\xF2n l\u1EA1i gi\u1EEF gi\xE1 EOD.") })] }), O.jsxs("div", { className: "overview-hero-actions", children: [O.jsx("butt\
on", { className: "primary-btn", type: "button", onClick: () => Xe("portfolio"), children: p("M\xE3 danh m\u1EE5c c\xE1 nh\xE2n") }),
  O.jsx("button", { className: "ghost-btn", type: "button", onClick: () => Xe("recommendations"), children: p("\u0110\u1EBFn tab \u0111\
\u1EC1 xu\u1EA5t") })] })] }), O.jsxs("section", { className: "overview-metrics", "aria-label": p("T\xF3m t\u1EAFt th\u1ECB tr\u01B0\u1EDDng"),
  children: [O.jsxs("article", { className: "panel overview-metric", children: [O.jsx("span", { children: p("M\xE3 trong v\u0169\
 tr\u1EE5 d\u1EEF li\u1EC7u") }), O.jsx("strong", { children: vu }), O.jsx("small", { children: p("K\u1EBFt qu\u1EA3 theo b\u1ED9 l\u1ECDc h\
i\u1EC7n t\u1EA1i") })] }), O.jsxs("article", { className: "panel overview-metric", children: [O.jsx("span", { children: p(
  "Quote intraday") }), O.jsxs("strong", { children: [yi, O.jsxs("small", { children: [" / ", il.length] })] }), O.jsx("\
small", { children: p("M\xE3 c\xF3 quote; c\xF2n l\u1EA1i d\xF9ng EOD") })] }), O.jsxs("article", { className: "panel ov\
erview-metric", children: [O.jsx("span", { children: p("M\xE3 c\xE1 nh\xE2n") }), O.jsx("strong", { children: sf }), O.jsx(
  "small", { children: p("Danh m\u1EE5c ho\u1EB7c Watchlist") })] }), O.jsxs("article", { className: "panel overview-met\
ric", children: [O.jsx("span", { children: p("Quote m\u1EDBi nh\u1EA5t") }), O.jsx("strong", { className: "overview-time",
  children: yu ? He(yu) : p("Ch\u01B0a c\xF3 quote") }), O.jsx("small", { children: p("Th\u1EDDi \u0111i\u1EC3m provider ghi nh\u1EADn") })] })] }),
  O.jsx(MarketBreadth, { stocks: si, quotes: an, universeTotal: vu, onOpenDetail: openMarketStock }), false && O.jsxs("section", { className: "panel legacy-table-panel", children: [O.jsxs("div", { className: "\
panel-header", children: [O.jsx("h3", { children: p("Danh s\xE1ch c\u1ED5 phi\u1EBFu") }), O.jsxs("div", { className: "t\
able-tools", children: [O.jsxs("div", { className: "table-tabs", children: [O.jsx("button", { className: "tab-btn active",
  type: "button", children: p("T\u1EA5t c\u1EA3") }), O.jsxs("select", { className: "sector-select", "aria-label": p("Nh\
\xF3m ng\xE0nh"), value: Qt, onChange: (d) => Ze(() => {
    En(1), ii(d.target.value);
  }), children: [O.jsx("option", { value: "", children: p("Nh\xF3m ng\xE0nh") }), O.jsx("option", { value: "technology",
  children: p("C\xF4ng ngh\u1EC7") }), O.jsx("option", { value: "banking_finance", children: p("Ng\xE0nh ng\xE2n h\xE0ng v\xE0 t\xE0i c\
h\xEDnh") }), O.jsx("option", { value: "securities", children: p("Ch\u1EE9ng kho\xE1n") }), O.jsx("option", { value: "re\
al_estate", children: p("B\u1EA5t \u0111\u1ED9ng s\u1EA3n") }), O.jsx("option", { value: "energy_resources", children: p(
  "T\xE0i nguy\xEAn & n\u0103ng l\u01B0\u1EE3ng") }), O.jsx("option", { value: "manufacturing", children: p("S\u1EA3n xu\u1EA5t c\xF4\
ng nghi\u1EC7p") }), O.jsx("option", { value: "consumer_retail", children: p("Ti\xEAu d\xF9ng & b\xE1n l\u1EBB") }), O.jsx(
  "option", { value: "construction_infrastructure", children: p("X\xE2y d\u1EF1ng & h\u1EA1 t\u1EA7ng") }), O.jsx("optio\
n", { value: "other", children: p("Kh\xE1c / ch\u01B0a ph\xE2n lo\u1EA1i") })] })] }), O.jsx("input", { className: "tabl\
e-search", "aria-label": p("T\xECm c\u1ED5 phi\u1EBFu"), placeholder: p("T\xECm m\xE3 ho\u1EB7c t\xEAn c\xF4ng ty"), value: ft,
  onChange: (d) => Ze(() => {
    En(1), ri(d.target.value);
  }) }), O.jsxs("span", { className: "muted-text", children: [p("Hi\u1EC3n th\u1ECB"), " ", al.length, "/", vu, " ", p("\
m\xE3")] }), O.jsxs("label", { className: "page-size-control", children: [p("S\u1ED1 m\xE3 /trang"), O.jsxs("select", { value: Ht,
  onChange: (d) => ef(d.target.value), children: [O.jsx("option", { value: "25", children: "25" }), O.jsx("option", { value: "\
50", children: "50" }), O.jsx("option", { value: "100", children: "100" }), O.jsx("option", { value: "200", children: "2\
00" })] })] })] })] }), O.jsxs("p", { className: "overview-data-status", role: "status", children: [cu && O.jsx("span", {
  className: "realtime-loading", children: "\u0110ang c\u1EADp nh\u1EADt intraday..." }), ol.error && O.jsx("span", { children: ol.
  error }), (ui == null ? void 0 : ui.status) === "circuit_open" && O.jsx("span", { className: "data-time", children: "P\
rovider circuit open; gi\u1EEF d\u1EEF li\u1EC7u g\u1EA7n nh\u1EA5t v\xE0 s\u1EBD t\u1EF1 th\u1EED l\u1EA1i." }), (ui ==
  null ? void 0 : ui.status) === "degraded" && O.jsx("span", { className: "data-time", children: "Provider degraded; d\u1EEF \
li\u1EC7u s\u1EBD ti\u1EBFp t\u1EE5c t\u1EF1 c\u1EADp nh\u1EADt." }), O.jsx("span", { className: yi ? "status-dot is-liv\
e" : "status-dot" }), p(yi ? "C\xF3 d\u1EEF li\u1EC7u intraday" : "\u0110ang d\xF9ng d\u1EEF li\u1EC7u EOD"), "  ", p("Q\
uote c\xF3 th\u1EC3 tr\u1EC5; s\u1ED1 li\u1EC7u ph\u1EE5 thu\u1ED9c provider.")] }), O.jsxs("div", { className: "overvie\
w-source-summary", role: "note", children: [O.jsx("strong", { children: "Ngu\u1ED3n d\u1EEF li\u1EC7u" }), gu && O.jsx($i,
  { url: gu, children: "Gi\u1EA5y ph\xE9p d\u1EEF li\u1EC7u" }), O.jsxs("span", { children: [yi, "/", si.length, " m\xE3 c\xF3\
 Intraday t\u1EEB VCI; m\xE3 c\xF2n l\u1EA1i gi\u1EEF EOD g\u1EA7n nh\u1EA5t."] }), O.jsx("span", { className: "overview\
-source-help", title: "Kh\u1ED1i l\u01B0\u1EE3ng Intraday l\xE0 kh\u1ED1i l\u01B0\u1EE3ng giao d\u1ECBch ghi nh\u1EADn; EOD l\xE0 d\u1EEF li\u1EC7u phi\xEAn g\u1EA7n nh\u1EA5t.",
  "aria-label": "Gi\u1EA3i th\xEDch ngu\u1ED3n d\u1EEF li\u1EC7u", children: "i" })] }), O.jsx("div", { className: "tabl\
e-wrap", children: O.jsxs("table", { children: [O.jsx("thead", { children: O.jsxs("tr", { children: [[["symbol", "M\xE3",
  "K\xED hi\u1EC7u giao d\u1ECBch"], ["name", "T\xEAn", "T\xEAn doanh nghi\u1EC7p"], ["price", "Gi\xE1", "Gi\xE1 g\u1EA7n nh\u1EA5t"],
  ["change", "Bi\u1EBFn \u0111\u1ED9ng", "M\u1EE9c t\u0103ng gi\u1EA3m"], ["volume", "Kh\u1ED1i l\u01B0\u1EE3ng", "Kh\u1ED1i \
l\u01B0\u1EE3ng giao d\u1ECBch"]].map(([d, S, $]) => O.jsx("th", { children: O.jsxs("button", { className: "table-sort-b\
tn", type: "button", onClick: () => Jh(d), title: p($), children: [p(S), be.key === d ? (be.direction, " ") : ""] }) }, d)),
  O.jsx("th", { children: p("Ngu\u1ED3n d\u1EEF li\u1EC7u") }), O.jsx("th", { children: p("Nh\u1EADn \u0111\u1ECBnh") }),
  O.jsx("th", { children: "Thao t\xE1c" })] }) }), O.jsx("tbody", { children: Nt.error ? null : al.length ? al.map((d) => {
    var S, $;
    return O.jsxs("tr", { className: Vn.has(d.symbol) ? "pinned-stock" : void 0, onClick: () => {
      ht(d.id), Xe("detail");
    }, children: [O.jsxs("td", { className: "symbol", children: [d.symbol, O.jsxs("span", { className: "pin-labels", children: [
    gt.has(d.symbol) && O.jsx("small", { className: "pin-badge", children: "Danh m\u1EE5c" }), yt.has(d.symbol) && O.jsx(
    "small", { className: "pin-badge", children: "Watchlist" }), d.listingStatus === "delisted" ? O.jsx("small", { className: "\
listing-badge delisted", title: d.listingCheckedAt || "Historical symbol", children: " \u0110\xE3 h\u1EE7y ni\xEAm y\u1EBFt" }) : d.
    listingStatus === "listed" && d.exchange ? O.jsx("small", { className: "listing-badge listed", title: d.listingCheckedAt ||
    d.exchange, children: d.exchange }) : null] })] }), O.jsx("td", { children: O.jsx($i, { url: d.url, children: d.name }) }),
    O.jsx("td", { children: oe(d.price) }), O.jsx("td", { className: d.change >= 0 ? "positive" : "negative", children: Hh(
    d.change) }), O.jsxs("td", { children: [Et(d.volume), O.jsx("small", { className: "volume-context", title: ((S = d.liveQuote) ==
    null ? void 0 : S.interval) === "intraday" ? "Kh\u1ED1i l\u01B0\u1EE3ng giao d\u1ECBch Intraday t\u1EEB quote m\u1EDBi nh\u1EA5t." :
    "Kh\u1ED1i l\u01B0\u1EE3ng EOD c\u1EE7a phi\xEAn g\u1EA7n nh\u1EA5t.", "aria-label": (($ = d.liveQuote) == null ? void 0 :
    $.interval) === "intraday" ? "Kh\u1ED1i l\u01B0\u1EE3ng Intraday" : "Kh\u1ED1i l\u01B0\u1EE3ng EOD", children: "i" })] }),
    O.jsx("td", { className: "source-cell", children: "-" }), O.jsx("td", { children: (() => {
      const A = tv(d);
      return O.jsxs("div", { className: "overview-assessment", children: [O.jsx("span", { className: "rating-badge", children: A.
      label }), O.jsx("small", { children: A.detail }), O.jsx("button", { type: "button", className: "overview-analysis-\
btn", onClick: (Z) => {
        Z.stopPropagation(), ht(d.id);
        try {
          sessionStorage.setItem("analysis-requested:" + d.id, "1");
        } catch {
        }
        Xe("detail");
      }, children: "Ph\xE2n t\xEDch chuy\xEAn s\xE2u" })] });
    })() }), O.jsx("td", { children: O.jsx("button", { type: "button", className: "icon-action-btn add-portfolio-btn", title: `\
Th\xEAm ${d.symbol} v\xE0o danh m\u1EE5c`, "aria-label": `Th\xEAm ${d.symbol} v\xE0o danh m\u1EE5c`, onClick: (A) => {
      A.stopPropagation(), Ao(d);
    }, children: [O.jsx("span", { className: "add-portfolio-icon", "aria-hidden": "true", children: "+" }), O.jsx("span",
    { children: "Th\xEAm" })] }) })] }, d.id);
  }) : O.jsx("tr", { children: O.jsx("td", { colSpan: "8", children: p("Ch\u01B0a c\xF3 c\u1ED5 phi\u1EBFu trong d\u1EEF li\u1EC7u") }) }) })] }) }),
  O.jsxs("div", { className: "table-pagination", children: [O.jsx("button", { className: "ghost-btn small-btn", type: "b\
utton", disabled: xn <= 1, onClick: () => fu(xn - 1), children: p("Tr\u01B0\u1EDBc") }), O.jsxs("span", { className: "mu\
ted-text", children: [p("Trang"), " ", gi.page, "/", gi.totalPages] }), O.jsx("button", { className: "ghost-btn small-bt\
n", type: "button", disabled: xn >= gi.totalPages, onClick: () => fu(xn + 1), children: p("Sau") })] }), Nt.error && O.jsxs(
  "div", { className: "error-banner", role: "alert", children: [O.jsxs("p", { children: [p("Kh\xF4ng th\u1EC3 t\u1EA3i danh s\xE1ch c\u1ED5 p\
hi\u1EBFu"), ". ", Nt.error] }), O.jsx("button", { className: "ghost-btn", onClick: Nt.retry, children: p("Th\u1EED l\u1EA1i danh \
s\xE1ch") })] })] }), O.jsxs("section", { className: "overview-next panel", children: [O.jsxs("div", { children: [O.jsx(
  "h3", { children: p("Ti\u1EBFp t\u1EE5c t\u1EEB \u0111\xE2y") }), O.jsx("p", { children: p("M\u1EDF m\u1ED9t m\xE3 \u0111\u1EC3 xem bi\u1EC3u \u0111\u1ED3 v\
\xE0 ph\xE2n t\xEDch; qu\u1EA3n l\xFD v\u1ECB th\u1EBF trong danh m\u1EE5c c\xE1 nh\xE2n.") })] }), O.jsxs("div", { children: [
  O.jsx("button", { className: "ghost-btn", type: "button", onClick: () => {
    me && (ht(me.id), Xe("detail"));
  }, disabled: !me, children: p("Chi ti\u1EBFt m\xE3 \u0111ang ch\u1ECDn") }), O.jsx("button", { className: "ghost-btn",
  type: "button", onClick: () => Xe("recommendations"), children: p("Xem nh\u1EADn \u0111\u1ECBnh \u0111\u1EC1 xu\u1EA5t") })] })] })] }),
  re === "recommendations" && O.jsx(Zm, { initialData: nf, history: uu.data || [], token: ue.token, onAddToPortfolio: Ao }),
  re === "portfolio" && O.jsxs("section", { className: "personal-page", children: [Ir && O.jsx("p", { role: "status", children: "\
\u0110ang t\u1EA3i danh m\u1EE5c..." }), bt && O.jsxs("div", { role: "alert", children: [bt, O.jsx("button", { onClick: () => s(
  (d) => d + 1), children: "Th\u1EED l\u1EA1i danh m\u1EE5c" })] }), O.jsxs("div", { className: "page-heading", children: [
  O.jsx("h2", { children: p("Danh m\u1EE5c v\xE0 theo d\xF5i") }), O.jsx("p", { children: p("Ch\u1EC9 theo d\xF5i giao d\u1ECBch b\xEAn \
ngo\xE0i, kh\xF4ng th\u1EF1c hi\u1EC7n mua b\xE1n trong \u1EE9ng d\u1EE5ng.") })] }), O.jsxs("div", { className: "person\
al-grid", children: [O.jsxs("article", { className: "panel portfolio-panel", children: [O.jsx("h3", { children: p("Ghi n\
h\u1EADn giao d\u1ECBch") }), O.jsxs("form", { className: "transaction-form", onSubmit: Zh, children: [O.jsxs("label", {
  children: [p("M\xE3 c\u1ED5 phi\u1EBFu"), O.jsx("input", { "aria-label": p("M\xE3 giao d\u1ECBch"), value: Ie.symbol, onChange: (d) => {
    var S;
    const $ = d.target.value.toUpperCase();
    kt({ ...Ie, symbol: $, recommendation_context: ((S = Ie.recommendation_context) == null ? void 0 : S.symbol) === $ ?
    Ie.recommendation_context : null });
  }, required: true })] }), O.jsxs("label", { children: [p("Lo\u1EA1i giao d\u1ECBch"), O.jsxs("select", { value: Ie.side,
  onChange: (d) => kt({ ...Ie, side: d.target.value, recommendation_context: d.target.value === "BUY" ? Ie.recommendation_context :
  null }), children: [O.jsx("option", { value: "BUY", children: p("Mua") }), O.jsx("option", { value: "SELL", children: p(
  "Bn") })] })] }), O.jsxs("label", { children: [p("S\u1ED1 l\u01B0\u1EE3ng"), O.jsx("input", { ref: xt, type: "number",
  min: "1", value: Ie.quantity, onChange: (d) => kt({ ...Ie, quantity: d.target.value }), required: true })] }), O.jsxs(
  "label", { children: [p("Gi\xE1 giao d\u1ECBch (VND/c\u1ED5 phi\u1EBFu)"), O.jsx("input", { type: "number", value: Ie.
  price, onChange: (d) => kt({ ...Ie, price: d.target.value }), required: true })] }), O.jsx("button", { className: "pri\
mary-btn", type: "submit", children: p("L\u01B0u giao d\u1ECBch") })] }), dt && O.jsx("p", { role: "status", children: dt }),
  O.jsx("div", { className: "table-wrap portfolio-table", children: O.jsxs("table", { children: [O.jsx("thead", { children: O.
  jsxs("tr", { children: [O.jsx("th", { children: "M\xE3" }), O.jsx("th", { children: p("S\u1ED1 l\u01B0\u1EE3ng") }), O.
  jsx("th", { children: p("Gi\xE1 v\u1ED1n") }), O.jsx("th", { children: p("Gi\xE1 hi\u1EC7n t\u1EA1i") }), O.jsx("th", {
  children: p("L\xE3i/l\u1ED7 ch\u01B0a th\u1EF1c hi\u1EC7n") }), O.jsx("th", { children: p("L\xE3i/l\u1ED7 \u0111\xE3 th\u1EF1c hi\u1EC7n") })] }) }),
  O.jsxs("tbody", { children: [mi.map((d) => O.jsxs("tr", { className: "portfolio-row-clickable", role: "link", tabIndex: 0, "aria-label": `Mở Chi tiết mã ${d.symbol}`, onClick: () => {
    ht(d.stock_id), Xe("detail");
  }, onKeyDown: (S) => {
    (S.key === "Enter" || S.key === " ") && (S.preventDefault(), ht(d.stock_id), Xe("detail"));
  }, children: [O.jsx("td", { children: O.jsx("button", { type: "button", className: "symbol portfolio-detail-link", title: `Mở Chi tiết mã ${d.symbol}`, onClick: (S) => {
    S.stopPropagation(), ht(d.stock_id), Xe("detail");
  }, children: d.symbol }) }), O.jsx("td", {
  children: Et(d.quantity) }), O.jsx("td", { children: oe(d.avg_cost) }), O.jsxs("td", { children: [oe(d.market_price), O.
  jsx("small", { className: "data-time", children: d.quote ? `Intraday - ${He(d.quote.observed_at)}` : p("EOD fallback") })] }),
  O.jsx("td", { className: Number(d.unrealized_pnl) >= 0 ? "positive" : "negative", children: oe(d.unrealized_pnl) }), O.
  jsx("td", { className: Number(d.realized_pnl) >= 0 ? "positive" : "negative", children: oe(d.realized_pnl) })] }, d.stock_id)),
  !Ir && !bt && !((pe == null ? void 0 : pe.positions) || []).length && O.jsx("tr", { children: O.jsx("td", { colSpan: "\
6", children: p("Ch\u01B0a c\xF3 v\u1ECB th\u1EBF") }) })] })] }) }), O.jsx(Jm, { entries: lf })] }), O.jsx(PortfolioAllocation, {
    allocations: Wt,
    positions: mi,
    quoteCount: Oo.filter((symbol) => di[symbol]).length,
    positionCount: Oo.length,
    quoteError: Qh,
    providerStatus: hi == null ? void 0 : hi.status
  }), false && O.jsxs("article", {
  className: "panel legacy-allocation-panel", children: [O.jsxs("div", { className: "allocation-panel-heading", children: [O.jsxs(
  "div", { children: [O.jsx("h3", { children: p("Ph\xE2n b\u1ED5 danh m\u1EE5c") }), O.jsx("p", { className: "muted-text",
  children: p("T\u1EF7 tr\u1ECDng theo gi\xE1 tr\u1ECB th\u1ECB tr\u01B0\u1EDDng hi\u1EC7n t\u1EA1i.") })] }), O.jsxs("s\
pan", { className: "chip neutral", children: [Wt.length, " m\xE3"] })] }), Wt.length ? O.jsxs("div", { className: "alloc\
ation-visual", children: [O.jsx("div", { className: "allocation-donut", role: "img", "aria-label": p("Bi\u1EC3u \u0111\u1ED3 ph\xE2n b\u1ED5 da\
nh m\u1EE5c"), style: { background: pu ? "conic-gradient(" + pu + ")" : "var(--border)" }, children: O.jsxs("div", { children: [
  O.jsx("small", { className: "allocation-total-label", children: p("T\u1ED5ng gi\xE1 tr\u1ECB") }), O.jsx("strong", { className: "\
allocation-total-value", children: oe(vi) }), O.jsx("small", { className: "allocation-day-change", children: (() => {
    const d = mi.reduce(($, A) => $ + Number(A.quantity || 0) * Number(A.previous_market_price || 0), 0), S = d > 0 ? vi -
    d : null;
    return S == null ? "Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u h\xF4m qua" : O.jsxs(i.Fragment, { children: ["So v\u1EDBi h\xF4m qua:\
 ", O.jsx("span", { className: S > 0 ? "positive" : S < 0 ? "negative" : "neutral", children: `${oe(S)}  ${S >= 0 ? "+" :
    ""}${d > 0 ? (S / d * 100).toFixed(2) : "0"}%` })] });
  })() }), O.jsx("svg", { className: "allocation-donut-svg", viewBox: "0 0 100 100", role: "presentation", children: Wt.
  map((d, S) => {
    const $ = Wt.slice(0, S).reduce((Tn, uf) => Tn + uf.weight, 0) * 3.6 - 90, A = $ + d.weight * 3.6, Z = 58, de = 40, Gt = (Tn) => 50 +
    Z * Math.cos(Tn * Math.PI / 180), St = (Tn) => 50 + Z * Math.sin(Tn * Math.PI / 180), sl = (Tn) => 50 + de * Math.cos(
    Tn * Math.PI / 180), ul = (Tn) => 50 + de * Math.sin(Tn * Math.PI / 180), xu = d.weight > 50 ? 1 : 0;
    return O.jsxs("path", { d: `M${Gt($)} ${St($)} A${Z} ${Z} 0 ${xu} 1 ${Gt(A)} ${St(A)} L${sl(A)} ${ul(A)} A${de} ${de}\
 0 ${xu} 0 ${sl($)} ${ul($)} Z`, fill: "transparent", children: [O.jsx("title", { children: `${d.symbol}: ${d.weight.toFixed(
    1)}%  ${oe(d.market_value)}` })] }, d.stock_id);
  }) })] }) }), O.jsx("ol", { className: "allocation-list", children: Wt.map((d, S) => O.jsxs("li", { title: `${d.symbol}\
: ${d.weight.toFixed(1)}%  ${oe(d.market_value)}`, children: [O.jsxs("div", { className: "allocation-item-heading", children: [
  O.jsx("i", { style: { backgroundColor: qt[S % qt.length] } }), O.jsxs("div", { children: [O.jsx("strong", { children: d.
  symbol }), O.jsx("small", { children: oe(d.market_value) })] }), O.jsxs("b", { children: [d.weight.toFixed(1), "%"] })] }),
  O.jsx("div", { className: "allocation-track", children: O.jsx("span", { style: { width: d.weight + "%", backgroundColor: qt[S %
  qt.length] } }) })] }, d.stock_id)) })] }) : O.jsx("p", { className: "muted-text", children: p("Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u ph\xE2n b\
\u1ED5.") }), O.jsxs("p", { className: "allocation-footnote", children: [Object.keys(di).length, "/", Oo.length, " ", p(
  "M\xE3 c\xF3 quote intraday"), " ? ", Qh || Object.keys(di).length < Oo.length ? p("M\xE3 thi\u1EBFu quote d\xF9ng gi\xE1 EOD; t\u1EF7 tr\
\u1ECDng k\u1EBFt h\u1EE3p d\u1EEF li\u1EC7u hi\u1EC7n c\xF3.") : p("T\u1EF7 tr\u1ECDng d\u1EF1a tr\xEAn quote intraday m\u1EDBi nh\u1EA5t."),
  (hi == null ? void 0 : hi.status) === "circuit_open" ? " Provider t\u1EA1m ng\u1EAFt, s\u1EBD t\u1EF1 th\u1EED l\u1EA1i." :
  (hi == null ? void 0 : hi.status) === "degraded" ? " Provider \u0111ang ch\u1EADm." : ""] })] }), O.jsxs("article", { className: "\
panel watchlist-panel", children: [O.jsx("h3", { children: "Watchlist" }), O.jsxs("form", { onSubmit: Xh, className: "au\
th-form", children: [O.jsx("input", { placeholder: p("Th\xEAm m\xE3, v\xED d\u1EE5 FPT"), value: Jr, onChange: (d) => el(
  d.target.value.toUpperCase()) }), O.jsx("button", { className: "primary-btn", type: "submit", children: p("Th\xEAm m\xE3") })] }),
  O.jsxs("ul", { className: "watchlist", children: [pt.map((d) => O.jsxs("li", { className: "watchlist-detail-link", role: "link", tabIndex: 0, "aria-label": `Mở Chi tiết mã ${d.Stock.code}`, onClick: () => {
    d.Stock.id && (ht(d.Stock.id), Xe("detail"));
  }, onKeyDown: (S) => {
    d.Stock.id && (S.key === "Enter" || S.key === " ") && (S.preventDefault(), ht(d.Stock.id), Xe("detail"));
  }, children: [O.jsx("strong", { children: d.
  Stock.code }), O.jsx("button", { className: "ghost-btn small-btn", type: "button", onClick: (S) => {
    S.stopPropagation(), rf(d.Stock.code);
  }, children: p(
  "Xa") })] }, d.stock_id)), !pt.length && O.jsx("li", { className: "muted-text", children: p("Ch\u01B0a c\xF3 m\xE3") })] })] })] })] }),
  re === "detail" && O.jsxs("section", { className: "detail-page", children: [O.jsx(DetailSymbolSearch, { value: nl, options: si, error: rl, onChange: tl, onSubmit: tf }), Ee.status === "loading" ? O.jsx("div", { className: "loading-shell", children: O.jsx("p", {
  children: p("\u0110ang t\u1EA3i chi ti\u1EBFt c\u1ED5 phi\u1EBFu") }) }) : Ee.error ? O.jsxs("div", { className: "erro\
r-banner", role: "alert", children: [O.jsxs("p", { children: [p("Kh\xF4ng th\u1EC3 t\u1EA3i chi ti\u1EBFt c\u1ED5 phi\u1EBFu"),
  ". ", Ee.error] }), O.jsx("button", { className: "ghost-btn", onClick: Ee.retry, children: p("Th\u1EED l\u1EA1i chi ti\u1EBFt") })] }) :
  Ee.data && O.jsxs(i.Fragment, { children: [O.jsx(DetailHero, { symbol: Ee.data.code, name: Ee.data.name, price: oe((Te == null ? void 0 : Te.price) ?? Ee.data.price), quote: Te ? { ...Te, fetchedAt: He(Te.fetched_at) } : null, eodFetchedAt: He(Ee.data.data_fetched_at), providerStatus: pi == null ? void 0 : pi.status, quoteError: qh, analysis: T, onRequestAnalysis: () => { du(true), hu(!!T.data); try { sessionStorage.setItem(`analysis-requested:${me.id}`, "1"); } catch {} window.__stockpilotRequestAnalysis?.(), T.retry(); }, onAddToPortfolio: () => Ao({ symbol: Ee.data.code, price: (Te == null ? void 0 : Te.price) ?? Ee.data.price }) }), O.jsxs("div", { className: "detail-content-gri\
d", children: [O.jsxs("article", { className: "panel detail-chart-panel", children: [O.jsxs("div", { className: "panel-h\
eader", children: [O.jsx("h3", { children: p("L\u1ECBch s\u1EED gi\xE1") }), O.jsx("span", { className: `chip ${Te ? "su\
ccess" : "neutral"}`, children: p(Te ? "Intraday + EOD" : "D\u1EEF li\u1EC7u EOD") }), O.jsxs("p", { className: "chart-v\
olume-note", children: [O.jsxs("span", { className: "volume-note rising", children: ["- ", p("Kh\u1ED1i l\u01B0\u1EE3ng phi\xEAn t\u0103ng")] }),
  O.jsxs("span", { className: "volume-note falling", children: ["- ", p("Kh\u1ED1i l\u01B0\u1EE3ng phi\xEAn gi\u1EA3m")] })] })] }),
  O.jsx(DetailPriceVolumeChart, { history: ev(Ee.data.price_history || [], Te), marketSessions: Ee.data.market_sessions || [], formatDateKey: cr, formatTime: He, formatPrice: oe, formatVolume: Et, formatPercent: Hh, translate: p })] }), O.jsxs(
  "article", { className: "panel summary-panel", children: [O.jsx("h3", { children: p("AI nh\u1EADn \u0111\u1ECBnh") }),
  O.jsxs("ul", { className: "summary-list", children: [O.jsxs("li", { children: [O.jsx("span", { children: p("T\xEDn hi\u1EC7u") }),
  O.jsx("strong", { children: ((Br = (br = T.data) == null ? void 0 : br.insight) == null ? void 0 : Br.label) || p("Ch\u01B0\
a c\xF3 nh\u1EADn \u0111\u1ECBnh") })] }), O.jsxs("li", { children: [O.jsx("span", { children: p("RSI14") }), O.jsx("str\
ong", { children: ((Hr = (Vr = T.data) == null ? void 0 : Vr.indicators) == null ? void 0 : Hr.rsi14) ?? Xn })] }), O.jsxs(
  "li", { children: [O.jsx("span", { children: p("Quan s\xE1t") }), O.jsxs("strong", { children: [((Qr = T.data) == null ?
  void 0 : Qr.observations) ?? 0, " ", p("phi\xEAn")] })] })] })] })] }), O.jsxs("section", { className: "panel technica\
l-panel", children: [O.jsxs("div", { className: "analysis-status-row", children: [O.jsx("h3", { children: p("Ph\xE2n t\xEDch c\
huy\xEAn s\xE2u") }), O.jsx("span", { className: `chip ${T.status === "loading" ? "neutral" : T.data ? "success" : "neut\
ral"}`, children: T.status === "loading" ? "\u0110ang ph\xE2n t\xEDch..." : T.data ? "\u0110\xE3 ph\xE2n t\xEDch" : "Ch\u01B0\
a ph\xE2n t\xEDch" })] }), T.error && O.jsx("p", { role: "alert", children: T.error }), !T.data && !T.error && O.jsxs("d\
iv", { className: "analysis-empty-state", children: [O.jsx("strong", { children: p("Ch\u01B0a c\xF3 k\u1EBFt qu\u1EA3 ph\xE2n t\xEDch") }),
  O.jsx("span", { children: T.status === "loading" ? p("\u0110ang t\u1EA3i c\xE1c ch\u1EC9 b\xE1o k\u1EF9 thu\u1EADt...") :
  p("Nh\u1EA5n Ph\xE2n t\xEDch chuy\xEAn s\xE2u \u0111\u1EC3 xem \u0111i\u1EC3m s\u1ED1, ch\u1EC9 b\xE1o v\xE0 nh\u1EADn \u0111\u1ECBnh theo k\u1EF3 h\u1EA1n.") })] }),
  T.data && O.jsxs("p", { children: [((Kr = T.data.insight) == null ? void 0 : Kr.label) || p("Ch\u01B0a c\xF3 nh\u1EADn \u0111\u1ECBnh"),
  "  ", p("Ch\u1EA5t l\u01B0\u1EE3ng"), ": ", ((Wr = T.data.quality) == null ? void 0 : Wr.score) ?? 0, "/100"] }), T.data &&
  O.jsx("p", { className: "data-time", children: ["C\u1EADp nh\u1EADt ph\xE2n t\xEDch: ", He((t = T.data.insight) == null ?
  void 0 : t.generated_at)] }), ((r = T.data) == null ? void 0 : r.evaluation_factors) && O.jsx("div", { className: "eva\
luation-factors-grid", children: T.data.evaluation_factors.map((d) => O.jsxs("div", { className: "evaluation-factor-card",
  children: [O.jsxs("div", { children: [O.jsx("strong", { children: d.label }), O.jsx("span", { className: `chip ${d.status ===
  "verified" || d.status === "available" ? "success" : "neutral"}`, children: d.score == null ? "Ch\u01B0a c\xF3 \u0111i\u1EC3m" :
  `${d.score}/100` })] }), O.jsx("p", { children: d.detail })] }, d.key)) }), ((l = T.data) == null ? void 0 : l.horizon_advice) &&
  O.jsx("div", { className: "horizon-advice-grid", children: Object.values(T.data.horizon_advice).map((d) => O.jsxs("art\
icle", { className: "horizon-advice-card", children: [O.jsx("strong", { children: d.label }), O.jsx("p", { children: d.advice })] },
  d.label)) }), ((o = T.data) == null ? void 0 : o.expert_guidance) && O.jsxs("div", { className: "expert-guidance-panel",
  children: [O.jsxs("div", { className: "expert-guidance-header", children: [O.jsx("strong", { children: p("Nh\u1EADn \u0111\u1ECBnh ch\
uy\xEAn gia") }), O.jsxs("span", { className: "chip neutral", children: [T.data.expert_guidance.stance, T.data.expert_guidance.
  technical_score != null ? `  ${T.data.expert_guidance.technical_score}/100` : ""] }), O.jsx("i", { className: "technic\
al-score-meter", style: { width: `${Math.max(0, Math.min(100, Number(T.data.expert_guidance.technical_score || 0)))}%` },
  title: "\u0110i\u1EC3m k\u1EF9 thu\u1EADt t\u1ED5ng h\u1EE3p" })] }), O.jsx("p", { children: T.data.expert_guidance.confirmation }),
  O.jsxs("div", { className: "analysis-context-strip", children: [O.jsxs("span", { children: [O.jsx("strong", { children: "\
D\u1EEF li\u1EC7u " }), T.data.observations, " phi\xEAn"] }), O.jsxs("span", { children: [O.jsx("strong", { children: "\u0110\
\u1EBFn " }), He(T.data.as_of)] }), O.jsxs("span", { children: [O.jsx("strong", { children: "Ch\u1EA5t l\u01B0\u1EE3ng " }),
  ((a = T.data.quality) == null ? void 0 : a.score) == null ? "-" : `${T.data.quality.score}/100`] })] }), O.jsxs("div",
  { className: "ichimoku-summary", children: [O.jsx("strong", { children: p("Ichimoku") }), O.jsxs("span", { children: [
  "Tenkan ", ((c = (u = T.data.indicators) == null ? void 0 : u.ichimoku) == null ? void 0 : c.conversion) ?? "-", "  Ki\
jun ", ((k = (f = T.data.indicators) == null ? void 0 : f.ichimoku) == null ? void 0 : k.base) ?? "-", "  My ", ((y = (j =
  T.data.indicators) == null ? void 0 : j.ichimoku) == null ? void 0 : y.cloud) === "above_cloud" ? "Tr\xEAn m\xE2y" : ((E =
  (C = T.data.indicators) == null ? void 0 : C.ichimoku) == null ? void 0 : E.cloud) === "below_cloud" ? "D\u01B0\u1EDBi m\xE2y" :
  ((b = (M = T.data.indicators) == null ? void 0 : M.ichimoku) == null ? void 0 : b.cloud) === "inside_cloud" ? "Trong m\
y" : "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u", "  MACD ", ((h = (m = T.data.indicators) == null ? void 0 : m.macd) == null ?
  void 0 : h.state) === "bullish" ? "T\u0103ng" : ((w = (v = T.data.indicators) == null ? void 0 : v.macd) == null ? void 0 :
  w.state) === "bearish" ? "Gi\u1EA3m" : ((x = (z = T.data.indicators) == null ? void 0 : z.macd) == null ? void 0 : x.state) ===
  "neutral" ? "Trung tnh" : "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u", "  Bollinger ", ((P = (_ = T.data.indicators) ==
  null ? void 0 : _.bollinger) == null ? void 0 : P.position) === "above_upper" ? "V\u01B0\u1EE3t d\u1EA3i tr\xEAn" : ((I =
  (g = T.data.indicators) == null ? void 0 : g.bollinger) == null ? void 0 : I.position) === "below_lower" ? "D\u01B0\u1EDBi d\u1EA3i d\
\u01B0\u1EDBi" : ((K = (B = T.data.indicators) == null ? void 0 : B.bollinger) == null ? void 0 : K.position) === "upper\
_half" ? "N\u1EEDa tr\xEAn d\u1EA3i" : ((ye = (ie = T.data.indicators) == null ? void 0 : ie.bollinger) == null ? void 0 :
  ye.position) === "lower_half" ? "N\u1EEDa d\u01B0\u1EDBi d\u1EA3i" : "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u"] })] }),
  O.jsx("div", { className: "advanced-indicator-grid", children: [O.jsxs("article", { children: [O.jsx("strong", { children: "\
SMA20 / SMA50" }), O.jsxs("b", { children: [((mn = T.data.indicators) == null ? void 0 : mn.sma20) == null ? "-" : Number(
  T.data.indicators.sma20).toFixed(2), " / ", ((se = T.data.indicators) == null ? void 0 : se.sma50) == null ? "-" : Number(
  T.data.indicators.sma50).toFixed(2)] }), O.jsx("small", { children: "N\u1EC1n xu h\u01B0\u1EDBng trung h\u1EA1n" })] }),
  O.jsxs("article", { children: [O.jsx("strong", { children: "EMA12 / EMA26" }), O.jsxs("b", { children: [((Ye = T.data.
  indicators) == null ? void 0 : Ye.ema12) == null ? "-" : Number(T.data.indicators.ema12).toFixed(2), " / ", ((L = T.data.
  indicators) == null ? void 0 : L.ema26) == null ? "-" : Number(T.data.indicators.ema26).toFixed(2)] }), O.jsx("small",
  { children: "\u0110\u1ED9ng l\u01B0\u1EE3ng ng\u1EAFn h\u1EA1n" })] }), O.jsxs("article", { children: [O.jsx("strong",
  { children: "RSI14" }), O.jsx("b", { children: ((R = T.data.indicators) == null ? void 0 : R.rsi14) == null ? "-" : Number(
  T.data.indicators.rsi14).toFixed(1) }), O.jsx("small", { children: "Tr\xEAn 70: qu\xE1 mua \xB7 d\u01B0\u1EDBi 30: qu\xE1 b\xE1n" })] }),
  O.jsxs("article", { children: [O.jsx("strong", { children: "MACD" }), O.jsxs("b", { children: [((W = (U = T.data.indicators) ==
  null ? void 0 : U.macd) == null ? void 0 : W.line) == null ? "-" : Number(T.data.indicators.macd.line).toFixed(2), "  \
H ", ((vn = (X = T.data.indicators) == null ? void 0 : X.macd) == null ? void 0 : vn.histogram) == null ? "-" : Number(T.
  data.indicators.macd.histogram).toFixed(2)] }), O.jsx("small", { children: "\u0110\u01B0\u1EDDng MACD v\xE0 histogram" })] }),
  O.jsxs("article", { children: [O.jsx("strong", { children: "Bollinger 20/2" }), O.jsxs("b", { children: [((_n = (Ae = T.
  data.indicators) == null ? void 0 : Ae.bollinger) == null ? void 0 : _n.lower) == null ? "-" : Number(T.data.indicators.
  bollinger.lower).toFixed(2), " - ", ((gn = (Ue = T.data.indicators) == null ? void 0 : Ue.bollinger) == null ? void 0 :
  gn.upper) == null ? "-" : Number(T.data.indicators.bollinger.upper).toFixed(2)] }), O.jsx("small", { children: "Bi\xEAn d\
\u01B0\u1EDBi - bi\xEAn tr\xEAn" })] }), O.jsxs("article", { children: [O.jsx("strong", { children: "Ichimoku" }), O.jsxs(
  "b", { children: ["T ", ((Tr = (Er = T.data.indicators) == null ? void 0 : Er.ichimoku) == null ? void 0 : Tr.conversion) ==
  null ? "-" : Number(T.data.indicators.ichimoku.conversion).toFixed(2), "  K ", ((zr = (Pr = T.data.indicators) == null ?
  void 0 : Pr.ichimoku) == null ? void 0 : zr.base) == null ? "-" : Number(T.data.indicators.ichimoku.base).toFixed(2)] }),
  O.jsx("small", { children: ((Lr = (Mr = T.data.indicators) == null ? void 0 : Mr.ichimoku) == null ? void 0 : Lr.cloud) ||
  "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u" })] })] }), O.jsx("div", { className: "expert-score-grid", children: (T.data.
  expert_guidance.score_breakdown || []).map((d) => O.jsxs("article", { children: [O.jsxs("div", { children: [O.jsx("str\
ong", { children: d.label }), O.jsx("b", { children: d.score == null ? "-" : `${d.score} \u0111i\u1EC3m` })] }), O.jsx("\
small", { children: d.detail })] }, d.key)) }), O.jsxs("div", { className: "expert-guidance-columns", children: [O.jsxs(
  "div", { children: [O.jsx("strong", { children: p("C\u1EA7n theo d\xF5i") }), O.jsx("ul", { children: (T.data.expert_guidance.
  watch || []).map((d) => O.jsx("li", { children: d }, d)) })] }), O.jsxs("div", { children: [O.jsx("strong", { children: p(
  "N\xEAn tr\xE1nh") }), O.jsx("ul", { children: (T.data.expert_guidance.avoid || []).map((d) => O.jsx("li", { children: d },
  d)) })] })] }), O.jsx("div", { className: "expert-forecast-grid", children: Object.entries(T.data.expert_guidance.forecast ||
  {}).map(([d, S]) => O.jsxs("article", { children: [O.jsx("strong", { children: d === "short_term" ? "Ng\u1EAFn h\u1EA1n" :
  d === "medium_term" ? "Trung h\u1EA1n" : "D\xE0i h\u1EA1n" }), O.jsx("small", { children: d === "short_term" ? "1-20 p\
hi\xEAn (~1 th\xE1ng)" : d === "medium_term" ? "1-6 th\xE1ng" : "Tr\xEAn 6 th\xE1ng" }), O.jsx("p", { children: S })] },
  d)) }), O.jsx("p", { className: "analysis-disclaimer", children: T.data.expert_guidance.risk_note })] }), ((Yr = (Gr =
  T.data) == null ? void 0 : Gr.risk_plan) == null ? void 0 : Yr.horizons) && O.jsxs("div", { className: "external-facto\
r-box", children: [O.jsx("strong", { children: p("K\u1ECBch b\u1EA3n tham kh\u1EA3o") }), O.jsx("div", { className: "tab\
le-wrap risk-table", children: O.jsxs("table", { children: [O.jsx("thead", { children: O.jsxs("tr", { children: [O.jsx("\
th", { children: p("Khung th\u1EDDi gian") }), O.jsx("th", { children: p("K\u1EF3 v\u1ECDng") }), O.jsx("th", { children: p(
  "T\u1EF7 tr\u1ECDng") }), O.jsx("th", { children: p("Ch\u1ED1t l\u1EDDi") }), O.jsx("th", { children: "Stop loss" })] }) }),
  O.jsx("tbody", { children: Object.values(T.data.risk_plan.horizons).map((d) => {
    const S = Gh(d);
    return O.jsxs("tr", { children: [O.jsx("td", { children: d.label }), O.jsx("td", { children: d.expectation_pct ? `${d.
    expectation_pct.min}% - ${d.expectation_pct.max}%` : Xn }), O.jsxs("td", { children: [Number(d.allocation_pct || 0).
    toFixed(1), "%"] }), O.jsx("td", { children: S.displayTake == null ? Xn : oe(S.displayTake) }), O.jsxs("td", { children: [
    S.displayStop == null ? Xn : oe(S.displayStop), S.adjusted && O.jsx("small", { className: "data-time", children: p("\
 \u0111i\u1EC1u ch\u1EC9nh theo gi\xE1 hi\u1EC7n t\u1EA1i") })] })] }, d.label);
  }) })] }) }), O.jsx("p", { className: "analysis-disclaimer", children: T.data.risk_plan.disclaimer }), ((qr = T.data) ==
  null ? void 0 : qr.external_factors) && O.jsxs("div", { className: "external-factor-box", children: [O.jsx("strong", {
  children: p("Y\u1EBFu t\u1ED1 b\xEAn ngo\xE0i") }), O.jsx("span", { className: "chip neutral", children: T.data.external_factors.
  status === "available" ? p(" Ngu\u1ED3n x\xE1c minh") : p("Ch\u01B0a c\xF3 ngu\u1ED3n x\xE1c minh") }), O.jsx("p", { className: "\
muted-text", children: T.data.external_factors.disclaimer || p("Ch\u01B0a c\xF3 d\u1EEF li\u1EC7u tin t\u1EE9c ho\u1EB7c v\u0129 m\xF4 cho m\xE3 n\xE0y.") }),
  (T.data.external_factors.factors || []).map((d, S) => O.jsxs("p", { className: "muted-text", children: [d.type, ": ", O.
  jsx($i, { url: d.source_url || d.url, children: d.title || p("S\u1EF1 ki\u1EC7n kh\xF4ng c\xF3 ti\xEAu \u0111\u1EC1") }),
  " - ", d.source || p("Ngu\u1ED3n ch\u01B0a x\xE1c nh\u1EADn"), " - ", He(d.published_at)] }, `${d.source || "factor"}-${S}`))] })] })] })] })] }),
  re === "advisor" && O.jsxs("section", { className: "advisor-page panel", children: [O.jsxs("div", { className: "panel-\
header", children: [O.jsxs("div", { children: [O.jsx("h3", { children: "AI Advisor" }), O.jsx("p", { className: "muted-t\
ext", children: p("H\u1EC7 th\u1ED1ng tr\u1EA3 l\u1EDDi d\u1EF1a tr\xEAn d\u1EEF li\u1EC7u v\xE0 ph\xE2n t\xEDch rule-based.") })] }),
  O.jsx("span", { className: `chip ${(Xr = au.data) != null && Xr.enabled ? "success" : "neutral"}`, children: (Zr = au.
  data) != null && Zr.enabled ? p("Generative AI  m") : p("Generative AI \u0111ang kh\xF3a") })] }), O.jsx("div", { className: "\
prompt-grid", children: [p("Ph\xE2n t\xEDch xu h\u01B0\u1EDBng ng\u1EAFn h\u1EA1n"), p("M\u1EE9c stop loss v\xE0 ch\u1ED1t l\u1EDDi"),
  p("Y\u1EBFu t\u1ED1 b\xEAn ngo\xE0i t\xE1c \u0111\u1ED9ng th\u1EBF n\xE0o?")].map((d) => O.jsx("button", { className: "\
prompt-chip", type: "button", onClick: () => Bo(d), children: d }, d)) }), O.jsx("div", { className: "chat-shell", role: "log", "aria-live": "polite", "aria-relevant": "additions text", "aria-label": "Lịch sử trao đổi với AI Advisor", children: of.
  map((d, S) => O.jsx("div", { className: `message-row ${d.role}`, children: O.jsx("div", { className: "message-bubble",
  children: d.text }) }, `${d.role}-${S}`)) }), O.jsxs("div", { className: "input-row", children: [O.jsx("input", { value: bo,
  onChange: (d) => mu(d.target.value), onKeyDown: (d) => {
    d.key === "Enter" && Bo(bo);
  }, placeholder: p("Nh\u1EADp c\xE2u h\u1ECFi cho AI Advisor..."), "aria-label": "Câu hỏi cho AI Advisor" }), O.
  jsx("button", { className: "primary-btn", type: "button", disabled: !bo.trim(), title: !bo.trim() ? "Nhập câu hỏi trước khi gửi" : "Gửi câu hỏi", onClick: () => Bo(bo), children: p("G\u1EEDi") })] })] })] })] });
}
var i = O;
var App_default = lv;
export {
  App_default as default
};
