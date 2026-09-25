"""JSON bridge for the Vnstock listing endpoint.

Input: {"source": "VCI"}
Output: {"rows": [{"symbol", "name", "industry", "exchange"}], "errors": []}
"""
import contextlib
import io
import json
import sys

from vnstock import Listing


def main():
    request = json.loads(sys.stdin.read() or "{}")
    source = str(request.get("source") or "VCI").upper()
    try:
        sink = io.StringIO()
        with contextlib.redirect_stdout(sink):
            frame = Listing(source=source, show_log=False).symbols_by_exchange()
        rows = []
        for row in frame.to_dict(orient="records"):
            symbol = str(row.get("symbol") or row.get("ticker") or "").strip().upper()
            if not symbol:
                continue
            rows.append({
                "symbol": symbol,
                "name": str(row.get("organ_name") or row.get("organ_short_name") or symbol).strip(),
                "industry": row.get("icb_name") or row.get("industry") or None,
                "exchange": row.get("exchange") or None,
                "type": row.get("type") or 'STOCK',
            })
        json.dump({"rows": rows, "errors": []}, sys.stdout, ensure_ascii=False)
    except Exception as error:
        json.dump({"rows": [], "errors": [{"error": str(error), "source": source}]}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
