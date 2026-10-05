import * as D from "react";
import * as O from "react/jsx-runtime";
import MarketBoardPage from "./components/MarketBoardPage.jsx";
import MarketBreadth from "./components/MarketBreadth.jsx";
import PortfolioAllocation from "./components/PortfolioAllocation.jsx";
import PortfolioLedger from "./components/PortfolioLedger.jsx";
import PortfolioPositions from "./components/PortfolioPositions.jsx";
import RecommendationWorkbench from "./components/RecommendationWorkbench.jsx";
import AdvisorWorkspace from "./components/AdvisorWorkspace.jsx";
import AuthPasswordField from "./components/AuthPasswordField.jsx";
import AuthErrorMessage from "./components/AuthErrorMessage.jsx";
import AuthSessionGate from "./components/AuthSessionGate.jsx";
import PageLoadingOverlay from "./components/PageLoadingOverlay.jsx";
import DetailSymbolSearch from "./components/DetailSymbolSearch.jsx";
import DetailHero from "./components/DetailHero.jsx";
import DetailPriceVolumeChart from "./components/DetailPriceVolumeChart.jsx";
import DetailAnalysisStatus from "./components/DetailAnalysisStatus.jsx";
import DetailExpertGuidance from "./components/DetailExpertGuidance.jsx";
import DetailRiskPlan from "./components/DetailRiskPlan.jsx";
import DetailExternalFactors from "./components/DetailExternalFactors.jsx";
import DetailSectionNav from "./components/DetailSectionNav.jsx";
import { AUTH_STORAGE_KEY, SESSION_EXPIRED_EVENT, authFromResponse, authFromStorageValue, broadcastAuthEvent, clearStoredAuth, notifySessionExpired, readStoredAuth } from "./services/authSession.mjs";
import { sessionFetch } from "./services/cookieSession.mjs";
class ur extends Error {
  constructor(n, t = null) {
    super(n), this.name = "ApiError", this.status = t;
  }
}
async function je(e, {
  signal: n,
  method: t = "GET",
  body: r,
  token: l
} = {}) {
  const o = AbortSignal.timeout(15e3),
    a = n ? AbortSignal.any([n, o]) : o;
  let u;
  try {
    u = await sessionFetch(e, {
      token: l,
      signal: a,
      method: t,
      headers: {
        Accept: "application/json",
        ...(typeof l === "string" ? {
          Authorization: `Bearer ${l}`
        } : {}),
        ...(r ? {
          "Content-Type": "application/json"
        } : {})
      },
      ...(r ? {
        body: JSON.stringify(r)
      } : {})
    });
  } catch (f) {
    throw n != null && n.aborted || f.name === "AbortError" ? f : new ur("Không thể kết nối máy chủ. Vui lòng thử lại.");
  }
  if (!u.ok) {
    let f = "";
    try {
      f = (await u.clone().json()).message || "";
    } catch {}
    const k = u.status === 401 && /Invalid or expired token/i.test(f) ? "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại." : f || (u.status === 404 ? "Không tìm thấy dữ liệu được yêu cầu." : u.status === 429 ? "Có quá nhiều yêu cầu. Vui lòng chờ một chút rồi thử lại." : "Máy chủ không thể xử lý yêu cầu. Vui lòng thử lại.");
    u.status === 401 && l && notifySessionExpired(k);
    throw new ur(`${k} (HTTP ${u.status})`, u.status);
  }
  if (u.status === 204) return {
    success: true,
    data: null
  };
  let c;
  try {
    c = await u.json();
  } catch (f) {
    throw n != null && n.aborted || f.name === "AbortError" ? f : new ur("Phản hồi máy chủ không phải JSON hợp lệ.");
  }
  if (!c || typeof c != "object" || c.success === false) throw new ur("Máy chủ trả về dữ liệu không hợp lệ hoặc yêu cầu thất bại.");
  return c;
}
function $m(e) {
  if (e.success !== true || !e.data || typeof e.data.price != "number") throw new ur("Bộ giá hiện tại trả về không đúng định dạng.");
  return e.data;
}
function Om(e) {
  if (e.success !== true || !e.data || typeof e.data != "object" || Array.isArray(e.data) || Object.values(e.data).some(n => !n || !Number.isFinite(n.price) || n.price <= 0 || !n.observed_at || !Number.isFinite(Date.parse(n.fetched_at)))) throw new ur("Danh sách báo giá hiện tại trả về không đúng định dạng.");
  return e.data;
}
function ma(e, {
  enabled: n = true,
  stockId: t = null
} = {}) {
  const r = [...new Set(e.filter(Boolean))].sort().join(","),
    l = n ? t ? `/api/stocks/${encodeURIComponent(t)}/quote` : r ? `/api/stocks/quotes?symbols=${encodeURIComponent(r)}` : null : null,
    [o, a] = D.useState({
      url: null,
      data: {},
      loading: false,
      error: "",
      providerStatus: null
    });
  return D.useEffect(() => {
    if (!l) return;
    let u = false,
      c,
      f,
      q = 0;
    const k = /* @__PURE__ */new Map();
    let j = true;
    a({
      url: l,
      data: {},
      loading: true,
      error: "",
      providerStatus: null
    });
    const y = async () => {
      var C;
      f = new AbortController();
      const E = setTimeout(() => f.abort(), 14e3),
        M = Date.now();
      let b = {},
        m = "",
        h = null;
      try {
        const [z, x] = await Promise.allSettled([je(t ? l : `${l}&poll=${q++}`, {
          signal: f.signal
        }), je("/api/stocks/quotes/status", {
          signal: f.signal
        })]);
        if (x.status === "fulfilled" && (h = ((C = x.value) == null ? void 0 : C.data) || null), z.status === "rejected") throw z.reason;
        const _ = z.value,
          P = t ? $m(_) : null;
        b = P ? {
          [P.symbol || P.stock_code || r]: P
        } : Om(_), Object.keys(b).length ? Object.values(b).some(g => g.stale) && (m = "Intraday đang dùng giá ghi nhận gần nhất; sẽ tự cập nhật.") : m = "Chưa lấy được intraday; sẽ tự thử lại.";
      } catch {
        m = "Chưa cập nhật được intraday; sẽ tự thử lại.";
      } finally {
        clearTimeout(E);
      }
      if (u) return;
      for (const [z, x] of Object.entries(b)) {
        const _ = k.get(z),
          P = (_ == null ? void 0 : _.quote.fetched_at) === x.fetched_at ? _.at : Date.now();
        k.set(z, {
          quote: x,
          at: P
        });
      }
      const v = Object.fromEntries([...k].filter(([, z]) => Date.now() - z.at < 9e4).map(([z, x]) => [z, x.quote]));
      if (j && (await new Promise(z => setTimeout(z, Math.max(0, 350 - (Date.now() - M))))), u) return;
      j = false, a({
        url: l,
        data: v,
        loading: false,
        error: m,
        providerStatus: h
      });
      const w = t ? 1 : r.split(",").filter(Boolean).length;
      c = setTimeout(y, Object.keys(v).length < w || m ? 5e3 : 3e4);
    };
    return y(), () => {
      u = true, clearTimeout(c), f == null || f.abort();
    };
  }, [l, t, r]), l ? o.url === l ? o : {
    data: {},
    loading: true,
    error: "",
    providerStatus: null
  } : {
    data: {},
    loading: false,
    error: "",
    providerStatus: null
  };
}
const Rm = {
  overview: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  "market-board": "M4 5h16v14H4zM7 9h10M7 13h4M14 13h3M7 16h6",
  portfolio: "M4 7h16v13H4zM8 7V5h8v2M8 12h8M8 16h5",
  detail: "M11 4a7 7 0 1 0 4.9 12L20 20l1-1-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z",
  recommendations: "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  advisor: "M7 8h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Zm2-4v4m6-4v4M8 13h.01M16 13h.01M9 16h6"
};
function Am({
  name: e
}) {
  return O.jsx("svg", {
    viewBox: "0 0 24 24",
    role: "img",
    focusable: "false",
    "aria-hidden": "true",
    children: O.jsx("path", {
      d: Rm[e]
    })
  });
}
class Ut extends Error {
  constructor(n, t = null) {
    super(n), this.name = "ApiError", this.status = t;
  }
}
function Pc(e) {
  if (e.success !== true || !Array.isArray(e.data) || e.data.some(n => !n || typeof n.id != "string")) throw new Ut("Danh sách cổ phiếu trả về không đúng định dạng.");
  return e.pagination && Object.defineProperty(e.data, "pagination", {
    value: e.pagination,
    enumerable: false
  }), e.data;
}
function Um(e) {
  if (e.success !== true || !e.data || typeof e.data.id != "string" || !Array.isArray(e.data.price_history)) throw new Ut("Chi tiết cổ phiếu trả về không đúng định dạng.");
  return e.data;
}
function bm(e) {
  if (e.success !== true || !e.data || !e.data.indicators || typeof e.data.observations != "number" || !e.data.quality || !e.data.risk_plan || !e.data.expert_guidance || !Array.isArray(e.data.expert_guidance.score_breakdown)) throw new Ut("Phân tích kỹ thuật trả về không đúng định dạng.");
  return e.data;
}
function Bm(e) {
  if (e.success !== true || !e.data || typeof e.data.enabled != "boolean" || !Array.isArray(e.data.reasons)) throw new Ut("Trạng thái AI Gate trả về không đúng định dạng.");
  return e.data;
}
function Vm(e) {
  if (e.success !== true || !e.data || !Array.isArray(e.data.recommendations)) throw new Ut("Đề xuất cổ phiếu trả về không đúng định dạng.");
  return e.data;
}
function Hm(e) {
  if (e.success !== true || !e.data || !Array.isArray(e.data)) throw new Ut("Lịch sử đề xuất trả về không đúng định dạng.");
  return e.data;
}
function Qm(e) {
  if (e.success !== true || !e.data || !Array.isArray(e.data.coverage)) throw new Ut("Trạng thái dữ liệu đề xuất trả về không đúng định dạng.");
  return e.data;
}
function Km(e, n, t) {
  const r = new AbortController();
  t({
    status: "loading",
    data: null,
    error: ""
  });
  const l = je(e, {
    signal: r.signal
  }).then(o => {
    if (r.signal.aborted) return;
    const a = n(o);
    r.signal.aborted || t({
      status: "success",
      data: a,
      error: ""
    });
  }).catch(o => {
    r.signal.aborted || t({
      status: "error",
      data: null,
      error: o.message
    });
  });
  return {
    cancel: () => r.abort(),
    done: l
  };
}
const Wm = e => e,
  zc = {
    status: "idle",
    data: null,
    error: ""
  },
  qm = {
    status: "loading",
    data: null,
    error: ""
  };
