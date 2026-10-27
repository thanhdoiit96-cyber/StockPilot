# OfficialVN30 forecast universe — selected contract

## Decision

### Internal preview implementation decision — 2026-10-27

The user requests the actual OfficialVN30 research path, not a relabelled three-symbol preview. Add a separate development-only database-backed read endpoint and make Overview call only that endpoint. No fallback to FPT/HPG/VHM or turnover ranking. Read sealed, effective membership and at most 60 distinct EOD dates per member (including duplicate rows for conflict checks), with VND/share, unadjusted, positive closes, source hashes, exact latest completed session and at least 29/30 valid member histories. Verify canonical membership/source hashes. Missing membership/history/basis returns an explicit unavailable reason and aggregate coverage, never probabilities. Do not disclose constituents in the response.

Use the existing uncalibrated softmax prototype only as a separately versioned internal research computation; mark `research_only=true`, `synthetic=false`, `live=false`, `publication_permitted=false`, `market_accuracy_verified=false`. This does not claim shadow issuance/evaluation is complete. GET must not persist forecasts or mix old three-symbol outcomes into its cohort. Disable legacy cohort display on this Overview path. Preserve the separate legacy endpoints for explicit developer probes, but no caller in Overview may silently use them. One bounded membership read plus one bounded stored-price read, zero provider calls, no new polling/cache. Tests must cover missing/corrupt/expired membership, duplicate conflicts, stale data, 28/30 versus 29/30 coverage, permissions and no legacy UI fallback.

`OfficialVN30` is the selected fixed research basket: official point-in-time membership, not daily turnover ranking. Overview now uses the dedicated internal preview and never falls back to FPT/HPG/VHM. Legacy three-symbol endpoints remain developer probes only. Independent validation remains required before a verified signal or public release.

This choice prioritizes a stable, explainable universe and avoids ranking the incomplete current EOD market. The alternative `Liquid30` implementation is retained only as deferred research; it no longer drives the Overview UI or forecast roadmap.

## Product and data boundary

The intended user needs a breadth scope they can audit: membership source, effective dates, member count and EOD completeness. `OfficialVN30` stays research/shadow-only. It is not a security-selection list, return forecast, trading instruction or verified performance claim.

Membership must come from a source the deployment is authorized to retain and use. The selected product policy is `internal_research_only`: no public distribution, commercial use, constituent publication or OfficialVN30 forecast release. This label reduces product scope; it does not itself grant source rights. No constituent list is hard-coded or scraped.

An administrator may now seal a manually reviewed 30-symbol manifest through the admin-only `POST /api/stocks/vn30-membership-snapshots` endpoint. It accepts only an HTTPS `hsx.vn` source URL, hashes the canonical source/membership and never fetches arbitrary remote content. If no written evidence is yet available, the explicit `owner-attested-internal-research-pending` reference is stored as `rights_verification=owner_attested_pending`; it remains non-public/non-commercial and must be superseded by a new immutable snapshot once verification is supplied.

## Implemented storage and readiness boundary

Migrations `045`/`046` create immutable snapshot/constituent records and lock their allowed `usage_scope` to `internal_research_only`. A usable row must have:

- `index_code=VN30`, `status=sealed`, effective-from/to dates, source identifier/URL, publication time and source hash;
- exactly 30 unique symbols, the declared member count of 30 and a membership SHA-256;
- separately retained constituent rows linked to that immutable snapshot.
- a non-placeholder `rights_evidence_ref`; a user-attested pending reference is visibly marked pending, while an absent/invalid reference yields `membership_rights_unverified`.

`GET /api/stocks/vn30-readiness` is database-only and never calls a provider. With no sealed snapshot it returns `unavailable: membership_snapshot_unavailable`; without recorded rights evidence it returns `membership_rights_unverified`. With valid membership it checks the latest stored VNStock daily session and requires at least 29/30 (95%) members with a positive close. It can only return `ready_for_shadow`, marked `internal_research_only` and `publication_permitted=false`; it never returns constituents, issues probabilities, selects a replacement list or enables calibration.

The EOD session must fall inside the snapshot's effective date range. Historical membership therefore cannot become a current basket merely because it has 30 symbols.

## Required next flow

### Shadow issuance foundation — decision 2026-10-27

Implement the owner-local issuance step first, not automatic scoring or a public signal. Reuse the existing immutable `forecast_snapshots` ledger (migration 037 already prevents UPDATE/DELETE) with a new payload version, `synthetic=false`, `research_only=true`, and `live=false`; existing synthetic/live cohort queries exclude this combination. A new table would duplicate an existing ledger without adding isolation value. No schema change is needed; no legacy generation-key function is reused.

Freeze the exact eligible member histories, source hashes, availability timestamps, membership ID/hash, probabilities, model version and horizon. Identity includes contract/provider/model/membership/horizon/as-of; input revision under an existing identity is a conflict, not another opportunity to choose probabilities. A repeatable-read input read and a serialized append transaction protect consistency and retries. Payload hashes are integrity checks, not source authentication.

