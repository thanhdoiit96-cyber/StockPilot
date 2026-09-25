"""Small JSON-lines bridge for vnstock.api.quote.Quote.

Input: one JSON object on stdin: {symbols, from, to, source}
Output: one JSON object on stdout: {rows, errors}
"""
import contextlib
import io
import json
import os
import sys

os.environ.setdefault("VNSTOCK_TELEMETRY", "off")

from vnstock.api.quote import Quote  # noqa: E402


def main():
    request = json.loads(sys.stdin.read() or "{}")
    source = str(request.get("source") or "VCI").upper()
    rows = []
    errors = []
    for symbol in request.get("symbols") or []:
        symbol = str(symbol).strip().upper()
        if not symbol:
            continue
        try:
            # vnstock may print optional telemetry/key notices; keep stdout machine-readable.
            sink = io.StringIO()
            with contextlib.redirect_stdout(sink):
                frame = Quote(source=source, symbol=symbol, show_log=False).history(
                    start=request.get("from"), end=request.get("to"), interval="1D"
                )
            for row in frame.to_dict(orient="records"):
                rows.append({
                    "symbol": symbol,
                    # Vnstock returns a naive local session timestamp. Keep the
                    # trading date only; the Node contract canonicalizes it to UTC.
                    "date": str(row.get("time"))[:10],
                    "open": row.get("open"), "high": row.get("high"),
                    "low": row.get("low"), "close": row.get("close"),
                    "volume": row.get("volume"),
                })
        except Exception as error:  # a missing symbol must not abort the whole probe
            errors.append({"symbol": symbol, "error": str(error)})
    json.dump({"rows": rows, "errors": errors}, sys.stdout, ensure_ascii=False, default=str)


if __name__ == "__main__":
    main()
