"""JSON bridge for Vnstock intraday quotes.

Input: {symbols, source, page_size}; output: {rows, errors}.
"""
import contextlib
import io
import json
import os
import sys

os.environ.setdefault("VNSTOCK_TELEMETRY", "off")
# Some managed shells export a dead localhost proxy. It makes every VCI
# request fail before vnstock can reach the provider; honor real proxies but
# discard this known placeholder.
for _proxy_key in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
    if str(os.environ.get(_proxy_key, "")).lower() in {"http://127.0.0.1:9", "http://localhost:9"}:
        os.environ.pop(_proxy_key, None)
from vnstock.api.quote import Quote  # noqa: E402


def main():
    request = json.loads(sys.stdin.read() or "{}")
    if request.get('mode') == 'price-board':
        from vnstock_price_board import price_board
        json.dump(price_board(request), sys.stdout, ensure_ascii=False)
        return
    source = str(request.get("source") or "VCI").upper()
    rows, errors = [], []
    for symbol in request.get("symbols") or []:
        symbol = str(symbol).strip().upper()
        if not symbol:
            continue
        try:
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
    json.dump({"rows": rows, "errors": errors}, sys.stdout, ensure_ascii=False, default=str)


if __name__ == "__main__":
    main()
