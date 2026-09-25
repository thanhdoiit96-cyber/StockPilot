"""One VCI price-board request for the entire visible stock universe."""
import contextlib
import io
import json
import time
from datetime import datetime, timezone


def price_board(request):
    from vnstock.explorer.vci.trading import Trading
    symbols = request.get('symbols') or []
    last_error = None
    frame = None
    # VCI occasionally resets a board connection. A short bounded retry is
    # cheaper and more reliable than returning a partial/empty universe and
    # forcing every page to wait for its next polling cycle.
    for attempt in range(3):
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                frame = Trading(show_log=False).price_board(symbols, flatten_columns=True)
            break
        except Exception as error:
            last_error = error
            if attempt < 2:
                time.sleep(0.35 * (attempt + 1))
    if frame is None:
        raise last_error
    # pandas JSON conversion maps missing numeric values to null, not NaN.
    records = json.loads(frame.to_json(orient='records'))
    rows = []
    for record in records:
        stamp = record.get('match_sending_time')
        try:
            observed = datetime.strptime(stamp, '%Y%m%d %H:%M:%S.%f').replace(tzinfo=timezone.utc).isoformat()
        except (TypeError, ValueError):
            observed = None
        rows.append({
            'symbol': record.get('listing_symbol'),
            'price': record.get('match_match_price'),
            'volume': record.get('match_accumulated_volume'),
            'reference_price': record.get('listing_ref_price'),
            'time': observed,
            'price_unit': 'VND_PER_SHARE',
            'volume_type': 'session',
            'timestamp_kind': 'source_update',
        })
    return {'rows': rows, 'errors': []}
