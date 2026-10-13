"""Bounded JSON bridge for sponsor foreign-flow history."""
import contextlib
import io
import json
import os
import sys

os.environ.setdefault("VNSTOCK_TELEMETRY", "off")
from vnstock import Market  # noqa: E402


def first_value(row, *keys):
    for key in keys:
        value = row.get(key)
        if value is not None:
            return value
    return None


def main():
    request = json.loads(sys.stdin.read() or "{}")
    rows, errors = [], []
    for raw_symbol in request.get("symbols") or []:
        symbol = str(raw_symbol).strip().upper()
        if not symbol:
            continue
        try:
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
    json.dump({"rows": rows, "errors": errors}, sys.stdout, ensure_ascii=False, default=str)


if __name__ == "__main__":
    main()
