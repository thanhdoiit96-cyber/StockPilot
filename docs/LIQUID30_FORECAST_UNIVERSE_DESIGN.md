# Liquid30 forecast universe — F0 contract

> Deferred: `OfficialVN30` is the selected fixed universe. This document and the database-only readiness implementation are retained as research history; Liquid30 must not drive Overview UI, forecast issuance or the active roadmap. See [OfficialVN30 contract](VN30_FORECAST_UNIVERSE_DESIGN.md).

## Decision

The market-breadth research universe is the 30 listed symbols with the highest verified `traded_value` in one EOD session. It is not VN30, an index forecast or a security-selection list. This replaces neither the current three-symbol LIVE prototype nor its validation gate until separate shadow evidence passes.

## Selection and integrity

1. Read one stored EOD session for all listed symbols from the same provider, interval and price basis.
2. Require market coverage of at least 95% of listed symbols with positive close and a verified positive `traded_value`.
3. Rank descending by `traded_value`, then symbol only as deterministic tie-breaker; select exactly 30.
4. Persist the session, provider, coverage denominator/numerator, ordered constituents, individual turnover values and canonical input hash with every shadow issuance.

`close × volume` is not a fallback until `price_unit` is proved comparable for every row. A missing or non-comparable turnover value causes the whole run to be unavailable, rather than silently changing the ranking universe.

## User experience

At the 95% release gate, the UI may say “Top 30 thanh khoản theo EOD” and must show session, provider, coverage and an explicit research/shadow state. Below that gate it shows unavailable with the coverage reason, except for the explicitly labelled, temporary research exception below. It must never backfill from an older session or retain yesterday's members.

### Temporary observed-subset research exception

The product owner approved one bounded exception on 2026-10-22: with at least 65% same-session verified EOD coverage, the backend may form an `observed_eod_subset` ranking for internal research. Its response is explicitly `partial_observed_universe` and `research_only: true`, retains the numerator, denominator, threshold and session, and is built only from stored database rows. It is not a whole-market Liquid30, cannot issue a probability, cannot be evaluated/calibrated as a whole-market forecast and must not silently become the 95% release path. Under 65%, or with fewer than 30 eligible rows, it remains unavailable.

## Evaluation and performance

The selected basket is frozen per issuance and evaluated only after the declared 1/5 distinct EOD sessions. It uses the same immutable outcome and baseline requirements as other forecast research. Ranking is a database read; page navigation must not trigger provider calls for 30 symbols. Request/payload/render measurements are required before exposing a Liquid30 view.

## Current state

The latest recorded EOD coverage is 357/549 (65.0%), below the 95% release gate. The bounded observed-subset readiness endpoint may expose a research basket at this level, but whole-market issuance, shadow evaluation and a live forecast/UI switch remain blocked. This is not a forecast failure or a reason to lower the release gate.
