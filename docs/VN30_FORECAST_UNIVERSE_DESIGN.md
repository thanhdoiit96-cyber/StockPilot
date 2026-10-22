# VN30 forecast universe — F0 contract

## Decision

The current three-symbol LIVE preview is not a VN30 forecast. VN30 expansion starts as a research/shadow universe and does not replace the Overview payload until its evidence gates pass.

The chosen approach is a versioned, point-in-time membership snapshot. A static environment list or today's constituents must never be used to reinterpret an older forecast. This avoids survivorship bias and prevents presenting an arbitrary large-cap basket as VN30.

## User and product boundary

The user needs a breadth forecast whose scope is understandable: which constituents were included, how complete the EOD input was, and why a run is unavailable. The output remains a three-class breadth probability for research/shadow monitoring; it is not a security selection, return forecast, trading instruction or validated market-performance claim.

## Required data contract

Each membership snapshot must contain:

- `index_code=VN30`, effective-from/to dates, source identifier and source publication time;
- exactly the provider-issued constituent identifiers, with no inferred substitutes;
- an immutable membership hash and ingest timestamp;
- EOD provenance for every member: provider, interval, price basis, observed/fetched time and availability evidence.

Each forecast issuance must reference one sealed membership snapshot, never a mutable current list. It needs at least 30 valid constituents, 60 consecutive eligible EOD sessions per member and current-session close coverage of at least 95%. A missing member, invalid price basis, unknown availability time, calendar ambiguity or failed hash returns `unavailable`; it does not reduce the denominator silently.

## Flow and ownership

1. A dedicated membership ingest records a new source-backed VN30 snapshot without changing past rows.
2. Readiness evaluates membership integrity, history, current EOD coverage and provider/license provenance.
3. Only a ready snapshot can issue a shadow forecast and immutable input/evidence hash.
4. The evaluator attaches future outcomes after 1/5 distinct provider sessions and compares against sealed baselines.
5. The Overview can display VN30 only after separate validation, calibration and audit gates. Until then the existing three-symbol preview stays clearly labelled.

## UX and performance

Readiness must show `unavailable`, `partial` or `ready`, with included/missing counts and source/as-of metadata. It must not show a probability for partial coverage. Desktop and mobile use the same concise status rather than exposing constituent lists by default. The initial implementation must read stored EOD/membership data only; it must not trigger thirty provider requests from page navigation. Request, payload and bridge latency are measured before an eventual UI switch.

## Current blocker and acceptance

No licensed, point-in-time VN30 constituent source is configured in this repository. Therefore no membership table, fixture list or forecast switch is created in F0. The next implementation phase begins only when source rights, source schema and retention policy are supplied.

Acceptance for that phase: immutable membership rows, membership-hash verification, 30-member and 95% EOD gates, unavailable/partial UI states, shadow issuance/evaluation and an independent out-of-sample report. A successful build or synthetic fixture is not proof of VN30 market accuracy.