Prospective issuance is allowed only for the latest completed session and before 09:00 Vietnam time on the next configured trading day (weekends plus existing holiday configuration). All used EOD rows must have been fetched after their session cutoff and fetched/created/updated no later than the captured issuance time; membership must already be ingested. No backdated issuance and no switch to a later target to evade the deadline. Missing calendar/holiday coverage remains an operational limitation; an exchange-certified calendar is required before accuracy claims.

The CLI defaults to dry-run, requires development + `FORECAST_OFFICIAL_SHADOW=true` plus `--write` for insertion, and never calls a provider. UI GET remains read-only, returns no private constituents, and adds no requests. Budget: existing bounded membership/price read, at most 6000 input rows, one indexed identity lookup and one insert, with a 1 MiB payload cap; no polling or cache. Acceptance covers time boundaries, evidence availability, identity conflicts, disabled writes, idempotency and legacy isolation.

Outcome collection/scoring is deliberately deferred: raw unadjusted closes must not be interpreted as total returns across corporate actions. The stored outcome policy is `pending_corporate_action_and_calendar_contract`; this milestone neither produces accuracy scores nor retrains the fixed-weight prototype. Next: specify verified action coverage and calendar, then freeze outcomes without changing origin membership or shifting missing target sessions.

1. Complete written rights verification and retention policy; owner-attested internal scope is already recorded.
2. Reviewed immutable manifest ingestion is implemented. Review and seal subsequent source changes without editing old snapshots; automated source refresh is not implemented.
3. The internal preview's 60-session history/basis/provenance gate is implemented. Complete missing member data and preserve those checks for shadow issuance.
4. Seal a shadow forecast with its membership/input hashes; attach outcomes after 1/5 distinct provider sessions.
5. Require independent out-of-sample evaluation, calibration and audit before any verified forecast release. The read-only internal preview is not that release.

## UX and performance

### Outcome evidence inspection — decision 2026-10-27

Repository review found no exchange-certified session ledger or whole-universe corporate-action completeness evidence. Portfolio-entered events and company news are not substitutes for a complete action feed; an empty result cannot attest that no action occurred. Therefore add read-only outcome evidence inspection before outcome writes/scoring. This implements useful missing-session diagnosis without inventing an adjustment factor or treating configuration as verified evidence.

For each frozen OfficialVN30 snapshot, derive the exact 1/5 planned sessions using its frozen calendar, require the same origin members on every planned date, and refuse duplicate price conflicts, wrong basis/provenance or evidence fetched before close/after inspection. Never advance the target because a member/date is missing. Even complete prices remain `pending_evidence_review`, scoring disabled, until an independently reviewed action/calendar contract exists. No probabilities, returns or accuracy metrics are produced by inspection.

Owner CLI only, no new UI states or API calls: inspect at most 10 latest snapshots, one bounded date/symbol price query per snapshot, 601-row cap (600 usable, excess fails closed), no provider requests or writes. Output contains IDs/dates/counts, not constituents. The immutable origin evidence remains unchanged. Acceptance: missing intermediate date cannot shift target; fresh/conflicting/basis checks; corrupted/legacy snapshots rejected; empty ledger explicit. Actual outcome persistence and automatic calibration remain deferred.

Overview shows a persistent internal-research/no-public-or-commercial-release label. Missing membership, invalid hashes, stale data or insufficient history produce an explicit unavailable reason; there is no legacy or synthetic fallback. One request per mount/horizon/retry, no provider calls or polling. The old cohort and synthetic timeline are deliberately absent from this panel. Detailed limitations use keyboard-accessible disclosure; membership counts and session remain visible on mobile.

## Acceptance

Internal preview: reviewed source, immutable membership and canonical hashes, recorded research scope, 29/30 aligned 60-session histories through the latest completed Vietnam session, valid VND/share basis/provenance, no fallback or constituent disclosure. Shadow issuance/evaluation and independent out-of-sample reporting remain separate pending milestones. A build or preview response is not evidence of accuracy.

### Source reviewed locally, 2026-10-27

The July 2026 HOSE membership PDF was downloaded and page 1 directly reviewed (30 members, excluding reserves). PDF SHA-256 is recorded in the immutable source identifier; `source_sha256` itself remains the canonical metadata hash, not the byte hash. Local source/manifest are ignored evidence, not public repository data. The effective date 2026-08-03 is corroborated by [SSIAM's July 16 ETF notice](https://www.ssi.com.vn/khach-hang-ca-nhan/ban-tin-etf) and [Vietcap's July 15 notice](https://trading.vietcap.com.vn/ai-news/post-detail/mch-tcx-vao-ro-vn30); the constituent PDF does not state it. Publication timestamp uses the end of the publication day conservatively, not a claimed exact release time. Membership has no guessed expiry; subsequent official replacements must be reviewed and sealed. This is a fixed reviewed research basket, not an automatically refreshed index subscription. Owner-attested rights remain pending.
