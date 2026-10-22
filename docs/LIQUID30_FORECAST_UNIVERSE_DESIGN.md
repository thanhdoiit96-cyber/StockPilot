# Liquid30 forecast universe — F0 contract

## Decision

The market-breadth research universe is the 30 listed symbols with the highest verified `traded_value` in one EOD session. It is not VN30, an index forecast or a security-selection list. This replaces neither the current three-symbol LIVE prototype nor its validation gate until separate shadow evidence passes.

## Selection and integrity

1. Read one stored EOD session for all listed symbols from the same provider, interval and price basis.
2. Require market coverage of at least 95% of listed symbols with positive close and a verified positive `traded_value`.
3. Rank descending by `traded_value`, then symbol only as deterministic tie-breaker; select exactly 30.
4. Persist the session, provider, coverage denominator/numerator, ordered constituents, individual turnover values and canonical input hash with every shadow issuance.

`close × volume` is not a fallback until `price_unit` is proved comparable for every row. A missing or non-comparable turnover value causes the whole run to be unavailable, rather than silently changing the ranking universe.

## User experience

The UI may say “Top 30 thanh khoản theo EOD” only when this contract is ready. It must show session, provider, coverage and an explicit research/shadow state. Below the 95% gate it shows unavailable with the coverage reason; it must not select Top 30 from the observed subset, backfill from an older session or retain yesterday's members.

## Evaluation and performance

The selected basket is frozen per issuance and evaluated only after the declared 1/5 distinct EOD sessions. It uses the same immutable outcome and baseline requirements as other forecast research. Ranking is a database read; page navigation must not trigger provider calls for 30 symbols. Request/payload/render measurements are required before exposing a Liquid30 view.

## Current state

The latest recorded EOD coverage is 357/549 (65.0%), below the 95% release gate. F0 is therefore defined but issuance, shadow snapshot and UI switch remain blocked. This is an honest unavailable state, not a forecast failure or a reason to lower the gate.