function Pn(e, n = Wm) {
  const [t, r] = D.useState(0),
    [l, o] = D.useState({
      ...zc,
      url: null,
      attempt: -1
    });
  return D.useEffect(() => e ? Km(e, n, a => o({
    ...a,
    url: e,
    attempt: t
  })).cancel : void 0, [e, n, t]), {
    ...(e ? l.url === e && l.attempt === t ? l : qm : zc),
    retry: () => r(a => a + 1)
  };
}
function $i({
  url: e,
  children: n
}) {
  let t;
  try {
    const r = new URL(e);
    ["https:", "http:"].includes(r.protocol) && (t = r.href);
  } catch {}
  return t ? O.jsxs("a", {
    className: "source-link",
    href: t,
    title: t,
    "aria-label": `${n} - ${t}`,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: r => r.stopPropagation(),
    children: [n, O.jsx("span", {
      "aria-hidden": "true",
      children: "↗"
    })]
  }) : O.jsx(i.Fragment, {
    children: n
  });
}
const va = e => new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(e || 0)),
  Gm = e => e && Number.isFinite(Date.parse(e)) ? new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(e)) : "Chưa có quote",
  ga = [{
    key: "up",
    label: "Tăng giá",
    color: "up"
  }, {
    key: "down",
    label: "Giảm giá",
    color: "down"
  }, {
    key: "flat",
    label: "Đứng giá",
    color: "flat"
  }];
function Ym({
  stocks: e = [],
  quotes: n = {}
}) {
  const t = D.useMemo(() => {
    const r = {
        up: {
          count: 0,
          volume: 0
        },
        down: {
          count: 0,
          volume: 0
        },
        flat: {
          count: 0,
          volume: 0
        },
        unknown: 0,
        quoted: 0,
        averageChange: null,
        latestQuoteAt: null
      },
      l = [];
    for (const o of e) {
      const a = n[o.symbol];
      a && (r.quoted += 1, (!r.latestQuoteAt || Date.parse(a.observed_at) > Date.parse(r.latestQuoteAt)) && (r.latestQuoteAt = a.observed_at));
      const u = (a == null ? void 0 : a.change) ?? o.change,
        c = Number(u);
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
    return r.averageChange = l.length ? l.reduce((o, a) => o + a, 0) / l.length : null, r.classified = r.up.count + r.down.count + r.flat.count, r.totalVolume = r.up.volume + r.down.volume + r.flat.volume, r.maxVolume = Math.max(1, r.up.volume, r.down.volume, r.flat.volume), r;
  }, [e, n]);
  return O.jsxs("section", {
    className: "panel market-breadth-panel",
    "aria-labelledby": "market-breadth-heading",
    children: [O.jsxs("div", {
      className: "panel-header market-breadth-header",
      children: [O.jsxs("div", {
        children: [O.jsx("h3", {
          id: "market-breadth-heading",
          children: "Độ rộng thị trường"
        }), O.jsxs("p", {
          className: "muted-text",
          children: [e.length, " mã trong vũ trụ · ", t.quoted, "/", e.length, " mã có quote intraday · Cập nhật gần nhất ", Gm(t.latestQuoteAt)]
        })]
      }), O.jsxs("span", {
        className: "chip neutral",
        children: [O.jsx("span", {
          className: t.averageChange != null && t.averageChange < 0 ? "negative" : "positive",
          children: t.averageChange == null ? "Chưa đủ dữ liệu" : `Biến động bình quân ${t.averageChange >= 0 ? "+" : ""}${t.averageChange.toFixed(2)}%`
        })]
      })]
    }), O.jsx("div", {
      className: "breadth-counts",
      children: ga.map(r => O.jsxs("article", {
        className: `breadth-count ${r.color}`,
        children: [O.jsx("span", {
          children: r.label
        }), O.jsx("strong", {
          children: t[r.key].count
        }), O.jsx("small", {
          children: t.classified ? `${(t[r.key].count / t.classified * 100).toFixed(1)}% số mã có biến động` : "Chưa có dữ liệu"
        })]
      }, r.key))
    }), t.classified > 0 && O.jsx("div", {
      className: "breadth-distribution",
      role: "img",
      "aria-label": `Độ rộng: tăng ${t.up.count}, giảm ${t.down.count}, đứng giá ${t.flat.count}`,
      children: ga.map(r => O.jsx("span", {
        className: `breadth-segment ${r.color}`,
        style: {
          width: `${t[r.key].count / t.classified * 100}%`
        },
        title: `${r.label}: ${t[r.key].count}`
      }, r.key))
    }), O.jsxs("div", {
      className: "breadth-volume-heading",
      children: [O.jsx("strong", {
        children: "Khối lượng phiên theo nhóm biến động"
      }), O.jsxs("span", {
        children: [va(t.totalVolume), " cổ phiếu"]
      })]
    }), O.jsx("div", {
      className: "breadth-volume-chart",
      role: "img",
      "aria-label": "Khối lượng phiên của các mã tăng giá, giảm giá và đứng giá",
      children: ga.map(r => O.jsxs("div", {
        className: "breadth-volume-column",
        title: `${r.label}: ${va(t[r.key].volume)} cổ phiếu`,
        children: [O.jsx("div", {
          className: "breadth-volume-track",
          children: O.jsx("span", {
            className: r.color,
            style: {
              height: `${t[r.key].volume / t.maxVolume * 100}%`
            }
          })
        }), O.jsx("strong", {
          children: va(t[r.key].volume)
        }), O.jsx("small", {
          children: r.label
        })]
      }, r.key))
    }), O.jsxs("p", {
      className: "breadth-disclaimer",
      children: ["Phân loại dùng biến động giá mới nhất hiện có; khối lượng chủ động lấy từ quote intraday theo phiên. Nguồn hiện tại không tách khối lượng chủ động bên mua và bên bán. ", t.unknown > 0 && `${t.unknown} mã chưa có mức biến động để phân loại.`]
    })]
  });
}
const xa = e => e == null ? "-" : new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(Number(e)) + " ₫",
  ja = e => e ? new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(e)) : "-";
function Jm({
  entries: e = []
}) {
  var n, t, r, l;
  return O.jsxs("section", {
    className: "recommendation-tracking",
    "aria-labelledby": "recommendation-tracking-title",
    children: [O.jsxs("div", {
      className: "recommendation-tracking-heading",
      children: [O.jsxs("div", {
        children: [O.jsx("h3", {
          id: "recommendation-tracking-title",
          children: "Theo dõi mã thêm từ đề xuất"
        }), O.jsx("p", {
          children: "Mỗi giao dịch được liên kết với điểm, giá tham chiếu và kỳ hạn tại lúc bạn thêm mã."
        })]
      }), O.jsxs("span", {
        className: "chip neutral",
        children: [e.length, " giao dịch"]
      })]
    }), e.length ? O.jsxs(i.Fragment, {
      children: [O.jsx("div", {
        className: "table-wrap recommendation-tracking-table",
        children: O.jsxs("table", {
          children: [O.jsx("thead", {
            children: O.jsxs("tr", {
              children: [O.jsx("th", {
                children: "Mã / đề xuất"
              }), O.jsx("th", {
                children: "Giá vào thực tế"
              }), O.jsx("th", {
                children: "Giá hiện tại"
              }), O.jsx("th", {
                children: "Biến động từ giá vào"
              }), O.jsx("th", {
                children: "Kết quả dự báo"
              })]
            })
          }), O.jsx("tbody", {
            children: e.map(o => {
              const a = o.evaluation || {},
                u = o.recommendation || {},
                c = o.current_quote,
                f = (c == null ? void 0 : c.price) ?? o.current_eod_price,
                k = Number(o.actual_entry_price),
                j = f != null && k > 0 ? (Number(f) / k - 1) * 100 : null,
                y = a.status === "pending" ? "pending" : a.outcome === "positive" ? "positive" : a.outcome === "negative" ? "negative" : "flat";
              return O.jsxs("tr", {
                children: [O.jsxs("td", {
                  children: [O.jsx("strong", {
                    children: o.symbol
                  }), O.jsxs("small", {
                    children: ["Điểm: ", Number(u.score || 0).toFixed(1), " - ", ja(u.generated_at)]
                  }), O.jsx("small", {
                    children: o.position_status === "active" ? "Còn vị thế" : "Đúng / không còn vị thế"
                  })]
                }), O.jsxs("td", {
                  children: [xa(o.actual_entry_price), O.jsx("small", {
                    children: ja(o.traded_at)
                  })]
                }), O.jsxs("td", {
                  children: [xa(f), O.jsx("small", {
                    children: c ? `Intraday · ${ja(c.observed_at)}` : "Giá EOD"
                  })]
                }), O.jsx("td", {
                  className: j == null ? "" : j >= 0 ? "positive" : "negative",
                  children: j == null ? "Chưa có giá" : `${j >= 0 ? "+" : ""}${j.toFixed(2)}%`
                }), O.jsxs("td", {
                  children: [O.jsx("span", {
                    className: `recommendation-outcome is-${y}`,
                    children: a.status === "pending" ? `Đang chờ ${a.sessions_observed || 0}/${a.horizon_days || u.horizon_days} phiên` : a.outcome === "positive" ? `Đúng chiều · +${Number(a.forward_return_pct).toFixed(2)}%` : a.outcome === "negative" ? `Ngược chiều · ${Number(a.forward_return_pct).toFixed(2)}%` : `Đi ngang · ${Number(a.forward_return_pct || 0).toFixed(2)}%`
                  }), O.jsxs("small", {
                    children: ["So giá tham chiếu ", xa(u.expected_entry_price), " sau ", a.horizon_days || u.horizon_days, " phiên"]
                  })]
                })]
              }, o.transaction_id);
            })
          })]
        })
      }), O.jsxs("p", {
        className: "recommendation-tracking-note",
        children: ["“Biến động từ giá vào” so giá hiện tại với giá trên giao dịch đã ghi nhận; đây không phải lãi/lỗ thực hiện. “Kết quả dự báo” so giá EOD ở phiên thứ ", ((t = (n = e[0]) == null ? void 0 : n.evaluation) == null ? void 0 : t.horizon_days) || ((l = (r = e[0]) == null ? void 0 : r.recommendation) == null ? void 0 : l.horizon_days) || 20, " với giá tham chiếu lúc đề xuất. Trạng thái chờ tự cập nhật khi có đủ phiên."]
      })]
    }) : O.jsx("p", {
      className: "recommendation-tracking-empty",
      children: "Mã thêm từ trang đề xuất sẽ xuất hiện ở đây sau khi bạn lưu giao dịch. Những giao dịch cũ không có liên kết nguồn sẽ không được gán ngược thành giao dịch từ đề xuất."
    })]
  });
}
const p = e => e,
  Xn = "Chưa có dữ liệu",
  oe = e => e == null ? Xn : new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 2
  }).format(Number(e || 0)),
  Et = e => e == null ? Xn : new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(e || 0)),
  Hh = e => e == null ? Xn : `${Number(e) >= 0 ? "+" : ""}${Number(e).toFixed(2)}%`,
  He = e => e ? new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(new Date(e)) : Xn,
  cr = e => {
    const n = new Date(e);
    return Number.isNaN(n.getTime()) ? String(e || "").slice(0, 10) : new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(n);
  };
