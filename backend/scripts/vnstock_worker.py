"""HTTP worker for Vnstock when the Node runtime cannot spawn Python children."""
import contextlib
import io
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

os.environ.setdefault("VNSTOCK_TELEMETRY", "off")
for _proxy_key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
    if str(os.environ.get(_proxy_key, "")).lower() in {"http://127.0.0.1:9", "http://localhost:9"}:
        os.environ.pop(_proxy_key, None)
from vnstock import Finance, Listing, Market, Reference
from vnstock.api.quote import Quote
from vnstock_price_board import price_board as fetch_price_board


def worker_concurrency():
    try:
        return min(4, max(1, int(os.environ.get("VNSTOCK_WORKER_MAX_CONCURRENCY", "1"))))
    except ValueError:
        return 1


PROVIDER_GATE = threading.BoundedSemaphore(worker_concurrency())
METRICS_LOCK = threading.Lock()
METRICS = {"requests": 0, "errors": 0, "partial": 0, "latency_ms": 0, "by_path": {}}


def record_metric(path, duration_ms, error=False, partial=False):
    with METRICS_LOCK:
        METRICS["requests"] += 1
        METRICS["errors"] += int(error)
        METRICS["partial"] += int(partial)
        METRICS["latency_ms"] += max(0, int(duration_ms))
        METRICS["by_path"][path] = METRICS["by_path"].get(path, 0) + 1


def metrics_snapshot():
    with METRICS_LOCK:
        result = dict(METRICS)
        result["by_path"] = dict(METRICS["by_path"])
        result["average_latency_ms"] = round(result["latency_ms"] / result["requests"]) if result["requests"] else 0
        return result


def price_board(request):
    with PROVIDER_GATE:
        return fetch_price_board(request)


def listing(request):
    source = str(request.get("source") or "VCI").upper()
    with PROVIDER_GATE:
        with contextlib.redirect_stdout(io.StringIO()):
            frame = Listing(source=source, show_log=False).symbols_by_exchange()
    rows = []
    for row in frame.to_dict(orient="records"):
        symbol = str(row.get("symbol") or row.get("ticker") or "").strip().upper()
        if symbol:
            rows.append({"symbol": symbol, "name": str(row.get("organ_name") or row.get("organ_short_name") or symbol).strip(), "industry": row.get("icb_name") or row.get("industry"), "exchange": row.get("exchange"), "type": row.get("type") or "STOCK"})
    return {"rows": rows, "errors": []}


def eod(request):
    source = str(request.get("source") or "VCI").upper()
    rows, errors = [], []
    for symbol in request.get("symbols") or []:
        symbol = str(symbol).strip().upper()
        if not symbol:
            continue
        try:
            with PROVIDER_GATE:
                with contextlib.redirect_stdout(io.StringIO()):
                    frame = Quote(source=source, symbol=symbol, show_log=False).history(start=request.get("from"), end=request.get("to"), interval="1D")
            for row in frame.to_dict(orient="records"):
                rows.append({"symbol": symbol, "date": str(row.get("time"))[:10], "open": row.get("open"), "high": row.get("high"), "low": row.get("low"), "close": row.get("close"), "volume": row.get("volume")})
        except Exception as error:
            errors.append({"symbol": symbol, "error": str(error)})
    return {"rows": rows, "errors": errors}


def first_value(row, *keys):
    for key in keys:
        value = row.get(key)
        if value is not None:
            return value
    return None


