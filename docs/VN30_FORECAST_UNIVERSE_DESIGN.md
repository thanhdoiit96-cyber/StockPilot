# OfficialVN30 forecast universe — selected contract

## Decision

`OfficialVN30` is the selected fixed research basket. It means the 30 constituents in an official, point-in-time VN30 membership publication—not a daily Top 30 by turnover and not a list inferred from price data. The current FPT/HPG/VHM LIVE preview remains a separate three-symbol prototype until this contract, its EOD gate and shadow evaluation are complete.

This choice prioritizes a stable, explainable universe and avoids ranking the incomplete current EOD market. The alternative `Liquid30` implementation is retained only as deferred research; it no longer drives the Overview UI or forecast roadmap.

## Product and data boundary

The intended user needs a breadth scope they can audit: membership source, effective dates, member count and EOD completeness. `OfficialVN30` stays research/shadow-only. It is not a security-selection list, return forecast, trading instruction or verified performance claim.

Membership must come from a source the deployment is authorized to retain and use. A deployment must record the source identifier, URL, publication time, source hash and applicable rights/retention decision before ingest. The repository currently has no configured production membership source or license evidence; no constituent list is hard-coded or scraped.

## Implemented storage and readiness boundary

Migration `045_create_index_membership_snapshots` creates immutable snapshot and constituent records. A usable row must have:

- `index_code=VN30`, `status=sealed`, effective-from/to dates, source identifier/URL, publication time and source hash;
- exactly 30 unique symbols, the declared member count of 30 and a membership SHA-256;
- separately retained constituent rows linked to that immutable snapshot.

`GET /api/stocks/vn30-readiness` is database-only and never calls a provider. With no sealed snapshot it returns `unavailable: membership_snapshot_unavailable`. With valid membership it checks the latest stored VNStock daily session and requires at least 29/30 (95%) members with a positive close. It can only return `ready_for_shadow`, never issue probabilities, select a replacement list or enable calibration.

## Required next flow

1. Approve and configure the membership source, rights and retention policy.
2. Implement a dedicated source ingest that validates, hashes and seals one new snapshot without modifying past snapshots.
3. Add 60-session per-member EOD history and price-basis/provenance checks before issuance.
4. Seal a shadow forecast with its membership/input hashes; attach outcomes after 1/5 distinct provider sessions.
5. Require independent out-of-sample evaluation, calibration and audit before replacing the Overview prototype.

## UX and performance

Overview shows a concise OfficialVN30 status. Missing membership says exactly that and keeps the FPT/HPG/VHM prototype label; it does not claim insufficient whole-market turnover data. The readiness payload contains no constituent list in an unavailable state. Page navigation makes one local API request and triggers neither provider requests nor polling.

## Acceptance

Before a forecast/UI switch: authorized source evidence, immutable snapshot ingestion, membership/hash verification, 30-member/95% EOD and history gates, shadow issuance/evaluation and an independent out-of-sample report. A build, fixture or readiness response is not evidence of market accuracy.