function ev(e = [], n = null) {
  const t = /* @__PURE__ */new Map();
  for (const r of e) {
    const l = cr(r.observed_at),
      o = t.get(l);
    (!o || Date.parse(r.observed_at) >= Date.parse(o.observed_at)) && t.set(l, r);
  }
  if ((n == null ? void 0 : n.price) != null && n.observed_at) {
    const r = {
      close: n.price,
      price: n.price,
      volume: n.volume,
      observed_at: n.observed_at,
      fetched_at: n.fetched_at,
      provider: n.upstream,
      interval: "intraday",
      open: n.open,
      high: n.high,
      low: n.low
    };
    t.set(cr(n.observed_at), r);
  }
  return [...t.values()].sort((r, l) => Date.parse(r.observed_at) - Date.parse(l.observed_at));
}
const nv = e => ({
    id: e.id,
    symbol: e.code || e.symbol || "N/A",
    name: e.name || p("Chưa có tên"),
    price: e.price == null ? null : Number(e.price),
    change: e.change == null ? null : Number(e.change),
    volume: e.volume == null ? null : Number(e.volume),
    rating: e.rating || p("Chưa đánh giá"),
    industry: e.industry || p("Chưa phân loại"),
    exchange: e.exchange || null,
    listingStatus: e.listing_status || "unknown",
    listingCheckedAt: e.listing_checked_at || null,
    dataSource: e.data_source,
    dataFetchedAt: e.data_fetched_at,
    sourceUrl: e.data_source_url || e.source_url,
    url: e.website_url || e.url
  }),
  tv = e => {
    var n;
    const t = Number(((n = e.liveQuote) == null ? void 0 : n.change) ?? e.change);
    return Number.isFinite(t) ? t >= 1 ? {
      label: "Tăng tích cực",
      detail: "Động lượng tăng; kiểm tra vùng kháng cự."
    } : t <= -1 ? {
      label: "Áp lực giảm",
      detail: "Áp lực bán tăng; kiểm tra vùng hỗ trợ."
    } : {
      label: "Đi ngang",
      detail: "Biên độ hẹp; chờ xác nhận xu hướng."
    } : {
      label: "Theo dõi thêm",
      detail: "Chờ quote mới để xác nhận xu hướng."
    };
  };