def foreign_flow(request):
    rows, errors = [], []
    for symbol in request.get("symbols") or []:
        symbol = str(symbol).strip().upper()
        if not symbol:
            continue
        try:
            with PROVIDER_GATE:
                with contextlib.redirect_stdout(io.StringIO()):
                    equity = Market().equity(symbol)
                    method = getattr(equity, "foreign_flow", None)
                    if not callable(method):
                        raise PermissionError("foreign_flow capability is unavailable; verify sponsor entitlement and vnstock package setup")
                    frame = method(start=request.get("from"), end=request.get("to"))
            for row in frame.to_dict(orient="records"):
                rows.append({
                    "symbol": symbol,
                    "trading_date": first_value(row, "trading_date", "time", "date"),
                    "buy_volume": first_value(row, "buy_volume", "foreign_buy_volume", "fr_buy_volume"),
                    "sell_volume": first_value(row, "sell_volume", "foreign_sell_volume", "fr_sell_volume"),
                    "buy_value": first_value(row, "buy_value", "foreign_buy_value", "fr_buy_value_matched"),
                    "sell_value": first_value(row, "sell_value", "foreign_sell_value", "fr_sell_value_matched"),
                })
        except Exception as error:
            errors.append({"symbol": symbol, "error": str(error)})
    return {"rows": rows, "errors": errors}


def company_profile(request):
    symbol = str(request.get("symbol") or "").strip().upper()
    source = str(request.get("source") or "vci").strip().lower()
    if not symbol:
        return {"profile": None, "errors": [{"error": "symbol is required"}]}
    try:
        with PROVIDER_GATE:
            with contextlib.redirect_stdout(io.StringIO()):
                frame = Reference().company(symbol).info(source=source)
        records = frame.to_dict(orient="records")
        return {"profile": records[0] if records else None, "provider": str(frame.attrs.get("source") or source).lower(), "route": str(frame.attrs.get("route") or "company.info"), "errors": [] if records else [{"error": "provider returned no profile"}]}
    except Exception as error:
        return {"profile": None, "provider": source, "route": "company.info", "errors": [{"error": str(error)}]}


def company_people(request):
    symbol = str(request.get("symbol") or "").strip().upper()
    source = str(request.get("source") or "kbs").strip().lower()
    if not symbol:
        return {"shareholders": [], "officers": [], "errors": [{"error": "symbol is required"}]}
    result = {"shareholders": [], "officers": [], "provider": source, "route": "company.shareholders+officers", "errors": []}
    company = Reference().company(symbol)
    for scope in ("shareholders", "officers"):
        try:
            with PROVIDER_GATE:
                with contextlib.redirect_stdout(io.StringIO()):
                    frame = getattr(company, scope)(source=source)
            result[scope] = frame.to_dict(orient="records")
        except Exception as error:
            result["errors"].append({"scope": scope, "error": str(error)})
    return result


def company_capital(request):
    symbol = str(request.get("symbol") or "").strip().upper()
    source = str(request.get("source") or "kbs").strip().lower()
    if not symbol:
        return {"capital_history": [], "events": [], "errors": [{"error": "symbol is required"}]}
    result = {"capital_history": [], "events": [], "provider": source, "route": "company.capital_history+events", "errors": []}
    company = Reference().company(symbol)
    for scope in ("capital_history", "events"):
        try:
            with PROVIDER_GATE:
                with contextlib.redirect_stdout(io.StringIO()):
                    frame = getattr(company, scope)(source=source)
            result[scope] = frame.to_dict(orient="records")
        except Exception as error:
            result["errors"].append({"scope": scope, "error": str(error)})
    return result


def frame_records(frame, limit=8):
    frame = frame.copy()
    frame.columns = [" | ".join(str(part) for part in column if str(part) not in ("", "None")) if isinstance(column, tuple) else str(column) for column in frame.columns]
    return frame.head(limit).to_dict(orient="records")


def company_financials(request):
    symbol = str(request.get("symbol") or "").strip().upper()
    source = str(request.get("source") or "VCI").strip().upper()
    if not symbol:
        return {"annual": [], "quarterly": [], "errors": [{"error": "symbol is required"}]}
    result = {"annual": [], "quarterly": [], "provider": source.lower(), "route": "finance.income_statement", "errors": []}
    for period, target in (("year", "annual"), ("quarter", "quarterly")):
        try:
            with PROVIDER_GATE:
                with contextlib.redirect_stdout(io.StringIO()):
                    finance = Finance(source=source, symbol=symbol, period=period, get_all=True, show_log=False)
                    frame = finance.income_statement(period=period, lang="vi", dropna=True)
            result[target] = frame_records(frame, 8)
        except Exception as error:
            result["errors"].append({"scope": target, "error": str(error)})
    return result