function lv() {
  var e, n, t, r, l, o, a, u, c, f, k, j, y, C, E, M, b, m, h, v, w, z, x, _, P, g, I, B, K, ie, ye, mn, se, Ye, L, R, U, W, X, vn, Ae, _n, Ue, gn, Er, Tr, Pr, zr, Mr, Lr;
  const [Ir, Fr] = D.useState(false),
    [bt, Dr] = D.useState(""),
    [Jl, s] = D.useState(0),
    $r = D.useRef(null);
  var Or, Rr, Ar, Ur, br, Br, Vr, Hr, Qr, Kr, Wr, qr, Gr, Yr, Xr, Zr;
  const [ue, Bt] = D.useState(() => readStoredAuth() || {
      token: true,
      mode: "cookie",
      user: null
    }),
    [authVerification, setAuthVerification] = D.useState(() => ({
      status: ue ? "verifying" : "idle",
      message: ""
    })),
    [Un, ei] = D.useState("login"),
    [bn, Vt] = D.useState({
      email: "",
      password: ""
    }),
    [authError, setAuthError] = D.useState(""),
    [authCredentialCleared, setAuthCredentialCleared] = D.useState(false),
    [authNotice, setAuthNotice] = D.useState(""),
    [authSubmitting, setAuthSubmitting] = D.useState(false),
    [transactionSubmitting, setTransactionSubmitting] = D.useState(false),
    [dt, on] = D.useState(""),
    [re, Xe] = D.useState(() => {
      try {
        return sessionStorage.getItem("stockpilot-view") || (sessionStorage.getItem("stockpilot-market-view") === "board" ? "market-board" : "overview");
      } catch {
        return "overview";
      }
    }),
    [yn, ni] = D.useState(() => {
      try {
        return sessionStorage.getItem("stockpilot-sidebar-collapsed") === "1";
      } catch {
        return false;
      }
    }),
    [Cn, ht] = D.useState(() => {
      try {
        return sessionStorage.getItem("stockpilot-selected-id") || null;
      } catch {
        return null;
      }
    }),
    [be, ti] = D.useState({
      key: "volume",
      direction: "desc"
    }),
    [ft, ri] = D.useState(""),
    [xn, En] = D.useState(1),
    [Ht, li] = D.useState(40),
    [Qt, ii] = D.useState(""),
    [pt, Bn] = D.useState([]),
    [Jr, el] = D.useState(""),
    [pe, mt] = D.useState(null),
    [nl, tl] = D.useState(""),
    [rl, vt] = D.useState(""),
    gt = D.useMemo(() => new Set(((pe == null ? void 0 : pe.positions) || []).filter(d => Number(d.quantity) > 0).map(d => {
      var S;
      return (S = d.symbol) == null ? void 0 : S.toUpperCase();
    }).filter(Boolean)), [pe]),
    yt = D.useMemo(() => new Set(pt.map(d => {
      var S, $;
      return ($ = ((S = d.Stock) == null ? void 0 : S.code) || d.symbol) == null ? void 0 : $.toUpperCase();
    }).filter(Boolean)), [pt]),
    Vn = D.useMemo(() => /* @__PURE__ */new Set([...gt, ...yt]), [gt, yt]),
    ll = [...Vn].sort().join(",");
  const currentAuthRef = D.useRef(ue);
  currentAuthRef.current = ue;
  const endSession = (message = "", notice = "") => {
    clearStoredAuth();
    $r.current = null;
    Bn([]);
    mt(null);
    Vt({
      email: "",
      password: ""
    });
    setAuthSubmitting(false);
    setAuthError(message);
    setAuthCredentialCleared(Boolean(message));
    setAuthNotice(notice);
    setAuthVerification({
      status: "idle",
      message: ""
    });
    on("");
    Bt(null);
  };
  D.useEffect(() => {
    const handleSessionExpired = d => endSession(d.detail?.message || "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);
  D.useEffect(() => {
    const applyCookieEvent = type => {
      if (type === "logout") return endSession("", "Phiên đăng nhập đã kết thúc ở một tab khác.");
      $r.current = null;
      Bn([]);
      mt(null);
      setAuthVerification({ status: "verifying", message: "" });
      Bt({ token: true, mode: "cookie", user: null });
    };
    const handleAuthStorage = event => {
      if (event.key !== AUTH_STORAGE_KEY) return;
      if (event.newValue === null) return endSession("", "Phiên đăng nhập đã kết thúc ở một tab khác.");
      let nextAuth;
      try {
        nextAuth = authFromStorageValue(event.newValue);
      } catch {
        return endSession("Dữ liệu phiên từ tab khác không hợp lệ. Vui lòng đăng nhập lại.");
      }
      if (nextAuth.event) {
        return applyCookieEvent(nextAuth.event);
      }
      if (nextAuth.token === currentAuthRef.current?.token) return;
      $r.current = null;
      Bn([]);
      mt(null);
      Vt({
        email: "",
        password: ""
      });
      setAuthError("");
      setAuthCredentialCleared(false);
      setAuthNotice("");
      setAuthVerification({
        status: "verifying",
        message: ""
      });
      Bt(nextAuth);
    };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("stockpilot-auth") : null;
    if (channel) channel.onmessage = event => applyCookieEvent(event.data?.type);
    window.addEventListener("storage", handleAuthStorage);
    return () => {
      window.removeEventListener("storage", handleAuthStorage);
      channel == null || channel.close();
    };
  }, []);
  D.useEffect(() => {
    if (!ue || authVerification.status !== "verifying") return;
    let active = true;
    const controller = new AbortController();
    je("/api/auth/me", {
      token: ue.token,
      signal: controller.signal
    }).then(response => {
      if (!active) return;
      const verified = authFromResponse({
        ...(typeof ue.token === "string" ? { token: ue.token } : {}),
        user: response.user
      });
      Bt(verified);
      setAuthVerification({
        status: "verified",
        message: ""
      });
    }).catch(error => {
      if (!active || controller.signal.aborted || error.status === 401) return;
      setAuthVerification({
        status: "error",
        message: error.message
      });
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [ue == null ? void 0 : ue.token, authVerification.status]);
  D.useEffect(() => {
    En(1);
  }, [ll]);
  D.useEffect(() => {
    window.dispatchEvent(new Event("stockpilot:react-commit"));
  });
  const xt = D.useRef(null),
    [oi, jt] = D.useState(false);
  D.useEffect(() => {
    var d;
    re === "portfolio" && oi && ((d = xt.current) == null || d.focus(), jt(false));
  }, [re, oi]);
  const [Ie, kt] = D.useState({
      symbol: "",
      side: "BUY",
      quantity: "",
      price: "",
      fees: "",
      traded_at: (/* @__PURE__ */new Date()).toISOString().slice(0, 10),
      recommendation_context: null
    }),
    Be = D.useRef(null),
    Ze = d => {
      Be.current = window.scrollY, d();
    };
  D.useEffect(() => {
    try {
      sessionStorage.setItem("stockpilot-view", re), Cn == null ? sessionStorage.removeItem("stockpilot-selected-id") : sessionStorage.setItem("stockpilot-selected-id", String(Cn));
    } catch {}
  }, [re, Cn]), D.useEffect(() => {
    try {
      sessionStorage.setItem("stockpilot-sidebar-collapsed", yn ? "1" : "0");
    } catch {}
  }, [yn]), D.useEffect(() => {
    if (!ue) {
      Bn([]), mt(null);
      return;
    }
    if (authVerification.status !== "verified") return;
    $r.current !== ue.token && (Bn([]), mt(null), $r.current = ue.token);
    let d = false;
    const S = new AbortController();
    typeof ue.token === "string" && localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(ue));
    const $ = A => {
      d || A.status !== 401 && Dr("Không tải được danh mục. Vui lòng thử lại.");
    };
    return Fr(true), Dr(""), je("/api/watchlist", {
      token: ue.token,
      signal: S.signal
    }).then(A => {
      d || Bn(A.data || []);
    }).catch(A => {
      A.status === 401 && $(A);
    }), je("/api/portfolio", {
      token: ue.token,
      signal: S.signal
    }).then(A => {
      d || mt(A.data);
    }).catch($).finally(() => {
      d || Fr(false);
    }), () => {
      d = true, S.abort();
    };
  }, [ue, Jl, authVerification.status]);
  const wt = Pn("/api/health"),
    ai = Pn("/api/cache/stats"),
    au = Pn("/api/ai-gate", Bm),
    su = Pn("/api/recommendations/latest", Vm),
    uu = Pn("/api/recommendations/history?limit=5", Hm);
  Pn("/api/recommendations/readiness", Qm);
  const Nt = Pn(`/api/stocks?page=${xn}&pageSize=${ft ? 200 : Ht}&q=${encodeURIComponent(ft)}&sector=${encodeURIComponent(Qt)}&sort=${be.key === "symbol" ? "code" : be.key}&direction=${be.direction}&pinned=${encodeURIComponent(ll)}`, Pc),
    il = D.useMemo(() => (Nt.data || []).map(nv), [Nt.data]),
    si = D.useMemo(() => il.slice(0, 40), [il]),
    ol = ma(si.map(d => d.symbol), {
      enabled: re === "overview"
    }),
    an = ol.data,
    cu = ol.loading,
    ui = ol.providerStatus,
    Oo = [...new Set([...((pe == null ? void 0 : pe.positions) || []).map(d => d.symbol), ...((pe == null ? void 0 : pe.recommendation_entries) || []).map(d => d.symbol)].filter(Boolean))].sort(),
    ci = ma(Oo, {
      enabled: re === "portfolio"
    }),
    di = ci.data,
    Qh = ci.error,
    hi = ci.providerStatus,
    Ro = D.useMemo(() => [...il].map(d => an[d.symbol] ? {
      ...d,
      price: an[d.symbol].price,
      change: an[d.symbol].change ?? null,
      volume: an[d.symbol].volume_type === "session" ? an[d.symbol].volume : d.volume,
      liveQuote: an[d.symbol]
    } : d).sort((d, S) => {
      const $ = Number(Vn.has(S.symbol)) - Number(Vn.has(d.symbol));
      if ($) return $;
      const A = d[be.key] ?? "",
        Z = S[be.key] ?? "",
        de = typeof A == "string" ? String(A).localeCompare(String(Z), "vi") : Number(A) - Number(Z);
      return be.direction === "asc" ? de : -de;
    }), [il, be, an, Vn]),
    me = Ro.find(d => d.id === Cn) || (Cn ? {
      id: Cn
    } : Ro[0]),
    Ee = Pn(me != null && me.id ? `/api/stocks/${encodeURIComponent(me.id)}` : null, Um),
    [Kh, du] = D.useState(false),
    [Wh, hu] = D.useState(false),
    T = Pn(Kh && me != null && me.id ? `/api/stocks/${encodeURIComponent(me.id)}/analysis${Wh ? "?refresh=1" : ""}` : null, bm),
    fi = ma([], {
      enabled: re === "detail",
      stockId: me == null ? void 0 : me.id
    }),
    Te = Object.values(fi.data)[0] || null,
    qh = fi.error,
    pi = fi.providerStatus;
  D.useEffect(() => {
    du(() => {
      try {
        return re === "detail" && sessionStorage.getItem("analysis-requested:" + (me == null ? void 0 : me.id)) === "1";
      } catch {
        return false;
      }
    }), hu(false);
  }, [me == null ? void 0 : me.id, re]);
  const Kt = Number((Te == null ? void 0 : Te.price) ?? ((Rr = (Or = T.data) == null ? void 0 : Or.risk_plan) == null ? void 0 : Rr.current_price) ?? ((Ar = Ee.data) == null ? void 0 : Ar.price)),
    Gh = d => {
      const S = Number(d.stop_loss),
        $ = Number(d.take_profit),
        A = Number.isFinite(Kt) && Kt > 0,
        Z = A && Number.isFinite(S) && S >= Kt,
        de = A && d.take_profit != null && Number.isFinite($) && $ <= Kt;
      return {
        ...d,
        displayStop: Z ? Kt * 0.99 : d.stop_loss,
        displayTake: de ? Kt * 1.08 : d.take_profit,
        adjusted: Z || de
      };
    };
  D.useEffect(() => {
    if (Be.current == null) return;
    const d = Be.current;
    Be.current = null, requestAnimationFrame(() => window.scrollTo({
      top: d,
      behavior: "auto"
    }));
  }, [ft, Qt, be, xn, Ht]);
  const Yh = async d => {
      d.preventDefault();
      if (authSubmitting) return;
      setAuthError("");
      setAuthCredentialCleared(false);
      setAuthNotice("");
      setAuthSubmitting(true);
      try {
        const S = await je(`/api/auth/${Un}`, {
            method: "POST",
            body: bn
          }),
          $ = authFromResponse(S);
        setAuthVerification({
          status: "verified",
          message: ""
        }), Bt($), Vt({
          email: "",
          password: ""
        }), setAuthError(""), setAuthCredentialCleared(false), setAuthNotice(""), on(""), broadcastAuthEvent("login");
      } catch (S) {
        setAuthError(S.message);
      } finally {
        setAuthSubmitting(false);
      }
    },
    Xh = async d => {
      d.preventDefault();
      try {
        await je("/api/watchlist", {
          method: "POST",
          token: ue.token,
          body: {
            symbol: Jr
          }
        });
        const S = await je("/api/watchlist", {
          token: ue.token
        });
        Bn(S.data || []), el("");
      } catch (S) {
        on(S.message);
      }
    },
    Ao = d => {
      kt({
        symbol: d.symbol,
        side: "BUY",
        quantity: "",
        price: d.price == null ? "" : String(d.price),
        fees: "",
        traded_at: (/* @__PURE__ */new Date()).toISOString().slice(0, 10),
        recommendation_context: d.recommendationContext || null
      }), on(""), Xe("portfolio"), jt(true);
    },
    Zh = async d => {
      d.preventDefault();
      if (transactionSubmitting) return;
      setTransactionSubmitting(true);
      try {
        const S = await je("/api/portfolio/transactions", {
            method: "POST",
            token: ue.token,
            body: Ie
          }),
          $ = await je("/api/portfolio", {
            token: ue.token
          }),
          A = Ie.recommendation_context,
          Z = $.data || {};
        if (A && !(Z.recommendation_entries || []).some(de => de.transaction_id === (S.data == null ? void 0 : S.data.id))) {
          const de = {
            transaction_id: (S.data == null ? void 0 : S.data.id) || `pending-${Date.now()}`,
            stock_id: null,
            symbol: Ie.symbol,
            actual_entry_price: Number(Ie.price),
            current_eod_price: null,
            recommendation: A,
            evaluation: {
              status: "pending",
              sessions_observed: 0,
              horizon_days: A.horizon_days,
              outcome: "pending"
            }
          };
          $.data = {
            ...Z,
            recommendation_entries: [...(Z.recommendation_entries || []), de]
          };
        }
        mt($.data), on(p("Ghi nhận giao dịch"));
      } catch (S) {
        on(S.message);
      } finally {
        setTransactionSubmitting(false);
      }
    },
    importPortfolioTransactions = async (rows, dryRun) => {
      const response = await je("/api/portfolio/transactions/import", {
        method: "POST",
        token: ue.token,
        body: {
          rows,
          dry_run: dryRun
        }
      });
      if (!dryRun) {
        const refreshed = await je("/api/portfolio", {
          token: ue.token
        });
        mt(refreshed.data);
      }
      return response.data;
    },
    updatePortfolioTransaction = async (transactionId, values) => {
      await je(`/api/portfolio/transactions/${encodeURIComponent(transactionId)}`, {
        method: "PUT",
        token: ue.token,
        body: values
      });
      const refreshed = await je("/api/portfolio", {
        token: ue.token
      });
      mt(refreshed.data);
    },
    deletePortfolioTransaction = async transactionId => {
      await je(`/api/portfolio/transactions/${encodeURIComponent(transactionId)}`, {
        method: "DELETE",
        token: ue.token,
        body: {
          confirmed: true
        }
      });
      const refreshed = await je("/api/portfolio", {
        token: ue.token
      });
      mt(refreshed.data);
    },
    Jh = d => Ze(() => {
      En(1), ti(S => S.key === d ? {
        key: d,
        direction: S.direction === "asc" ? "desc" : "asc"
      } : {
        key: d,
        direction: "asc"
      });
    }),
    fu = d => Ze(() => En(Math.max(1, d))),
    ef = d => Ze(() => {
      En(1), li(Number(d));
    }),
    nf = su.data,
    tf = async d => {
      d.preventDefault();
      const S = nl.trim();
      if (S) {
        vt("");
        try {
          const $ = await je("/api/stocks?page=1&pageSize=200&q=" + encodeURIComponent(S) + "&sort=code"),
            A = Pc($),
            Z = A.find(de => String(de.code || de.symbol).toUpperCase() === S.toUpperCase()) || A[0];
          if (!Z) {
            vt(p("Không thấy thư mục này trong danh sách."));
            return;
          }
          ht(Z.id), tl(""), vt(""), Xe("detail");
        } catch ($) {
          vt($.message);
        }
      }
    },
    rf = async d => {
      try {
        await je(`/api/watchlist/${encodeURIComponent(d)}`, {
          method: "DELETE",
          token: ue.token
        }), Bn(S => S.filter($ => {
          var A;
          return ((A = $.Stock) == null ? void 0 : A.code) !== d;
        }));
      } catch (S) {
        on(S.message);
      }
    },
    mi = ((pe == null ? void 0 : pe.positions) || []).map(d => {
      var S;
      const $ = di[(S = d.symbol) == null ? void 0 : S.toUpperCase()] || d.current_quote,
        A = ($ == null ? void 0 : $.price) ?? d.market_price,
        Z = A == null ? null : Number(d.quantity) * Number(A),
        de = Number(d.avg_cost || 0) * Number(d.quantity || 0);
      return {
        ...d,
        market_price: A,
        market_value: Z,
        unrealized_pnl: Z == null ? d.unrealized_pnl : Z - de,
        quote: $
      };
    }),
    vi = mi.reduce((d, S) => d + Number(S.market_value || 0), 0),
    Wt = mi.map(d => ({
      ...d,
      weight: vi > 0 ? Number(d.market_value || 0) / vi * 100 : 0
    })),
    lf = ((pe == null ? void 0 : pe.recommendation_entries) || []).map(d => {
      var S;
      const $ = di[(S = d.symbol) == null ? void 0 : S.toUpperCase()],
        A = ($ == null ? void 0 : $.price) ?? d.current_eod_price,
        Z = Number(d.actual_entry_price),
        de = A != null && Z > 0 ? Number(((Number(A) / Z - 1) * 100).toFixed(2)) : null,
        Gt = ((pe == null ? void 0 : pe.positions) || []).some(St => {
          var sl, ul;
          return ((sl = St.symbol) == null ? void 0 : sl.toUpperCase()) === ((ul = d.symbol) == null ? void 0 : ul.toUpperCase()) && Number(St.quantity) > 0;
        });
      return {
        ...d,
        current_price: A,
        current_quote: $,
        actual_return_pct: de,
        position_status: Gt ? "active" : "closed"
      };
    }),
    qt = ["#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#2dd4bf", "#f97316", "#818cf8"];
  let Uo = 0;
  const pu = Wt.map((d, S) => {
    const $ = Uo;
    return Uo += d.weight, `${qt[S % qt.length]} ${$}% ${Uo}%`;
  }).join(", ");
  if (ue && authVerification.status !== "verified") return O.jsx(AuthSessionGate, {
    status: authVerification.status,
    message: authVerification.message,
    onRetry: () => setAuthVerification({
      status: "verifying",
      message: ""
    }),
    onSignIn: () => endSession("", "Vui lòng đăng nhập lại để tiếp tục.")
  });
  if (!ue) return O.jsx("div", {
    className: "auth-page",
    children: O.jsxs("section", {
      className: "auth-card panel",
      children: [O.jsxs("div", {
        className: "brand-block",
        children: [O.jsx("div", {
          className: "brand-mark",
          children: "S"
        }), O.jsxs("div", {
          children: [O.jsx("p", {
            className: "eyebrow",
            children: "AI Platform"
          }), O.jsx("h2", {
            children: "StockPilot"
          })]
        })]
      }), O.jsx("p", {
        className: "eyebrow accent",
        children: p("Phân tích cá nhân")
      }), O.jsx("h1", {
        children: p(Un === "login" ? "Đăng nhập" : "Tạo tài khoản")
      }), O.jsx("p", {
        className: "muted-text",
        children: p("Đăng nhập để lưu watchlist và danh mục riêng.")
      }), O.jsxs("form", {
        onSubmit: Yh,
        className: "auth-form",
        "aria-busy": authSubmitting,
        children: [O.jsxs("label", {
          children: [p("Email"), O.jsx("input", {
            "aria-label": p("Email đăng nhập"),
            type: "email",
            placeholder: "you@example.com",
            value: bn.email,
            onChange: d => Vt({
              ...bn,
              email: d.target.value
            }),
            disabled: authSubmitting,
            required: true
          })]
        }), O.jsx(AuthPasswordField, {
          value: bn.password,
          mode: Un,
          disabled: authSubmitting,
          onChange: d => Vt({
            ...bn,
            password: d
          })
        }), O.jsx("button", {
          className: "primary-btn",
          type: "submit",
          disabled: authSubmitting,
          children: p(authSubmitting ? Un === "login" ? "Đang đăng nhập…" : "Đang tạo tài khoản…" : Un === "login" ? "Đăng nhập" : "Đăng ký")
        }), O.jsx("button", {
          className: "ghost-btn",
          type: "button",
          disabled: authSubmitting,
          onClick: () => {
            ei(Un === "login" ? "register" : "login"), setAuthError(""), setAuthCredentialCleared(false), setAuthNotice(""), on("");
          },
          children: p(Un === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập")
        }), authSubmitting && O.jsx("p", {
          className: "auth-submit-status",
          role: "status",
          "aria-live": "polite",
          children: Un === "login" ? "Đang xác thực thông tin đăng nhập…" : "Đang tạo tài khoản an toàn…"
        }), O.jsx(AuthErrorMessage, {
          message: authError || dt,
          mode: Un,
          credentialCleared: authCredentialCleared
        }), authNotice && O.jsx("p", {
          className: "auth-session-notice",
          role: "status",
          "aria-live": "polite",
          children: authNotice
        })]
      })]
    })
  });
  const al = Ro,
    gi = ((Ur = Nt.data) == null ? void 0 : Ur.pagination) || {
      page: xn,
      total: al.length,
      totalPages: 1
    },
    vu = gi.total ?? al.length,
    yi = Object.keys(an).length,
    gu = (e = Object.values(an).find(d => d == null ? void 0 : d.license_url)) == null ? void 0 : e.license_url,
    sf = (/* @__PURE__ */new Set([...gt, ...yt])).size,
    yu = Object.values(an).reduce((d, S) => {
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
    },
    currentPageTitle = pageTitles[re] || pageTitles.overview,
    navigateToPage = view => {
      try {
        Object.keys(sessionStorage).filter(key => key.startsWith("analysis-requested:")).forEach(key => sessionStorage.removeItem(key));
      } catch {}
      window.__stockpilotResetAnalysis?.();
      Xe(view);
    },
    openMarketStock = (stock, options = {}) => {
      ht(stock.id);
      if (options.analyze) {
        try {
          sessionStorage.setItem(`analysis-requested:${stock.id}`, "1");
        } catch {}
        window.__stockpilotRequestAnalysis?.();
      }
      Xe("detail");
    };
  return O.jsxs("div", {
    className: `dashboard-shell ${yn ? "sidebar-collapsed" : ""}`,
    children: [O.jsxs("aside", {
      className: `sidebar ${yn ? "is-collapsed" : ""}`,
      children: [O.jsxs("div", {
        className: "brand-block",
        children: [O.jsx("div", {
          className: "brand-mark",
          children: "S"
        }), O.jsxs("div", {
          children: [O.jsx("p", {
            className: "eyebrow",
            children: "AI Platform"
          }), O.jsx("h2", {
            children: "StockPilot"
          })]
        })]
      }), O.jsx("button", {
        type: "button",
        className: "sidebar-toggle",
        title: yn ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng",
        "aria-label": yn ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng",
        onClick: () => ni(d => !d),
        children: O.jsx("svg", {
          className: "sidebar-toggle-icon",
          "data-sidebar-direction": yn ? "right" : "left",
          viewBox: "0 0 24 24",
          "aria-hidden": "true",
          children: O.jsx("path", {
            d: yn ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"
          })
        })
      }), O.jsx("nav", {
        className: "nav",
        children: [["overview", "Tổng quan", "-"], ["market-board", "Bảng giá", "-"], ["portfolio", "Danh mục cá nhân", "-"], ["detail", "Chi tiết mã", "-"], ["recommendations", "Đề xuất", "-"], ["advisor", "AI Advisor", "-"]].map(([d, S, $]) => O.jsx("button", {
          className: `nav-item ${d === "market-board" ? "market-board-nav-item " : ""}${re === d ? "active" : ""}`,
          onClick: () => navigateToPage(d),
          title: S,
          "aria-label": S,
          "aria-current": re === d ? "page" : void 0,
          children: [O.jsx("span", {
            className: "nav-icon",
            children: O.jsx(Am, {
              name: d
            })
          }), O.jsx("span", {
            className: "nav-label",
            children: p(S)
          })]
        }, d))
      }), O.jsxs("div", {
        className: "profile-card",
        children: [O.jsx("p", {
          className: "eyebrow",
          children: p("Tài khoản")
        }), O.jsx("strong", {
          className: "profile-email",
          children: ue.user.email
        }), O.jsx("span", {
          className: "role-badge",
          children: ue.user.role === "admin" ? p("Quản trị viên") : p("Nhà đầu tư")
        }), O.jsx("button", {
          className: "ghost-btn profile-logout-btn",
          type: "button",
          "aria-label": "Đăng xuất khỏi tài khoản",
          onClick: async () => {
            try { await je("/api/auth/logout", { method: "POST", token: ue.token }); } catch {}
            broadcastAuthEvent("logout"), endSession("", "Bạn đã đăng xuất an toàn.");
          },
          children: p("Đăng xuất")
        }), O.jsx("small", {
          className: "profile-details-note",
          children: p("Email là định danh đăng nhập; chỉnh sửa thông tin cá nhân sẽ được bổ sung khi backend có contract xác thực.")
        }), O.jsx("span", {
          className: "profile-verification-status",
          role: "status",
          children: p("Xác thực email: chưa có dữ liệu")
        }), O.jsx("p", {
          className: "eyebrow",
          children: p("Danh mục")
        })]
      })]
    }), O.jsxs("main", {
      className: "main-panel",
      children: [O.jsxs("header", {
        className: "topbar",
        children: [O.jsxs("div", {
          children: [O.jsx("p", {
            className: "eyebrow",
            children: currentPageTitle[0]
          }), O.jsx("h1", {
            children: currentPageTitle[1]
          })]
        }), O.jsxs("div", {
          className: "topbar-actions topbar-actions-empty",
          role: "group",
          "aria-label": "Thông tin và thao tác tài khoản",
          children: [O.jsx("span", {
            className: "topbar-user-email",
            title: ue.user.email,
            "aria-label": `Tài khoản ${ue.user.email}`,
            children: ue.user.email
          }), O.jsx("span", {
            className: "topbar-user-role",
            children: ue.user.role === "admin" ? p("Quản trị viên") : p("Nhà đầu tư")
          }), O.jsx("button", {
            className: "ghost-btn",
            "aria-label": "Đăng xuất khỏi tài khoản",
            title: "Đăng xuất khỏi tài khoản",
            onClick: async () => {
              try {
                await je("/api/auth/logout", { method: "POST", token: ue.token });
              } catch {}
              broadcastAuthEvent("logout"), endSession("", "Bạn đã đăng xuất an toàn.");
            },
            children: p("Đăng xuất")
          })]
        })]
      }), (re === "overview" && cu || re === "portfolio" && ci.loading || re === "detail" && (Ee.status === "loading" || fi.loading) || re === "recommendations" && (su.status === "loading" || uu.status === "loading")) && O.jsx(PageLoadingOverlay, {
        active: true,
        label: re === "detail" ? p("Đang tải dữ liệu Chi tiết mã mới nhất...") : re === "recommendations" ? p("Đang cập nhật dữ liệu Đề xuất mới nhất...") : re === "portfolio" ? p("Đang cập nhật dữ liệu Danh mục mới nhất...") : p("Đang cập nhật dữ liệu Thị trường mới nhất...")
      }), re !== "market-board" && (wt.error || ai.error) && O.jsxs("section", {
        className: "api-panel diagnostics-panel",
        children: [wt.error && O.jsxs("p", {
          role: "alert",
          children: [wt.error, " ", O.jsx("button", {
            className: "ghost-btn small-btn",
            onClick: wt.retry,
            children: p("Thử lại health")
          })]
        }), ai.error && O.jsxs("p", {
          role: "alert",
          children: [ai.error, " ", O.jsx("button", {
            className: "ghost-btn small-btn",
            onClick: ai.retry,
            children: p("Thử lại cache")
          })]
        })]
      }), O.jsx(MarketBoardPage, {
        active: re === "market-board",
        overviewStocks: il,
        overviewTotal: vu,
        overviewQuotes: an,
        portfolioSymbols: [...gt],
        watchlistSymbols: [...yt],
        onOpenDetail: openMarketStock,
        onAddToPortfolio: stock => Ao({
          ...stock,
          symbol: stock.symbol || stock.code
        })
      }), re === "overview" && O.jsxs(i.Fragment, {
        children: [O.jsxs("section", {
          className: "overview-hero panel",
          children: [O.jsxs("div", {
            children: [O.jsx("p", {
              className: "eyebrow accent",
              children: p("Tổng quan thị trường")
            }), O.jsx("h2", {
              children: p("Theo dõi giá và các mã quan tâm của bạn.")
            }), O.jsx("p", {
              children: p("Giá intraday được dùng khi có quote; các mã còn lại giữ giá EOD.")
            })]
          }), O.jsxs("div", {
            className: "overview-hero-actions",
            children: [O.jsx("button", {
              className: "primary-btn",
              type: "button",
              onClick: () => Xe("portfolio"),
              children: p("Mã danh mục cá nhân")
            }), O.jsx("button", {
              className: "ghost-btn",
              type: "button",
              onClick: () => Xe("recommendations"),
              children: p("Đến tab đề xuất")
            })]
          })]
        }), O.jsxs("section", {
          className: "overview-metrics",
          "aria-label": p("Tóm tắt thị trường"),
          children: [O.jsxs("article", {
            className: "panel overview-metric",
            children: [O.jsx("span", {
              children: p("Mã trong vũ trụ dữ liệu")
            }), O.jsx("strong", {
              children: vu
            }), O.jsx("small", {
              children: p("Kết quả theo bộ lọc hiện tại")
            })]
          }), O.jsxs("article", {
            className: "panel overview-metric",
            children: [O.jsx("span", {
              children: p("Quote intraday")
            }), O.jsxs("strong", {
              children: [yi, O.jsxs("small", {
                children: [" / ", il.length]
              })]
            }), O.jsx("small", {
              children: p("Mã có quote; còn lại dùng EOD")
            })]
          }), O.jsxs("article", {
            className: "panel overview-metric",
            children: [O.jsx("span", {
              children: p("Mã cá nhân")
            }), O.jsx("strong", {
              children: sf
            }), O.jsx("small", {
              children: p("Danh mục hoặc Watchlist")
            })]
          }), O.jsxs("article", {
            className: "panel overview-metric",
            children: [O.jsx("span", {
              children: p("Quote mới nhất")
            }), O.jsx("strong", {
              className: "overview-time",
              children: yu ? He(yu) : p("Chưa có quote")
            }), O.jsx("small", {
              children: p("Thời điểm provider ghi nhận")
            })]
          })]
        }), O.jsx(MarketBreadth, {
          stocks: si,
          quotes: an,
          universeTotal: vu,
          onOpenDetail: openMarketStock
        }), false && O.jsxs("section", {
          className: "panel legacy-table-panel",
          children: [O.jsxs("div", {
            className: "panel-header",
            children: [O.jsx("h3", {
              children: p("Danh sách cổ phiếu")
            }), O.jsxs("div", {
              className: "table-tools",
              children: [O.jsxs("div", {
                className: "table-tabs",
                children: [O.jsx("button", {
                  className: "tab-btn active",
                  type: "button",
                  children: p("Tất cả")
                }), O.jsxs("select", {
                  className: "sector-select",
                  "aria-label": p("Nhóm ngành"),
                  value: Qt,
                  onChange: d => Ze(() => {
                    En(1), ii(d.target.value);
                  }),
                  children: [O.jsx("option", {
                    value: "",
                    children: p("Nhóm ngành")
                  }), O.jsx("option", {
                    value: "technology",
                    children: p("Công nghệ")
                  }), O.jsx("option", {
                    value: "banking_finance",
                    children: p("Ngành ngân hàng và tài chính")
                  }), O.jsx("option", {
                    value: "securities",
                    children: p("Chứng khoán")
                  }), O.jsx("option", {
                    value: "real_estate",
                    children: p("Bất động sản")
                  }), O.jsx("option", {
                    value: "energy_resources",
                    children: p("Tài nguyên & năng lượng")
                  }), O.jsx("option", {
                    value: "manufacturing",
                    children: p("Sản xuất công nghiệp")
                  }), O.jsx("option", {
                    value: "consumer_retail",
                    children: p("Tiêu dùng & bán lẻ")
                  }), O.jsx("option", {
                    value: "construction_infrastructure",
                    children: p("Xây dựng & hạ tầng")
                  }), O.jsx("option", {
                    value: "other",
                    children: p("Khác / chưa phân loại")
                  })]
                })]
              }), O.jsx("input", {
                className: "table-search",
                "aria-label": p("Tìm cổ phiếu"),
                placeholder: p("Tìm mã hoặc tên công ty"),
                value: ft,
                onChange: d => Ze(() => {
                  En(1), ri(d.target.value);
                })
              }), O.jsxs("span", {
                className: "muted-text",
                children: [p("Hiển thị"), " ", al.length, "/", vu, " ", p("mã")]
              }), O.jsxs("label", {
                className: "page-size-control",
                children: [p("Số mã /trang"), O.jsxs("select", {
                  value: Ht,
                  onChange: d => ef(d.target.value),
                  children: [O.jsx("option", {
                    value: "25",
                    children: "25"
                  }), O.jsx("option", {
                    value: "50",
                    children: "50"
                  }), O.jsx("option", {
                    value: "100",
                    children: "100"
                  }), O.jsx("option", {
                    value: "200",
                    children: "200"
                  })]
                })]
              })]
            })]
          }), O.jsxs("p", {
            className: "overview-data-status",
            role: "status",
            children: [cu && O.jsx("span", {
              className: "realtime-loading",
              children: "Đang cập nhật intraday..."
            }), ol.error && O.jsx("span", {
              children: ol.error
            }), (ui == null ? void 0 : ui.status) === "circuit_open" && O.jsx("span", {
              className: "data-time",
              children: "Provider circuit open; giữ dữ liệu gần nhất và sẽ tự thử lại."
            }), (ui == null ? void 0 : ui.status) === "degraded" && O.jsx("span", {
              className: "data-time",
              children: "Provider degraded; dữ liệu sẽ tiếp tục tự cập nhật."
            }), O.jsx("span", {
              className: yi ? "status-dot is-live" : "status-dot"
            }), p(yi ? "Có dữ liệu intraday" : "Đang dùng dữ liệu EOD"), "  ", p("Quote có thể trễ; số liệu phụ thuộc provider.")]
          }), O.jsxs("div", {
            className: "overview-source-summary",
            role: "note",
            children: [O.jsx("strong", {
              children: "Nguồn dữ liệu"
            }), gu && O.jsx($i, {
              url: gu,
              children: "Giấy phép dữ liệu"
            }), O.jsxs("span", {
              children: [yi, "/", si.length, " mã có Intraday từ VCI; mã còn lại giữ EOD gần nhất."]
            }), O.jsx("span", {
              className: "overview-source-help",
              title: "Khối lượng Intraday là khối lượng giao dịch ghi nhận; EOD là dữ liệu phiên gần nhất.",
              "aria-label": "Giải thích nguồn dữ liệu",
              children: "i"
            })]
          }), O.jsx("div", {
            className: "table-wrap",
            children: O.jsxs("table", {
              children: [O.jsx("thead", {
                children: O.jsxs("tr", {
                  children: [[["symbol", "Mã", "Kí hiệu giao dịch"], ["name", "Tên", "Tên doanh nghiệp"], ["price", "Giá", "Giá gần nhất"], ["change", "Biến động", "Mức tăng giảm"], ["volume", "Khối lượng", "Khối lượng giao dịch"]].map(([d, S, $]) => O.jsx("th", {
                    children: O.jsxs("button", {
                      className: "table-sort-btn",
                      type: "button",
                      onClick: () => Jh(d),
                      title: p($),
                      children: [p(S), be.key === d ? (be.direction, " ") : ""]
                    })
                  }, d)), O.jsx("th", {
                    children: p("Nguồn dữ liệu")
                  }), O.jsx("th", {
                    children: p("Nhận định")
                  }), O.jsx("th", {
                    children: "Thao tác"
                  })]
                })
              }), O.jsx("tbody", {
                children: Nt.error ? null : al.length ? al.map(d => {
                  var S, $;
                  return O.jsxs("tr", {
                    className: Vn.has(d.symbol) ? "pinned-stock" : void 0,
                    onClick: () => {
                      ht(d.id), Xe("detail");
                    },
                    children: [O.jsxs("td", {
                      className: "symbol",
                      children: [d.symbol, O.jsxs("span", {
                        className: "pin-labels",
                        children: [gt.has(d.symbol) && O.jsx("small", {
                          className: "pin-badge",
                          children: "Danh mục"
                        }), yt.has(d.symbol) && O.jsx("small", {
                          className: "pin-badge",
                          children: "Watchlist"
                        }), d.listingStatus === "delisted" ? O.jsx("small", {
                          className: "listing-badge delisted",
                          title: d.listingCheckedAt || "Historical symbol",
                          children: " Đã hủy niêm yết"
                        }) : d.listingStatus === "listed" && d.exchange ? O.jsx("small", {
                          className: "listing-badge listed",
                          title: d.listingCheckedAt || d.exchange,
                          children: d.exchange
                        }) : null]
                      })]
                    }), O.jsx("td", {
                      children: O.jsx($i, {
                        url: d.url,
                        children: d.name
                      })
                    }), O.jsx("td", {
                      children: oe(d.price)
                    }), O.jsx("td", {
                      className: d.change >= 0 ? "positive" : "negative",
                      children: Hh(d.change)
                    }), O.jsxs("td", {
                      children: [Et(d.volume), O.jsx("small", {
                        className: "volume-context",
                        title: ((S = d.liveQuote) == null ? void 0 : S.interval) === "intraday" ? "Khối lượng giao dịch Intraday từ quote mới nhất." : "Khối lượng EOD của phiên gần nhất.",
                        "aria-label": (($ = d.liveQuote) == null ? void 0 : $.interval) === "intraday" ? "Khối lượng Intraday" : "Khối lượng EOD",
                        children: "i"
                      })]
                    }), O.jsx("td", {
                      className: "source-cell",
                      children: "-"
                    }), O.jsx("td", {
                      children: (() => {
                        const A = tv(d);
                        return O.jsxs("div", {
                          className: "overview-assessment",
                          children: [O.jsx("span", {
                            className: "rating-badge",
                            children: A.label
                          }), O.jsx("small", {
                            children: A.detail
                          }), O.jsx("button", {
                            type: "button",
                            className: "overview-analysis-btn",
                            onClick: Z => {
                              Z.stopPropagation(), ht(d.id);
                              try {
                                sessionStorage.setItem("analysis-requested:" + d.id, "1");
                              } catch {}
                              Xe("detail");
                            },
                            children: "Phân tích chuyên sâu"
                          })]
                        });
                      })()
                    }), O.jsx("td", {
                      children: O.jsx("button", {
                        type: "button",
                        className: "icon-action-btn add-portfolio-btn",
                        title: `Thêm ${d.symbol} vào danh mục`,
                        "aria-label": `Thêm ${d.symbol} vào danh mục`,
                        onClick: A => {
                          A.stopPropagation(), Ao(d);
                        },
                        children: [O.jsx("span", {
                          className: "add-portfolio-icon",
                          "aria-hidden": "true",
                          children: "+"
                        }), O.jsx("span", {
                          children: "Thêm"
                        })]
                      })
                    })]
                  }, d.id);
                }) : O.jsx("tr", {
                  children: O.jsx("td", {
                    colSpan: "8",
                    children: p("Chưa có cổ phiếu trong dữ liệu")
                  })
                })
              })]
            })
          }), O.jsxs("div", {
            className: "table-pagination",
            children: [O.jsx("button", {
              className: "ghost-btn small-btn",
              type: "button",
              disabled: xn <= 1,
              onClick: () => fu(xn - 1),
              children: p("Trước")
            }), O.jsxs("span", {
              className: "muted-text",
              children: [p("Trang"), " ", gi.page, "/", gi.totalPages]
            }), O.jsx("button", {
              className: "ghost-btn small-btn",
              type: "button",
              disabled: xn >= gi.totalPages,
              onClick: () => fu(xn + 1),
              children: p("Sau")
            })]
          }), Nt.error && O.jsxs("div", {
            className: "error-banner",
            role: "alert",
            children: [O.jsxs("p", {
              children: [p("Không thể tải danh sách cổ phiếu"), ". ", Nt.error]
            }), O.jsx("button", {
              className: "ghost-btn",
              onClick: Nt.retry,
              children: p("Thử lại danh sách")
            })]
          })]
        }), O.jsxs("section", {
          className: "overview-next panel",
          children: [O.jsxs("div", {
            children: [O.jsx("h3", {
              children: p("Tiếp tục từ đây")
            }), O.jsx("p", {
              children: p("Mở một mã để xem biểu đồ và phân tích; quản lý vị thế trong danh mục cá nhân.")
            })]
          }), O.jsxs("div", {
            children: [O.jsx("button", {
              className: "ghost-btn",
              type: "button",
              onClick: () => {
                me && (ht(me.id), Xe("detail"));
              },
              disabled: !me,
              children: p("Chi tiết mã đang chọn")
            }), O.jsx("button", {
              className: "ghost-btn",
              type: "button",
              onClick: () => Xe("recommendations"),
              children: p("Xem nhận định đề xuất")
            })]
          })]
        })]
      }), re === "recommendations" && O.jsx(RecommendationWorkbench, {
        initialData: nf,
        history: uu.data || [],
        token: ue.token,
        onAddToPortfolio: Ao
      }), re === "portfolio" && O.jsxs("section", {
        className: "personal-page",
        children: [Ir && O.jsx("p", {
          role: "status",
          children: "Đang tải danh mục..."
        }), bt && O.jsxs("div", {
          role: "alert",
          children: [bt, O.jsx("button", {
            onClick: () => s(d => d + 1),
            children: "Thử lại danh mục"
          })]
        }), O.jsxs("div", {
          className: "page-heading",
          children: [O.jsx("h2", {
            children: p("Danh mục và theo dõi")
          }), O.jsx("p", {
            children: p("Chỉ theo dõi giao dịch bên ngoài, không thực hiện mua bán trong ứng dụng.")
          })]
        }), O.jsxs("div", {
          className: "personal-grid",
          children: [O.jsxs("article", {
            className: "panel portfolio-panel",
            children: [O.jsx("h3", {
              children: p("Ghi nhận giao dịch")
            }), O.jsxs("form", {
              className: "transaction-form",
              onSubmit: Zh,
              children: [O.jsxs("label", {
                children: [p("Mã cổ phiếu"), O.jsx("input", {
                  "aria-label": p("Mã giao dịch"),
                  value: Ie.symbol,
                  onChange: d => {
                    var S;
                    const $ = d.target.value.toUpperCase();
                    kt({
                      ...Ie,
                      symbol: $,
                      recommendation_context: ((S = Ie.recommendation_context) == null ? void 0 : S.symbol) === $ ? Ie.recommendation_context : null
                    });
                  },
                  required: true
                })]
              }), O.jsxs("label", {
                children: [p("Loại giao dịch"), O.jsxs("select", {
                  value: Ie.side,
                  onChange: d => kt({
                    ...Ie,
                    side: d.target.value,
                    recommendation_context: d.target.value === "BUY" ? Ie.recommendation_context : null
                  }),
                  children: [O.jsx("option", {
                    value: "BUY",
                    children: p("Mua")
                  }), O.jsx("option", {
                    value: "SELL",
                    children: p("Bán")
                  })]
                })]
              }), O.jsxs("label", {
                children: [p("Số lượng"), O.jsx("input", {
                  ref: xt,
                  type: "number",
                  min: "1",
                  value: Ie.quantity,
                  onChange: d => kt({
                    ...Ie,
                    quantity: d.target.value
                  }),
                  required: true
                })]
              }), O.jsxs("label", {
                children: [p("Giá giao dịch (VND/cổ phiếu)"), O.jsx("input", {
                  type: "number",
                  value: Ie.price,
                  onChange: d => kt({
                    ...Ie,
                    price: d.target.value
                  }),
                  required: true
                })]
              }), O.jsx("button", {
                className: "primary-btn",
                type: "submit",
                disabled: transactionSubmitting,
                "aria-busy": transactionSubmitting,
                children: p(transactionSubmitting ? "Đang lưu…" : "Lưu giao dịch")
              })]
            }), dt && O.jsx("p", {
              role: "status",
              children: dt
            }), O.jsx(PortfolioPositions, {
              positions: mi,
              closedPositions: (pe == null ? void 0 : pe.closed_positions) || [],
              loading: Ir,
              error: bt,
              onOpenDetail: d => {
                ht(d), Xe("detail");
              }
            }), O.jsx(Jm, {
              entries: lf
            })]
          }), O.jsx(PortfolioAllocation, {
            allocations: Wt,
            positions: mi,
            quoteCount: Oo.filter(symbol => di[symbol]).length,
            positionCount: Oo.length,
            quoteError: Qh,
            providerStatus: hi == null ? void 0 : hi.status
          }), O.jsx(PortfolioLedger, {
            entries: (pe == null ? void 0 : pe.transactions) || [],
            onImport: importPortfolioTransactions,
            onUpdate: updatePortfolioTransaction,
            onDelete: deletePortfolioTransaction
          }), false && O.jsxs("article", {
            className: "panel legacy-allocation-panel",
            children: [O.jsxs("div", {
              className: "allocation-panel-heading",
              children: [O.jsxs("div", {
                children: [O.jsx("h3", {
                  children: p("Phân bổ danh mục")
                }), O.jsx("p", {
                  className: "muted-text",
                  children: p("Tỷ trọng theo giá trị thị trường hiện tại.")
                })]
              }), O.jsxs("span", {
                className: "chip neutral",
                children: [Wt.length, " mã"]
              })]
            }), Wt.length ? O.jsxs("div", {
              className: "allocation-visual",
              children: [O.jsx("div", {
                className: "allocation-donut",
                role: "img",
                "aria-label": p("Biểu đồ phân bổ danh mục"),
                style: {
                  background: pu ? "conic-gradient(" + pu + ")" : "var(--border)"
                },
                children: O.jsxs("div", {
                  children: [O.jsx("small", {
                    className: "allocation-total-label",
                    children: p("Tổng giá trị")
                  }), O.jsx("strong", {
                    className: "allocation-total-value",
                    children: oe(vi)
                  }), O.jsx("small", {
                    className: "allocation-day-change",
                    children: (() => {
                      const d = mi.reduce(($, A) => $ + Number(A.quantity || 0) * Number(A.previous_market_price || 0), 0),
                        S = d > 0 ? vi - d : null;
                      return S == null ? "Chưa có dữ liệu hôm qua" : O.jsxs(i.Fragment, {
                        children: ["So với hôm qua: ", O.jsx("span", {
                          className: S > 0 ? "positive" : S < 0 ? "negative" : "neutral",
                          children: `${oe(S)} · ${S >= 0 ? "+" : ""}${d > 0 ? (S / d * 100).toFixed(2) : "0"}%`
                        })]
                      });
                    })()
                  }), O.jsx("svg", {
                    className: "allocation-donut-svg",
                    viewBox: "0 0 100 100",
                    role: "presentation",
                    children: Wt.map((d, S) => {
                      const $ = Wt.slice(0, S).reduce((Tn, uf) => Tn + uf.weight, 0) * 3.6 - 90,
                        A = $ + d.weight * 3.6,
                        Z = 58,
                        de = 40,
                        Gt = Tn => 50 + Z * Math.cos(Tn * Math.PI / 180),
                        St = Tn => 50 + Z * Math.sin(Tn * Math.PI / 180),
                        sl = Tn => 50 + de * Math.cos(Tn * Math.PI / 180),
                        ul = Tn => 50 + de * Math.sin(Tn * Math.PI / 180),
                        xu = d.weight > 50 ? 1 : 0;
                      return O.jsxs("path", {
                        d: `M${Gt($)} ${St($)} A${Z} ${Z} 0 ${xu} 1 ${Gt(A)} ${St(A)} L${sl(A)} ${ul(A)} A${de} ${de} 0 ${xu} 0 ${sl($)} ${ul($)} Z`,
                        fill: "transparent",
                        children: [O.jsx("title", {
                          children: `${d.symbol}: ${d.weight.toFixed(1)}% · ${oe(d.market_value)}`
                        })]
                      }, d.stock_id);
                    })
                  })]
                })
              }), O.jsx("ol", {
                className: "allocation-list",
                children: Wt.map((d, S) => O.jsxs("li", {
                  title: `${d.symbol}: ${d.weight.toFixed(1)}% · ${oe(d.market_value)}`,
                  children: [O.jsxs("div", {
                    className: "allocation-item-heading",
                    children: [O.jsx("i", {
                      style: {
                        backgroundColor: qt[S % qt.length]
                      }
                    }), O.jsxs("div", {
                      children: [O.jsx("strong", {
                        children: d.symbol
                      }), O.jsx("small", {
                        children: oe(d.market_value)
                      })]
                    }), O.jsxs("b", {
                      children: [d.weight.toFixed(1), "%"]
                    })]
                  }), O.jsx("div", {
                    className: "allocation-track",
                    children: O.jsx("span", {
                      style: {
                        width: d.weight + "%",
                        backgroundColor: qt[S % qt.length]
                      }
                    })
                  })]
                }, d.stock_id))
              })]
            }) : O.jsx("p", {
              className: "muted-text",
              children: p("Chưa có dữ liệu phân bổ.")
            }), O.jsxs("p", {
              className: "allocation-footnote",
              children: [Object.keys(di).length, "/", Oo.length, " ", p("mã có quote intraday"), " · ", Qh || Object.keys(di).length < Oo.length ? p("Mã thiếu quote dùng giá EOD; tỷ trọng kết hợp dữ liệu hiện có.") : p("Tỷ trọng dựa trên quote intraday mới nhất."), (hi == null ? void 0 : hi.status) === "circuit_open" ? " Provider tạm ngắt, sẽ tự thử lại." : (hi == null ? void 0 : hi.status) === "degraded" ? " Provider đang chậm." : ""]
            })]
          }), O.jsxs("article", {
            className: "panel watchlist-panel",
            children: [O.jsx("h3", {
              children: "Watchlist"
            }), O.jsxs("form", {
              onSubmit: Xh,
              className: "auth-form",
              children: [O.jsx("input", {
                placeholder: p("Thêm mã, ví dụ FPT"),
                value: Jr,
                onChange: d => el(d.target.value.toUpperCase())
              }), O.jsx("button", {
                className: "primary-btn",
                type: "submit",
                children: p("Thêm mã")
              })]
            }), O.jsxs("ul", {
              className: "watchlist",
              children: [pt.map(d => O.jsxs("li", {
                className: "watchlist-detail-link",
                role: "link",
                tabIndex: 0,
                "aria-label": `Mở Chi tiết mã ${d.Stock.code}`,
                onClick: () => {
                  d.Stock.id && (ht(d.Stock.id), Xe("detail"));
                },
                onKeyDown: S => {
                  d.Stock.id && (S.key === "Enter" || S.key === " ") && (S.preventDefault(), ht(d.Stock.id), Xe("detail"));
                },
                children: [O.jsx("strong", {
                  children: d.Stock.code
                }), O.jsx("button", {
                  className: "ghost-btn small-btn",
                  type: "button",
                  onClick: S => {
                    S.stopPropagation(), rf(d.Stock.code);
                  },
                  children: p("Xóa")
                })]
              }, d.stock_id)), !pt.length && O.jsx("li", {
                className: "muted-text",
                children: p("Chưa có mã")
              })]
            })]
          })]
        })]
      }), re === "detail" && O.jsxs("section", {
        className: "detail-page",
        children: [O.jsx(DetailSymbolSearch, {
          value: nl,
          options: si,
          error: rl,
          onChange: tl,
          onSubmit: tf
        }), Ee.status === "loading" ? O.jsx("div", {
          className: "loading-shell",
          children: O.jsx("p", {
            children: p("Đang tải chi tiết cổ phiếu")
          })
        }) : Ee.error ? O.jsxs("div", {
          className: "error-banner",
          role: "alert",
          children: [O.jsxs("p", {
            children: [p("Không thể tải chi tiết cổ phiếu"), ". ", Ee.error]
          }), O.jsx("button", {
            className: "ghost-btn",
            onClick: Ee.retry,
            children: p("Thử lại chi tiết")
          })]
        }) : Ee.data && O.jsxs(i.Fragment, {
          children: [O.jsx(DetailSectionNav, {}), O.jsx("div", {
            id: "detail-overview",
            className: "detail-section-anchor",
            tabIndex: -1,
            children: O.jsx(DetailHero, {
              symbol: Ee.data.code,
              name: Ee.data.name,
              price: oe((Te == null ? void 0 : Te.price) ?? Ee.data.price),
              quote: Te ? {
                ...Te,
                fetchedAt: He(Te.fetched_at)
              } : null,
              eodFetchedAt: He(Ee.data.data_fetched_at),
              providerStatus: pi == null ? void 0 : pi.status,
              quoteError: qh,
              analysis: T,
              onRequestAnalysis: () => {
                du(true), hu(!!T.data);
                try {
                  sessionStorage.setItem(`analysis-requested:${me.id}`, "1");
                } catch {}
                window.__stockpilotRequestAnalysis?.(), T.retry();
              },
              onAddToPortfolio: () => Ao({
                symbol: Ee.data.code,
                price: (Te == null ? void 0 : Te.price) ?? Ee.data.price
              })
            })
          }), O.jsxs("div", {
            id: "detail-chart",
            className: "detail-content-grid",
            tabIndex: -1,
            children: [O.jsxs("article", {
              className: "panel detail-chart-panel",
              children: [O.jsxs("div", {
                className: "panel-header",
                children: [O.jsx("h3", {
                  children: p("Lịch sử giá")
                }), O.jsx("span", {
                  className: `chip ${Te ? "success" : "neutral"}`,
                  children: p(Te ? "Intraday + EOD" : "Dữ liệu EOD")
                }), O.jsxs("p", {
                  className: "chart-volume-note",
                  children: [O.jsxs("span", {
                    className: "volume-note rising",
                    children: ["↑ ", p("Khối lượng phiên tăng")]
                  }), O.jsxs("span", {
                    className: "volume-note falling",
                    children: ["↓ ", p("Khối lượng phiên giảm")]
                  })]
                })]
              }), O.jsx(DetailPriceVolumeChart, {
                history: ev(Ee.data.price_history || [], Te),
                marketSessions: Ee.data.market_sessions || [],
                formatDateKey: cr,
                formatTime: He,
                formatPrice: oe,
                formatVolume: Et,
                formatPercent: Hh,
                translate: p
              })]
            }), O.jsxs("article", {
              className: "panel summary-panel",
              children: [O.jsx("h3", {
                children: p("AI nhận định")
              }), O.jsxs("ul", {
                className: "summary-list",
                children: [O.jsxs("li", {
                  children: [O.jsx("span", {
                    children: p("Tín hiệu")
                  }), O.jsx("strong", {
                    children: ((Br = (br = T.data) == null ? void 0 : br.insight) == null ? void 0 : Br.label) || p("Chưa có nhận định")
                  })]
                }), O.jsxs("li", {
                  children: [O.jsx("span", {
                    children: p("RSI14")
                  }), O.jsx("strong", {
                    children: ((Hr = (Vr = T.data) == null ? void 0 : Vr.indicators) == null ? void 0 : Hr.rsi14) ?? Xn
                  })]
                }), O.jsxs("li", {
                  children: [O.jsx("span", {
                    children: p("Quan sát")
                  }), O.jsxs("strong", {
                    children: [((Qr = T.data) == null ? void 0 : Qr.observations) ?? 0, " ", p("phiên")]
                  })]
                })]
              })]
            })]
          }), O.jsxs("section", {
            id: "detail-analysis",
            className: "panel technical-panel",
            tabIndex: -1,
            children: [O.jsx(DetailAnalysisStatus, {
              analysis: T,
              translate: p
            }), T.data && O.jsxs("p", {
              children: [((Kr = T.data.insight) == null ? void 0 : Kr.label) || p("Chưa có nhận định"), " · ", p("Chất lượng"), ": ", ((Wr = T.data.quality) == null ? void 0 : Wr.score) ?? 0, "/100"]
            }), T.data && O.jsx("p", {
              className: "data-time",
              children: ["Cập nhật phân tích: ", He((t = T.data.insight) == null ? void 0 : t.generated_at)]
            }), ((r = T.data) == null ? void 0 : r.evaluation_factors) && O.jsx("div", {
              className: "evaluation-factors-grid",
              children: T.data.evaluation_factors.map(d => O.jsxs("div", {
                className: "evaluation-factor-card",
                children: [O.jsxs("div", {
                  children: [O.jsx("strong", {
                    children: d.label
                  }), O.jsx("span", {
                    className: `chip ${d.status === "verified" || d.status === "available" ? "success" : "neutral"}`,
                    children: d.score == null ? "Chưa có điểm" : `${d.score}/100`
                  })]
                }), O.jsx("p", {
                  children: d.detail
                })]
              }, d.key))
            }), ((l = T.data) == null ? void 0 : l.horizon_advice) && O.jsx("div", {
              className: "horizon-advice-grid",
              children: Object.values(T.data.horizon_advice).map(d => O.jsxs("article", {
                className: "horizon-advice-card",
                children: [O.jsx("strong", {
                  children: d.label
                }), O.jsx("p", {
                  children: d.advice
                })]
              }, d.label))
            }), O.jsx(DetailExpertGuidance, {
              guidance: T.data?.expert_guidance,
              observations: T.data?.observations,
              asOf: T.data?.as_of,
              qualityScore: T.data?.quality?.score,
              indicators: T.data?.indicators,
              translate: p,
              formatDate: He
            }), O.jsx(DetailRiskPlan, {
              riskPlan: T.data?.risk_plan,
              normalizeRisk: Gh,
              formatPrice: oe,
              translate: p,
              emptyValue: Xn
            }), O.jsx(DetailExternalFactors, {
              externalFactors: T.data?.external_factors,
              translate: p,
              formatDate: He
            })]
          })]
        })]
      }), re === "advisor" && O.jsx(AdvisorWorkspace, {
        token: ue.token,
        aiEnabled: (Xr = au.data) == null ? void 0 : Xr.enabled,
        selectedStock: me,
        analysis: T.data,
        positions: mi,
        marketStocks: al,
        quotes: an,
        providerLicenseUrl: gu
      })]
    })]
  });
}
var i = O;
var App_default = lv;
export { App_default as default };