def company_news(request):
    symbol = str(request.get("symbol") or "").strip().upper()
    source = str(request.get("source") or "kbs").strip().lower()
    if not symbol:
        return {"news": [], "errors": [{"error": "symbol is required"}]}
    try:
        with PROVIDER_GATE:
            with contextlib.redirect_stdout(io.StringIO()):
                frame = Reference().company(symbol).news(source=source)
        return {"news": frame_records(frame, 30), "provider": source, "route": "company.news", "errors": []}
    except Exception as error:
        return {"news": [], "provider": source, "route": "company.news", "errors": [{"scope": "news", "error": str(error)}]}


def intraday(request):
    """Return the latest intraday trades for one or more symbols."""
    source = str(request.get("source") or "VCI").upper()
    symbols = [str(symbol).strip().upper() for symbol in request.get("symbols") or [] if str(symbol).strip()]
    # The board endpoint is a single provider call for a visible universe.
    # Avoid 40 sequential Quote.intraday calls on Overview; keep the
    # per-symbol path for Detail/Portfolio where trade history is useful.
    if len(symbols) > 5:
        try:
            return price_board({**request, "symbols": symbols, "source": source})
        except Exception as error:
            return {"rows": [], "errors": [{"symbols": symbols, "error": str(error)}]}
    rows, errors = [], []
    for symbol in symbols:
        symbol = str(symbol).strip().upper()
        if not symbol:
            continue
        try:
            with PROVIDER_GATE:
                with contextlib.redirect_stdout(io.StringIO()):
                    frame = Quote(source=source, symbol=symbol, show_log=False).intraday(
                        page_size=int(request.get("page_size") or 100), page=1
                    )
            for row in frame.to_dict(orient="records"):
                rows.append({
                    "symbol": symbol,
                    "time": row.get("time") or row.get("timestamp") or row.get("date"),
                    "price": row.get("price") or row.get("last") or row.get("close"),
                    "volume": row.get("volume") or row.get("match_volume"),
                })
        except Exception as error:
            errors.append({"symbol": symbol, "error": str(error)})
    return {"rows": rows, "errors": errors}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        return

    def do_GET(self):
        if self.path == "/health":
            self.send_json(200, {"ok": True, "provider": "vnstock", "max_concurrency": worker_concurrency()})
        elif self.path == "/metrics":
            self.send_json(200, metrics_snapshot())
        else:
            self.send_error(404)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False, default=str).encode()
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            return

    def do_POST(self):
        started = time.monotonic()
        is_error = False
        is_partial = False
        try:
            length = int(self.headers.get("Content-Length", "0")); request = json.loads(self.rfile.read(length) or b"{}")
            payload = listing(request) if self.path == "/listing" else eod(request) if self.path == "/eod" else foreign_flow(request) if self.path == "/foreign-flow" else company_profile(request) if self.path == "/company-profile" else company_people(request) if self.path == "/company-people" else company_capital(request) if self.path == "/company-capital" else company_financials(request) if self.path == "/company-financials" else company_news(request) if self.path == "/company-news" else intraday(request) if self.path == "/intraday" else price_board(request) if self.path == "/price-board" else None
            if payload is None:
                self.send_error(404); return
            is_partial = bool(payload.get("errors"))
            self.send_json(200, payload)
        except Exception as error:
            is_error = True
            self.send_json(500, {"rows": [], "errors": [{"error": str(error)}]})
        finally:
            record_metric(self.path, (time.monotonic() - started) * 1000, is_error, is_partial)


if __name__ == "__main__":
    port = int(os.environ.get("VNSTOCK_WORKER_PORT", "8787"))
    ThreadingHTTPServer((os.environ.get("VNSTOCK_WORKER_HOST", "127.0.0.1"), port), Handler).serve_forever()
